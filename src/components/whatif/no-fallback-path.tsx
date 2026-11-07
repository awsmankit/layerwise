import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { DEFAULT_BUDGET_MS, DEFAULT_THRESHOLD, EVENT_COUNT, events, run, type Outcome } from '../../lib/whatif/no-fallback-path';

const W = 340;
const COLS = 10;
const STEP = (W - 4) / COLS;
const TILE = 28;
const TOP = 26;
const ROWSTEP = 32;
const BAR_Y = 204;
const GREEN = '#1f9d6b';
const RED = '#d6453d';
const AMBER = '#e0a21e';

const q = (v: number) => Math.round(v * 10) / 10;

const NAME: Record<Outcome, string> = { right: 'right action', wrong: 'wrong action', silence: 'silence', ask: 'asked to repeat' };

function Glyph({ outcome, x, y }: { outcome: Outcome; x: number; y: number }) {
  const c = TILE / 2;
  if (outcome === 'right')
    return (
      <g>
        <rect x={x} y={y} width={TILE} height={TILE} rx={7} fill={GREEN} />
        <path d={`M${x + c - 7} ${y + c} L${x + c - 2} ${y + c + 5} L${x + c + 7} ${y + c - 5}`} fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
  if (outcome === 'wrong')
    return (
      <g>
        <rect x={x} y={y} width={TILE} height={TILE} rx={7} fill={RED} />
        <path d={`M${x + c - 5} ${y + c - 5} L${x + c + 5} ${y + c + 5} M${x + c + 5} ${y + c - 5} L${x + c - 5} ${y + c + 5}`} stroke="#fff" strokeWidth={3} strokeLinecap="round" />
      </g>
    );
  if (outcome === 'ask')
    return (
      <g>
        <rect x={x} y={y} width={TILE} height={TILE} rx={7} fill={AMBER} />
        <text x={x + c} y={y + c + 6} textAnchor="middle" fontSize={17} fontWeight={800} fill="#3b2a00">?</text>
      </g>
    );
  return (
    <g>
      <rect x={x + 1} y={y + 1} width={TILE - 2} height={TILE - 2} rx={7} fill="none" stroke={RED} strokeWidth={2} strokeDasharray="4 3" />
      <path d={`M${x + c - 6} ${y + c} L${x + c + 6} ${y + c}`} stroke={RED} strokeWidth={3} strokeLinecap="round" />
    </g>
  );
}

/**
 * A scripted run of 50 voice commands on a small device. Each tile is one command and what the user got.
 * The model can be too slow or too unsure; a tiny keyword rule is the fallback. Numbers come from a fixed, seeded script.
 */
export default function NoFallbackPathWhatIf() {
  const [fb, setFb] = useState(true);
  const [budget, setBudget] = useState(DEFAULT_BUDGET_MS);
  const [thr, setThr] = useState(Math.round(DEFAULT_THRESHOLD * 100));
  const [n, setN] = useState(EVENT_COUNT);
  const [playing, setPlaying] = useState(false);

  const all = useMemo(() => run(budget, thr / 100), [budget, thr]);
  const part = useMemo(() => run(budget, thr / 100, n), [budget, thr, n]);
  const list = events();
  const outcomes = fb ? all.withFallback : all.without;
  const t = fb ? part.tallyWith : part.tallyWithout;
  const o = fb ? part.tallyWithout : part.tallyWith;

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setN((v) => {
        if (v >= EVENT_COUNT) {
          setPlaying(false);
          return EVENT_COUNT;
        }
        return v + 1;
      });
    }, 90);
    return () => clearInterval(id);
  }, [playing]);

  const play = () => {
    setN(1);
    setPlaying(true);
  };

  const ev = list[n - 1];
  const cause = all.causes[n - 1];
  const out = outcomes[n - 1];
  const withoutOut = all.without[n - 1];
  const withOut = all.withFallback[n - 1];
  const causeText = cause === 'timeout' ? `too slow (${ev.latencyMs} ms, limit ${budget} ms)` : cause === 'low' ? `unsure (${Math.round(ev.confidence * 100)}%, bar ${thr}%)` : `in time (${ev.latencyMs} ms) and sure (${Math.round(ev.confidence * 100)}%)`;

  const segs: { k: Outcome; n: number }[] = (['right', 'ask', 'wrong', 'silence'] as Outcome[]).map((k) => ({ k, n: t[k] }));
  let acc = 0;
  const total = Math.max(1, n);

  const verdict = fb ? (
    <>
      With a simple rule as a fallback, {t.right} of {n} commands worked, {t.silence} were met with silence, {t.ask} got a polite "say that again" and {t.wrong} were wrong. Without it: {o.right} worked, {o.silence} silent, {o.wrong} wrong.
    </>
  ) : (
    <>
      With no fallback, only {t.right} of {n} commands worked: {t.silence} got silence (the model was too slow) and {t.wrong} did the wrong thing.
    </>
  );

  return (
    <WhatIfFrame
      title="50 voice commands, and what the user got (scripted example)"
      withLabel="With a rule-based fallback"
      withoutLabel="No fallback"
      on={fb}
      onChange={setFb}
      verdict={verdict}
      controls={
        <>
          <label className="field">
            <span>
              Time limit for the model <b>{budget} ms</b>
            </span>
            <input type="range" min={60} max={400} step={10} value={budget} onChange={(e) => setBudget(+e.target.value)} aria-label="How long the model may take before it counts as too slow, in milliseconds" />
          </label>
          {fb && (
            <label className="field">
              <span>
                Confidence needed <b>{thr}%</b>
              </span>
              <input type="range" min={30} max={95} step={5} value={thr} onChange={(e) => setThr(+e.target.value)} aria-label="How sure the model must be before its answer is used, in percent" />
            </label>
          )}
          <label className="field">
            <span>
              Commands so far <b>{n} of {EVENT_COUNT}</b>
            </span>
            <input type="range" min={1} max={EVENT_COUNT} value={n} onChange={(e) => { setPlaying(false); setN(+e.target.value); }} aria-label="How many of the 50 commands to show" />
          </label>
          <button type="button" className="btn quiet" onClick={play}>
            {playing ? 'Playing…' : 'Play the 50 commands'}
          </button>
        </>
      }
    >
      <svg
        viewBox={`0 0 ${W} 240`}
        className="dx-svg wi-svg we-svg"
        role="img"
        aria-label={`${n} voice commands ${fb ? 'with' : 'without'} a fallback: ${t.right} right, ${t.wrong} wrong, ${t.silence} silent, ${t.ask} asked to repeat.`}
      >
        <text x={0} y={14} className="we-t-b">One tile per command</text>
        <text x={W} y={14} textAnchor="end" className="we-t">{fb ? 'with fallback' : 'no fallback'}</text>
        {list.map((_, i) => {
          const x = q(2 + (i % COLS) * STEP + (STEP - TILE) / 2);
          const y = TOP + Math.floor(i / COLS) * ROWSTEP;
          if (i >= n)
            return <rect key={i} x={x} y={y} width={TILE} height={TILE} rx={7} fill="none" stroke="var(--line)" strokeWidth={1.5} />;
          const shown = outcomes[i];
          const rescued = fb && all.causes[i] !== 'ok';
          return (
            <motion.g
              key={`${fb}-${shown}-${i}`}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: EASE, delay: Math.min(0.4, i * 0.008) }}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            >
              <title>{`Command ${i + 1}: ${NAME[shown]}`}</title>
              <Glyph outcome={shown} x={x} y={y} />
              {rescued && <circle cx={x + TILE - 3} cy={y + TILE - 3} r={4.2} fill="var(--ink)" stroke="var(--surface)" strokeWidth={1.5} />}
              {i === n - 1 && <rect x={x - 3} y={y - 3} width={TILE + 6} height={TILE + 6} rx={9} fill="none" stroke="var(--ink)" strokeWidth={1.6} />}
            </motion.g>
          );
        })}

        <text x={0} y={BAR_Y - 8} className="we-t-b">What the {n} users got</text>
        {segs.map((s) => {
          const w = (s.n / total) * W;
          const x = q(acc);
          acc += w;
          if (s.n === 0) return null;
          const fill = s.k === 'right' ? GREEN : s.k === 'wrong' ? RED : s.k === 'ask' ? AMBER : 'none';
          return (
            <g key={s.k}>
              <motion.rect
                initial={false}
                animate={{ x, width: q(w) }}
                transition={{ duration: 0.4, ease: EASE }}
                y={BAR_Y}
                height={24}
                fill={fill}
                stroke={s.k === 'silence' ? RED : 'var(--surface)'}
                strokeWidth={s.k === 'silence' ? 2 : 1}
                strokeDasharray={s.k === 'silence' ? '4 3' : undefined}
              />
              {w > 22 && (
                <motion.text initial={false} animate={{ x: q(x + w / 2) }} transition={{ duration: 0.4, ease: EASE }} y={BAR_Y + 17} textAnchor="middle" fontSize={13} fontWeight={700} fill={s.k === 'silence' ? RED : s.k === 'ask' ? '#3b2a00' : '#fff'}>
                  {s.n}
                </motion.text>
              )}
            </g>
          );
        })}
      </svg>
      <ul className="we-legend">
        <li><span className="we-sw" style={{ background: GREEN }} /> right action ({t.right})</li>
        <li><span className="we-sw" style={{ background: RED }} /> wrong action ({t.wrong})</li>
        <li><span className="we-sw is-ring" style={{ color: RED, borderStyle: 'dashed' }} /> silence ({t.silence})</li>
        <li><span className="we-sw" style={{ background: AMBER }} /> asked to repeat ({t.ask})</li>
        {fb && <li><span className="we-sw is-round" style={{ background: 'var(--ink)' }} /> the fallback stepped in</li>}
      </ul>
      <p className="we-example" aria-live="polite">
        <b>Command {n}:</b> the user said "{ev.intent}". The model was {causeText}. Without a fallback: {NAME[withoutOut]}. With one: {NAME[withOut]}.
        {out === 'wrong' && cause === 'ok' && ' A confident mistake is not slow and not unsure, so a fallback does not catch it.'}
      </p>
      <p className="we-note">
        Scripted example: the model is slow on about 1 command in 6 and unsure on about 1 in 5. The fallback is a keyword rule that knows only "volume up", "volume down" and "pause", so for other commands it asks the user to repeat. That is a safe answer, not a wrong one. Raise the confidence bar to see the trade: fewer wrong actions, more repeats.
      </p>
    </WhatIfFrame>
  );
}
