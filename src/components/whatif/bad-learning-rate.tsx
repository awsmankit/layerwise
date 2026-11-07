import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import {
  A, B, BEST_LR, BUDGET, GOOD_LR, HIGH_LR, LOW_LR, LR_MAX, LR_MIN, LR_STEP, START, TOLERANCE,
  behaviour, descend, indexFromLr, lrFromIndex, stepsToTolerance, type Behaviour,
} from '../../lib/whatif/bad-learning-rate';

const r1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// contour plot geometry: x from -6 to 6, y from -3.5 to 3.5, 28 px per unit
const PX = 12;
const PY = 12;
const U = 28;
const CX = PX + 6 * U;
const CY = PY + 3.5 * U;
const sx = (x: number) => r1(CX + clamp(x, -9, 9) * U);
const sy = (y: number) => r1(CY - clamp(y, -6, 6) * U);

// loss chart geometry: log10 of loss from -3 to +4
const LX0 = 46;
const LX1 = 350;
const LY0 = 12;
const LY1 = 140;
const DEC = (LY1 - LY0) / 7;
const lx = (t: number) => r1(LX0 + (t / BUDGET) * (LX1 - LX0));
const ly = (l: number) => r1(LY1 - (clamp(Math.log10(Math.max(l, 1e-12)), -3, 4) + 3) * DEC);

const TONE: Record<Behaviour, string> = { crawls: 'wt-t-warn', smooth: 'wt-t-good', bouncing: 'wt-t-good', diverges: 'wt-t-bad' };
const COLOUR: Record<Behaviour, string> = { crawls: '#c28a00', smooth: '#1f9d6b', bouncing: '#1f9d6b', diverges: '#d6453d' };
const LABEL: Record<Behaviour, string> = {
  crawls: 'too low: it crawls',
  smooth: 'just right: smooth and quick',
  bouncing: 'fast, but bounces across the valley',
  diverges: 'too high: it blows up',
};

function big(n: number): string {
  if (n >= 1e9) return 'more than a billion';
  if (n >= 100) return Math.round(n).toLocaleString('en-US');
  return n.toFixed(1);
}

const LEVELS = [0.5, 2, 5, 10, 20];

export default function BadLearningRate() {
  const [lr, setLr] = useState(HIGH_LR);
  const [replay, setReplay] = useState(0);
  const [anim, setAnim] = useState(false);

  const pts = useMemo(() => descend(lr, BUDGET), [lr]);
  const need = useMemo(() => stepsToTolerance(lr), [lr]);
  const state = behaviour(lr);
  const on = state === 'smooth' || state === 'bouncing';
  const last = pts[BUDGET];
  const colour = COLOUR[state];

  const set = (v: number) => {
    setAnim(true);
    setLr(v);
  };

  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x)} ${sy(p.y)}`).join(' ');
  const lossPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${lx(i)} ${ly(p.loss)}`).join(' ');
  const key = `${lr}-${replay}`;

  const verdict = (() => {
    const head = `Learning rate ${lr.toFixed(2)}: `;
    if (state === 'crawls') return `${head}too small. After ${BUDGET} steps the loss is still ${last.loss.toFixed(1)} (it started at ${pts[0].loss.toFixed(1)}); it needs ${need} steps to get below ${TOLERANCE}.`;
    if (state === 'smooth') return `${head}just right. The loss is below ${TOLERANCE} after ${need} steps, and every step goes the right way.`;
    if (state === 'bouncing') return `${head}fast, ${need} steps to get below ${TOLERANCE}, but the steep direction flips sign every step, so it zigzags across the valley.`;
    return `${head}too big. Every step overshoots further; after ${BUDGET} steps the loss is ${big(last.loss)}, up from ${pts[0].loss.toFixed(1)}. It never gets below ${TOLERANCE}.`;
  })();

  return (
    <WhatIfFrame
      title="Walking downhill with different step sizes"
      withLabel="Well-chosen rate"
      withoutLabel="Badly chosen rate"
      on={on}
      onChange={(v) => set(v ? GOOD_LR : on ? HIGH_LR : lr)}
      verdict={verdict}
      controls={
        <>
          <label className="field">
            <span>
              Learning rate (step size) <b>{lr.toFixed(2)}</b>
            </span>
            <input
              type="range"
              min={indexFromLr(LR_MIN)}
              max={indexFromLr(LR_MAX)}
              step={1}
              value={indexFromLr(lr)}
              onChange={(e) => set(lrFromIndex(+e.target.value))}
              aria-label="Learning rate, from 0.01 to 0.40"
            />
          </label>
          <div className="wt-btnrow">
            <button type="button" className="btn quiet" onClick={() => set(LOW_LR)}>
              Too low
            </button>
            <button type="button" className="btn quiet" onClick={() => set(GOOD_LR)}>
              Just right
            </button>
            <button type="button" className="btn quiet" onClick={() => set(HIGH_LR)}>
              Too high
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setAnim(true);
                setReplay((n) => n + 1);
              }}
            >
              Play it again
            </button>
          </div>
        </>
      }
    >
      <div className="wt-fig-wide">
        <svg viewBox="0 0 360 224" className="dx-svg wi-svg" role="img" aria-label={`A map of a stretched bowl-shaped loss surface with the path of gradient descent at learning rate ${lr.toFixed(2)}: ${LABEL[state]}.`}>
          <defs>
            <clipPath id="wt-lr-clip">
              <rect x={PX} y={PY} width={12 * U} height={7 * U} rx={6} />
            </clipPath>
          </defs>
          <rect x={PX} y={PY} width={12 * U} height={7 * U} rx={6} fill="var(--surface)" stroke="currentColor" strokeOpacity={0.3} />
          <g clipPath="url(#wt-lr-clip)">
            {LEVELS.map((c) => (
              <ellipse key={c} cx={CX} cy={CY} rx={r1(Math.sqrt((2 * c) / A) * U)} ry={r1(Math.sqrt((2 * c) / B) * U)} fill="none" stroke="currentColor" strokeOpacity={0.22} strokeWidth={1.2} />
            ))}
            <motion.path
              key={'p' + key}
              d={path}
              fill="none"
              stroke={colour}
              strokeWidth={2}
              strokeLinejoin="round"
              initial={anim ? { pathLength: 0 } : false}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, ease: EASE }}
            />
            {pts.map((p, i) => (
              <motion.circle
                key={i + '-' + key}
                cx={sx(p.x)}
                cy={sy(p.y)}
                r={i === 0 ? 4.5 : 2.2}
                fill={i === 0 ? 'var(--ink)' : colour}
                initial={anim ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={{ delay: (i / BUDGET) * 0.8, duration: 0.15 }}
              />
            ))}
          </g>
          <circle cx={CX} cy={CY} r={5} fill="none" stroke="#1f9d6b" strokeWidth={2.5} />
          <path d={`M${CX - 3.5} ${CY - 3.5} L${CX + 3.5} ${CY + 3.5} M${CX + 3.5} ${CY - 3.5} L${CX - 3.5} ${CY + 3.5}`} stroke="#1f9d6b" strokeWidth={1.5} />
          <text x={sx(START[0]) + 8} y={sy(START[1]) - 6} style={{ fill: 'var(--ink)', fontSize: 12, fontWeight: 700 }}>
            start
          </text>
          <text x={CX + 9} y={CY + 18} className="wt-t-good" style={{ fontSize: 12, fontWeight: 700 }}>
            lowest loss
          </text>
          <text x={PX + 6} y={PY + 17} className={TONE[state]} style={{ fontSize: 13, fontWeight: 700 }}>
            {LABEL[state]}
          </text>
        </svg>
      </div>
      <div className="wt-fig-wide">
        <svg viewBox="0 0 360 176" className="dx-svg wi-svg" role="img" aria-label={`Loss after each step on a ten-fold scale. ${state === 'diverges' ? 'It rises.' : state === 'crawls' ? 'It falls slowly and stays far above the goal.' : 'It falls below the goal line.'}`}>
          {[4, 2, 0, -2].map((d) => (
            <g key={d}>
              <line x1={LX0} x2={LX1} y1={r1(LY1 - (d + 3) * DEC)} y2={r1(LY1 - (d + 3) * DEC)} stroke="currentColor" strokeOpacity={0.15} strokeDasharray="3 4" />
              <text x={LX0 - 5} y={r1(LY1 - (d + 3) * DEC + 4)} textAnchor="end" style={{ fill: 'var(--ink-2)', fontSize: 11 }}>
                {d === -2 ? '0.01' : (10 ** d).toLocaleString('en-US')}
              </text>
            </g>
          ))}
          <line x1={LX0} x2={LX1} y1={ly(TOLERANCE)} y2={ly(TOLERANCE)} stroke="#1f9d6b" strokeWidth={1.5} strokeDasharray="6 4" />
          <text x={LX1} y={r1(ly(TOLERANCE) - 5)} textAnchor="end" className="wt-t-good" style={{ fontSize: 12, fontWeight: 700 }}>
            goal {TOLERANCE}
          </text>
          <motion.path
            key={'l' + key}
            d={lossPath}
            fill="none"
            stroke={colour}
            strokeWidth={2.4}
            strokeLinejoin="round"
            initial={anim ? { pathLength: 0 } : false}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, ease: EASE }}
          />
          <text x={LX0} y={LY1 + 18} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            step 0
          </text>
          <text x={LX1} y={LY1 + 18} textAnchor="end" style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            step {BUDGET}
          </text>
          <text x={LX0 + (LX1 - LX0) / 2} y={LY1 + 18} textAnchor="middle" style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            loss, ten-fold scale
          </text>
          {need !== null && need <= BUDGET && (
            <g>
              <circle cx={lx(need)} cy={ly(TOLERANCE)} r={5} fill="#1f9d6b" />
              <text x={lx(need) + (need <= 16 ? 8 : -8)} y={r1(ly(TOLERANCE) + (need <= 16 ? -9 : 17))} textAnchor={need <= 16 ? 'start' : 'end'} style={{ fill: 'var(--ink)', fontSize: 12, fontWeight: 700 }}>
                reached at step {need}
              </text>
            </g>
          )}
        </svg>
      </div>
      <p className="wt-note">
        Rings join points of equal loss; dots are the first {BUDGET} steps. Numbers: loss = 0.5 x ({A} x x² + {B} x y²), a bowl {B} times steeper in y than in x. The gradient is ({A}x, {B}y), so each step multiplies x by (1 - {A} x rate) and y by (1 - {B} x rate). That converges only if the rate is below 2/{B} = {(2 / B).toFixed(3)}; the fastest rate is 2/({A}+{B}) = {BEST_LR.toFixed(3)} ({stepsToTolerance(BEST_LR)} steps, but it zigzags). Rates above 1/{B} = {(1 / B).toFixed(3)} make y flip sign each step. A toy bowl: real loss surfaces are not this tidy, but the same trade-off holds.
      </p>
    </WhatIfFrame>
  );
}
