import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { AREAS, CHECKS, RATES, ROUNDS, drift, lockInRound, realTop, simulate, truthShare } from '../../lib/whatif/feedback-loop';

const W = 340;
const L = 34;
const R = W - 36;
const T = 22;
const B = 206;
const COLORS = ['#3b7dd8', '#e0a21e', '#8a55d6'] as const;
const DASH = ['', '7 4', '2 4'] as const;
const q = (v: number) => Math.round(v * 10) / 10;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const xOf = (r: number) => q(L + (r / ROUNDS) * (R - L));
const yOf = (v: number) => q(B - v * (B - T));

/**
 * A TOY loop, not a model of any real system. Three areas with made-up true rates. Each round the model sends its checks
 * to the area where it has recorded the most, apart from a share spread evenly (independent sampling), and only records what it checks.
 */
export default function FeedbackLoopWhatIf() {
  const [explore, setExplore] = useState(50);
  const [round, setRound] = useState(ROUNDS);
  const [playing, setPlaying] = useState(false);

  const sim = useMemo(() => simulate(explore), [explore]);
  const truth = useMemo(() => truthShare(), []);
  const cur = sim[round];
  const last = sim[ROUNDS];
  const d = drift(cur.belief);
  const dEnd = drift(last.belief);
  const lock = lockInRound(sim, 0.9);
  const top = realTop();
  const believedTop = cur.belief.indexOf(Math.max(...cur.belief));
  const on = explore >= 30;

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setRound((r) => {
        if (r >= ROUNDS) {
          setPlaying(false);
          return ROUNDS;
        }
        return r + 1;
      });
    }, 130);
    return () => clearInterval(id);
  }, [playing]);

  const play = () => {
    setRound(0);
    setPlaying(true);
  };

  const lines = [0, 1, 2].map((i) =>
    sim
      .slice(0, round + 1)
      .map((s) => `${xOf(s.round)},${yOf(s.belief[i])}`)
      .join(' '),
  );

  const verdict = (
    <>
      {round === 0 ? 'Start: ' : `After ${round} round${round === 1 ? '' : 's'}: `}
      the model believes {AREAS[believedTop]} holds {pct(cur.belief[believedTop])} of all incidents; in this toy {AREAS[believedTop]} really holds {pct(truth[believedTop])}. Drift {d.toFixed(2)}
      {round === ROUNDS ? (believedTop === top ? ', and it picks the right top area.' : `, and it never finds that ${AREAS[top]} has the most.`) : '.'}
    </>
  );

  return (
    <WhatIfFrame
      title="Where it looks is where it learns (toy loop, made-up rates)"
      withLabel="Some independent checks"
      withoutLabel="Only where it found things"
      on={on}
      onChange={(v) => {
        setPlaying(false);
        setExplore(v ? 50 : 0);
      }}
      verdict={verdict}
      controls={
        <>
          <label className="field">
            <span>
              Independent sampling <b>{explore}%</b> of the checks
            </span>
            <input type="range" min={0} max={100} step={10} value={explore} onChange={(e) => { setPlaying(false); setExplore(+e.target.value); }} aria-label="Share of each round's checks that are spread evenly over the areas, in percent" />
          </label>
          <label className="field">
            <span>
              Round <b>{round}</b> of {ROUNDS}
            </span>
            <input type="range" min={0} max={ROUNDS} step={1} value={round} onChange={(e) => { setPlaying(false); setRound(+e.target.value); }} aria-label="Which round of the 30 to look at" />
          </label>
          <div className="wx-btns">
            <button type="button" className="btn quiet" onClick={play}>
              {playing ? 'Playing…' : 'Play 30 rounds'}
            </button>
          </div>
        </>
      }
    >
      <svg viewBox={`0 0 ${W} 252`} className="dx-svg wi-svg wx-svg" role="img" aria-label={`Line chart of what the model believes over ${ROUNDS} rounds. At round ${round}, it believes ${AREAS.map((a, i) => `${a} ${pct(cur.belief[i])}`).join(', ')}. Reality is ${AREAS.map((a, i) => `${a} ${pct(truth[i])}`).join(', ')}.`}>
        <text x={0} y={14} className="wx-t-b">What the model believes, by round</text>
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line x1={L} x2={R} y1={yOf(v)} y2={yOf(v)} className="wx-grid" />
            <text x={L - 4} y={q(yOf(v) + 4)} textAnchor="end" className="wx-t">{Math.round(v * 100)}%</text>
          </g>
        ))}
        {[0, 10, 20, 30].map((r) => (
          <text key={r} x={xOf(r)} y={B + 16} textAnchor="middle" className="wx-t">{r}</text>
        ))}
        <text x={R} y={B + 32} textAnchor="end" className="wx-t">round (30 in all)</text>
        {truth.map((t, i) => (
          <g key={i}>
            <line x1={L} x2={R} y1={yOf(t)} y2={yOf(t)} stroke={COLORS[i]} strokeWidth={1.2} strokeDasharray="1 5" strokeLinecap="round" />
            <circle cx={W - 10} cy={yOf(t)} r={8} fill="var(--surface)" stroke={COLORS[i]} strokeWidth={2} />
            <text x={W - 10} y={q(yOf(t) + 4)} textAnchor="middle" className="wx-t-b">{i + 1}</text>
          </g>
        ))}
        {lines.map((pts, i) => (
          <polyline key={i} points={pts} fill="none" stroke={COLORS[i]} strokeWidth={2.6} strokeDasharray={DASH[i]} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        <line x1={xOf(round)} x2={xOf(round)} y1={T} y2={B} stroke="var(--ink-2)" strokeWidth={1} opacity={0.5} />
        {[0, 1, 2].map((i) => (
          <motion.g key={i} initial={false} animate={{ y: yOf(cur.belief[i]) }} transition={{ duration: 0.25, ease: EASE }}>
            <circle cx={xOf(round)} cy={0} r={8} fill="var(--surface)" stroke={COLORS[i]} strokeWidth={2.4} />
            <text x={xOf(round)} y={4} textAnchor="middle" className="wx-t-b">{i + 1}</text>
          </motion.g>
        ))}
      </svg>
      <ul className="wx-key" aria-label="Key">
        <li>Solid line and circle: belief at this round</li>
        <li>Dotted line at the right: what is true in this toy</li>
      </ul>

      <div className="wx-bars is-loop">
        <h4>Round {round}: belief against reality</h4>
        {AREAS.map((a, i) => (
          <div className="wx-bar" key={a}>
            <span>
              <b style={{ color: COLORS[i] === '#e0a21e' ? 'var(--ink)' : COLORS[i] }}>{i + 1}</b> {a}
            </span>
            <div className="wx-track" aria-hidden="true">
              <motion.div className={`wx-fill${i === believedTop && believedTop !== top ? ' is-bad' : ''}`} initial={false} animate={{ width: `${cur.belief[i] * 100}%` }} transition={{ duration: 0.3, ease: EASE }} />
              <span className="wx-tick" style={{ left: `${truth[i] * 100}%` }} />
            </div>
            <b>
              {pct(cur.belief[i])}
              <small>real {pct(truth[i])}</small><small>{pct(cur.attention[i])} of checks</small>
            </b>
          </div>
        ))}
        <p className="wx-note" style={{ marginTop: '0.3rem' }}>Bar: what the model believes. Black tick: what is true in this toy. At round {ROUNDS} with {explore}% independent sampling the drift is {dEnd.toFixed(2)} (0 is perfect, 1 is as wrong as possible){lock !== null ? `, and one area holds 90% of its belief from round ${lock}` : ''}.</p>
      </div>
      <p className="wx-example">
        <b>Toy illustration, not a real system or real data:</b> three areas where each check finds something {Math.round(RATES[0] * 100)}%, {Math.round(RATES[1] * 100)}% and {Math.round(RATES[2] * 100)}% of the time, so {AREAS[top]} truly has the most. The model starts with a head start of 12 records for Area 1 against 10 and 10, spends {CHECKS} checks a round, and records only what it checks. Independent sampling spreads some checks evenly and does not depend on what it has found.
      </p>
    </WhatIfFrame>
  );
}
