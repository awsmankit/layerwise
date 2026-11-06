import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { MAX_STEPS, fmtDuration, fmtMoney, stepCost, stepsTaken, stopStep, totalCost, totalSeconds } from '../../lib/whatif/no-step-limit';

const RED = '#d6453d';
const GREEN = '#1f9d6b';
const CAPS = [1, 2, 5, 10, 20];
const MX = 8;
const MW = 324;
const LY = 280; // baseline of the per-step chart
const LH = 56;
const scaleMax = totalCost(MAX_STEPS);
const maxStep = stepCost(MAX_STEPS);
const sx = (k: number) => MX + (MW * (k - 1)) / (MAX_STEPS - 1);
const sy = (c: number) => LY - (LH * c) / maxStep;

/**
 * A loop that cannot finish: a tool keeps failing and the agent keeps retrying. A money meter climbs with every step
 * and each step costs more than the last. With a cap the loop stops at the last step that fits in the budget.
 */
export default function NoStepLimitWhatIf() {
  const [capped, setCapped] = useState(true);
  const [capIdx, setCapIdx] = useState(2);
  const [shown, setShown] = useState(MAX_STEPS);
  const [playing, setPlaying] = useState(false);
  const cap = CAPS[capIdx];
  const stop = stopStep(cap);
  const n = stepsTaken(shown, capped, cap);
  const stopped = capped && shown >= stop;
  const spent = totalCost(n);
  const secs = totalSeconds(n);

  useEffect(() => {
    if (!playing) return;
    if (shown >= MAX_STEPS) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setShown((v) => Math.min(MAX_STEPS, v + 4)), 40);
    return () => clearTimeout(t);
  }, [playing, shown]);

  const play = () => {
    setShown(0);
    setPlaying(true);
  };

  const area = useMemo(() => {
    const pts = [];
    for (let k = 1; k <= n; k++) pts.push(`${sx(k)},${sy(stepCost(k))}`);
    return n > 0 ? `${sx(1)},${LY} ${pts.join(' ')} ${sx(n)},${LY}` : '';
  }, [n]);
  const ghost = useMemo(() => {
    const pts = [];
    for (let k = 1; k <= MAX_STEPS; k += 2) pts.push(`${sx(k)},${sy(stepCost(k))}`);
    pts.push(`${sx(MAX_STEPS)},${sy(stepCost(MAX_STEPS))}`);
    return pts.join(' ');
  }, []);

  const over = spent > cap;
  const fillW = (MW * Math.min(spent, scaleMax)) / scaleMax;
  const capX = MX + (MW * cap) / scaleMax;
  const active = n % 3; // which node of the loop is lit

  const verdict = capped ? (
    stopped ? (
      <>
        The cap stopped the loop at step {stop}, after {fmtMoney(spent)} of the {fmtMoney(cap)} budget and {fmtDuration(secs)}. With no cap the same stuck loop would reach {fmtMoney(totalCost(MAX_STEPS))} by step {MAX_STEPS}.
      </>
    ) : (
      <>
        Step {n}: {fmtMoney(spent)} spent of the {fmtMoney(cap)} cap, {fmtDuration(secs)} so far. The loop will be stopped at step {stop}.
      </>
    )
  ) : n === 0 ? (
    <>Nothing has run yet. Press Play or move the slider: this loop can never finish, because its tool always fails.</>
  ) : (
    <>
      After {n} steps the loop has spent {fmtMoney(spent)} and run for {fmtDuration(secs)}, and it is still going. Each step costs more than the last (step {n}: {fmtMoney(stepCost(n))}) because the whole history is sent again.
      {over ? ` That is ${(spent / cap).toFixed(1)} times the ${fmtMoney(cap)} you might have budgeted.` : ''}
    </>
  );

  return (
    <WhatIfFrame
      title="A loop that can never finish"
      withLabel="With a budget cap"
      withoutLabel="No cap"
      on={capped}
      onChange={setCapped}
      verdict={verdict}
      controls={
        <>
          <label className="field">
            <span>
              Steps run so far <b>{shown}</b> of {MAX_STEPS}
            </span>
            <input type="range" min={0} max={MAX_STEPS} value={shown} onChange={(e) => { setPlaying(false); setShown(+e.target.value); }} aria-label="Steps the loop has run" />
          </label>
          <label className="field">
            <span>
              Budget cap (example) <b>{fmtMoney(cap)}</b>
            </span>
            <input type="range" min={0} max={CAPS.length - 1} step={1} value={capIdx} onChange={(e) => setCapIdx(+e.target.value)} aria-label="Budget cap in dollars" />
          </label>
          <button type="button" className="btn quiet" onClick={play} style={{ minHeight: 44 }}>
            {playing ? 'Playing…' : 'Play it'}
          </button>
        </>
      }
    >
      <p className="wa-tag">Example prices and sizes: $3 per million input tokens, $15 per million output tokens, 2,000 token instructions, history grows 600 tokens per step. Not any real price list.</p>
      <svg
        viewBox="0 0 340 308"
        className="dx-svg wi-svg wa-svg"
        role="img"
        aria-label={`A stuck agent loop at step ${n}: ${fmtMoney(spent)} spent so far${capped ? `, with a cap of ${fmtMoney(cap)}${stopped ? ' that has stopped it' : ''}` : ', with no cap'}.`}
      >
        <defs>
          <marker id="wa-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
        </defs>
        {/* the loop */}
        {[
          { x: 4, label: 'Model' },
          { x: 124, label: 'Tool call' },
          { x: 244, label: 'Tool fails' },
        ].map((b, i) => {
          const on = n > 0 && active === i;
          return (
            <g key={b.label}>
              <rect x={b.x} y={8} width={92} height={40} rx={10} fill={on ? (i === 2 ? 'rgba(214,69,61,0.22)' : 'rgba(127,127,127,0.18)') : 'var(--surface)'} stroke={i === 2 ? RED : 'currentColor'} strokeWidth={on ? 2.6 : 1.6} />
              <text x={b.x + 46} y={33} textAnchor="middle" className="wa-tb">{b.label}</text>
            </g>
          );
        })}
        <line x1={96} y1={28} x2={122} y2={28} stroke="currentColor" strokeWidth={2} markerEnd="url(#wa-arrow)" />
        <line x1={216} y1={28} x2={242} y2={28} stroke="currentColor" strokeWidth={2} markerEnd="url(#wa-arrow)" />
        <path d="M 290 48 L 290 74 L 50 74 L 50 50" fill="none" stroke={RED} strokeWidth={2} strokeDasharray="6 4" markerEnd="url(#wa-arrow)" style={{ color: RED }} />
        <text x={170} y={68} textAnchor="middle" className="wa-t" fill={RED}>try again, again, again</text>
        <text x={170} y={96} textAnchor="middle" className="wa-tb">Step {n}</text>
        {/* money meter */}
        <text x={MX} y={124} className="wa-tb">Money spent</text>
        <text x={MX + MW} y={124} textAnchor="end" className="wa-tb" fill={over ? RED : undefined}>
          {fmtMoney(spent)}
        </text>
        <rect x={MX} y={132} width={MW} height={26} rx={8} fill="none" stroke="currentColor" strokeWidth={1.6} />
        <motion.rect x={MX} y={134} height={22} rx={6} fill={over ? RED : GREEN} initial={false} animate={{ width: Math.max(0, fillW - 0) }} transition={{ duration: 0.3, ease: EASE }} />
        <line x1={capX} x2={capX} y1={128} y2={166} stroke="var(--ink)" strokeWidth={2.4} />
        <text x={Math.min(Math.max(capX, 66), 274)} y={182} textAnchor="middle" className="wa-tb">
          {capped ? 'cap' : 'example cap'} {fmtMoney(cap)}
        </text>
        {stopped && (
          <text x={MX + MW} y={152} textAnchor="end" className="wa-tb" fill="#fff" style={{ display: fillW > 150 ? undefined : 'none' }}>
            STOPPED ✓
          </text>
        )}
        {/* cost per step */}
        <text x={MX} y={208} className="wa-tb">Cost of each step</text>
        <text x={MX + MW} y={208} textAnchor="end" className="wa-t2">grows every step</text>
        <polyline points={ghost} fill="none" stroke="var(--ink-2)" strokeWidth={1.2} strokeDasharray="3 3" opacity={0.7} />
        {area && <polygon points={area} fill={over ? RED : GREEN} fillOpacity={0.55} stroke={over ? RED : GREEN} strokeWidth={1.5} />}
        <line x1={MX} x2={MX + MW} y1={LY} y2={LY} stroke="var(--line)" strokeWidth={1} />
        {capped && stop < MAX_STEPS && (
          <g>
            <line x1={sx(stop)} x2={sx(stop)} y1={222} y2={LY} stroke="var(--ink)" strokeWidth={2} strokeDasharray="4 3" />
            <text x={sx(stop)} y={236} textAnchor={sx(stop) > 130 ? 'end' : 'start'} dx={sx(stop) > 130 ? -5 : 5} className="wa-tb">stops at step {stop}</text>
          </g>
        )}
        <text x={MX} y={LY + 18} className="wa-t2">step 1: {fmtMoney(stepCost(1))}</text>
        <text x={MX + MW} y={LY + 18} textAnchor="end" className="wa-t2">step {MAX_STEPS}: {fmtMoney(stepCost(MAX_STEPS))}</text>
      </svg>
      <p className="wa-note">
        Time so far: <b>{fmtDuration(secs)}</b> (example: 3 s per step plus reading time). A step limit works the same way: it stops the loop after a fixed number of steps, whatever it costs.
      </p>
    </WhatIfFrame>
  );
}

