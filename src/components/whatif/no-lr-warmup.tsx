import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import {
  BLOWN_UP, DEFAULT_RATE, DEFAULT_WARMUP, INIT, RATE_MAX, RATE_MIN, STEPS, TRAINED, WARM_MAX,
  indexFromRate, minTrainingWarmup, outcome, rateAt, rateFromIndex, sharpness, simulate, stableLimit, type Run,
} from '../../lib/whatif/no-lr-warmup';

const r1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// loss chart: log10 loss from -4 to 6
const X0 = 46;
const X1 = 350;
const LY0 = 14;
const LY1 = 150;
const DEC = (LY1 - LY0) / 10;
/** Only the first SHOWN steps are drawn: that is where everything happens. */
const SHOWN = 20;
const sx = (t: number) => r1(X0 + (t / SHOWN) * (X1 - X0));
const ly = (l: number) => r1(LY1 - (clamp(Math.log10(Math.max(l, 1e-12)), -4, 6) + 4) * DEC);

// rate chart
const RY0 = 12;
const RY1 = 112;
const RMAX = 0.7;
const ry = (v: number) => r1(RY1 - (clamp(v, 0, RMAX) / RMAX) * (RY1 - RY0));

function fmtLoss(l: number): string {
  if (l >= 1e6) return 'over a million';
  if (l >= 1000) return Math.round(l).toLocaleString('en-US');
  if (l >= 1) return l.toFixed(1);
  if (l >= 0.01) return l.toFixed(2);
  return l.toExponential(0).replace('e-', ' x 10^-');
}

const START_W: [number, number, number] = [INIT, INIT, INIT];
const START_SHARP = sharpness(START_W);
const START_LIMIT = stableLimit(START_W);
const END_SHARP = sharpness([1, 1, 1]);

export default function NoLrWarmup() {
  const [warmOn, setWarmOn] = useState(false);
  const [peak, setPeak] = useState(DEFAULT_RATE);
  const [warm, setWarm] = useState(DEFAULT_WARMUP);
  const [replay, setReplay] = useState(0);

  const noWarm = useMemo(() => simulate(peak, 0), [peak]);
  const withWarm = useMemo(() => simulate(peak, warm), [peak, warm]);
  const need = useMemo(() => minTrainingWarmup(peak), [peak]);
  const run: Run = warmOn ? withWarm : noWarm;
  const ghost: Run = warmOn ? noWarm : withWarm;
  const state = outcome(run);
  const good = state === 'trained';
  const colour = good ? '#1f9d6b' : state === 'stuck' ? '#c28a00' : '#d6453d';
  const key = `${warmOn}-${peak}-${warm}-${replay}`;

  const path = (r: Run) => r.loss.slice(0, SHOWN + 1).map((l, i) => `${i === 0 ? 'M' : 'L'}${sx(i)} ${ly(l)}`).join(' ');
  const last = Math.min(run.loss.length - 1, SHOWN);
  const sched = Array.from({ length: SHOWN + 1 }, (_, i) => rateAt(i, peak, warmOn ? warm : 0));
  const rateLine = sched.map((v, i) => `${i === 0 ? 'M' : 'L'}${sx(i)} ${ry(v)}`).join(' ');
  const limitLine = run.limit.slice(0, SHOWN + 1).map((v, i) => `${i === 0 ? 'M' : 'L'}${sx(i)} ${ry(v)}`).join(' ');
  const unstable = run.limit.slice(0, SHOWN + 1).map((lim, i) => (sched[i] > lim ? i : -1)).filter((i) => i >= 0);

  const head = warmOn && warm > 0 ? `Warmup over ${warm} steps up to ${peak.toFixed(2)}` : `Full rate ${peak.toFixed(2)} from step 1`;
  const verdict =
    state === 'blown-up'
      ? `${head}: the loss goes ${fmtLoss(run.loss[0])}${run.loss.length > 1 ? `, then ${fmtLoss(run.loss[1])}` : ''}, then past a million at step ${run.blownUpAt}. The weights have exploded and the run is lost.`
      : state === 'stuck'
        ? `${head}: no explosion, but a huge first step throws the weights past zero and the loss sits near ${run.finalLoss.toFixed(2)} after ${STEPS} steps. Training is stuck.`
        : `${head}: the loss falls from ${fmtLoss(run.loss[0])} to below ${TRAINED} at step ${run.trainedAt}.`;

  return (
    <WhatIfFrame
      title="A tiny three-layer network, same peak rate, with and without a ramp"
      withLabel="Warmup, then full rate"
      withoutLabel="Full rate from step 1"
      on={warmOn}
      onChange={(v) => {
        setWarmOn(v);
        setReplay((n) => n + 1);
      }}
      verdict={verdict}
      controls={
        <>
          <label className="field">
            <span>
              Peak learning rate <b>{peak.toFixed(2)}</b>
            </span>
            <input
              type="range"
              min={indexFromRate(RATE_MIN)}
              max={indexFromRate(RATE_MAX)}
              step={1}
              value={indexFromRate(peak)}
              onChange={(e) => {
                setPeak(rateFromIndex(+e.target.value));
                setReplay((n) => n + 1);
              }}
              aria-label="Peak learning rate, from 0.05 to 0.5"
            />
          </label>
          <label className="field">
            <span>
              Warmup length <b>{warm}</b> steps
            </span>
            <input
              type="range"
              min={0}
              max={WARM_MAX}
              step={1}
              value={warm}
              onChange={(e) => {
                setWarm(+e.target.value);
                setWarmOn(true);
                setReplay((n) => n + 1);
              }}
              aria-label={`Warmup length in steps, from 0 to ${WARM_MAX}`}
            />
          </label>
          <div className="wt-btnrow">
            <button type="button" className="btn" onClick={() => setReplay((n) => n + 1)}>
              Play it again
            </button>
          </div>
        </>
      }
    >
      <div className="wt-fig-wide">
        <svg viewBox="0 0 360 176" className="dx-svg wi-svg" role="img" aria-label={`Loss after each step on a ten-fold scale. ${state === 'blown-up' ? `It explodes at step ${run.blownUpAt}.` : state === 'stuck' ? 'It drops once and then flattens high.' : 'It falls steadily below the goal line.'}`}>
          {[-3, 0, 3, 6].map((d) => (
            <g key={d}>
              <line x1={X0} x2={X1} y1={r1(LY1 - (d + 4) * DEC)} y2={r1(LY1 - (d + 4) * DEC)} stroke="currentColor" strokeOpacity={0.15} strokeDasharray="3 4" />
              <text x={X0 - 5} y={r1(LY1 - (d + 4) * DEC + 4)} textAnchor="end" style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
                {d === 0 ? '1' : d === -3 ? '0.001' : d === 3 ? '1,000' : '1 million'}
              </text>
            </g>
          ))}
          <line x1={X0} x2={X1} y1={ly(TRAINED)} y2={ly(TRAINED)} stroke="#1f9d6b" strokeWidth={1.5} strokeDasharray="6 4" />
          <text x={X1} y={r1(ly(TRAINED) - 5)} textAnchor="end" className="wt-t-good" style={{ fontSize: 12, fontWeight: 700 }}>
            trained below {TRAINED}
          </text>
          <path d={path(ghost)} fill="none" stroke="currentColor" strokeOpacity={0.3} strokeWidth={1.8} strokeDasharray="5 4" />
          <motion.path key={'l' + key} d={path(run)} fill="none" stroke={colour} strokeWidth={2.6} strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, ease: EASE }} />
          {run.blownUpAt !== null && (
            <g>
              <line x1={sx(last)} y1={ly(run.loss[last])} x2={sx(run.blownUpAt)} y2={LY0} stroke={colour} strokeWidth={2.6} strokeDasharray="2 3" />
              <path d={`M${sx(run.blownUpAt) - 5} ${LY0 + 2} l10 10 m0 -10 l-10 10`} stroke={colour} strokeWidth={2.5} />
              <text x={sx(run.blownUpAt) + 10} y={LY0 + 14} className="wt-t-bad" style={{ fontSize: 12, fontWeight: 700 }}>
                blew up at step {run.blownUpAt}
              </text>
            </g>
          )}
          <text x={X0} y={LY1 + 18} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            step 0
          </text>
          <text x={(X0 + X1) / 2} y={LY1 + 18} textAnchor="middle" style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            loss, ten-fold scale
          </text>
          <text x={X1} y={LY1 + 18} textAnchor="end" style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            step {SHOWN}
          </text>
          <g>
            <line x1={X0 + 150} x2={X0 + 172} y1={LY0 + 34} y2={LY0 + 34} stroke={colour} strokeWidth={2.6} />
            <text x={X0 + 178} y={LY0 + 38} style={{ fill: 'var(--ink)', fontSize: 12 }}>
              {warmOn ? `warmup ${warm} steps` : 'full rate from step 1'}
            </text>
            <line x1={X0 + 150} x2={X0 + 172} y1={LY0 + 52} y2={LY0 + 52} stroke="currentColor" strokeOpacity={0.4} strokeWidth={1.8} strokeDasharray="5 4" />
            <text x={X0 + 178} y={LY0 + 56} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
              {warmOn ? 'full rate from step 1' : `warmup ${warm} steps`}
            </text>
          </g>
        </svg>
      </div>

      <div className="wt-fig-wide">
        <svg viewBox="0 0 360 166" className="dx-svg wi-svg" role="img" aria-label={`The learning rate used at each step, against the largest rate that is safe at the current weights. ${unstable.length > 0 ? `The rate is above the safe limit at ${unstable.length} steps.` : 'The rate stays at or under the safe limit apart from a first step that is very close to it.'}`}>
          {[0, 0.2, 0.4, 0.6].map((v) => (
            <g key={v}>
              <line x1={X0} x2={X1} y1={ry(v)} y2={ry(v)} stroke="currentColor" strokeOpacity={0.15} strokeDasharray="3 4" />
              <text x={X0 - 5} y={ry(v) + 4} textAnchor="end" style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
                {v}
              </text>
            </g>
          ))}
          {unstable.map((i) => (
            <rect key={i} x={r1(sx(i) - 3)} y={RY0} width={6} height={RY1 - RY0} fill="#d6453d" fillOpacity={0.14} />
          ))}
          <path d={limitLine} fill="none" stroke="var(--ink)" strokeWidth={1.8} strokeDasharray="5 3" />
          <motion.path key={'r' + key} d={rateLine} fill="none" stroke={colour} strokeWidth={2.6} strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, ease: EASE }} />
          <line x1={X0} x2={X1} y1={RY1} y2={RY1} stroke="currentColor" strokeOpacity={0.3} />
          <text x={X0} y={RY1 + 16} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            step 0
          </text>
          <text x={X1} y={RY1 + 16} textAnchor="end" style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            step {SHOWN}
          </text>
          <line x1={X0} x2={X0 + 22} y1={RY1 + 34} y2={RY1 + 34} stroke={colour} strokeWidth={2.6} />
          <text x={X0 + 28} y={RY1 + 38} style={{ fill: 'var(--ink)', fontSize: 12 }}>
            rate used
          </text>
          <line x1={X0 + 100} x2={X0 + 122} y1={RY1 + 34} y2={RY1 + 34} stroke="var(--ink)" strokeWidth={1.8} strokeDasharray="5 3" />
          <text x={X0 + 128} y={RY1 + 38} style={{ fill: 'var(--ink)', fontSize: 12 }}>
            largest safe rate ({START_LIMIT.toFixed(3)} at the start)
          </text>
        </svg>
      </div>

      <p className="wt-note">
        A toy: output = a x b x c with input 1 and target 1, three weights all starting at {INIT}, loss = half of (output - 1) squared, plain gradient descent. The start is very steep (sharpness {Math.round(START_SHARP)}, so the largest safe rate there is 2/{Math.round(START_SHARP)} = {START_LIMIT.toFixed(3)}) and much flatter near the answer (sharpness {Math.round(END_SHARP)}, safe up to 2/{Math.round(END_SHARP)} = {(2 / END_SHARP).toFixed(2)}). A rate that is fine later is far too big at the start. {need === null ? 'No warmup length up to ' + WARM_MAX + ' steps trains this peak rate.' : need === 0 ? 'At this peak rate no warmup is needed.'
        : `At this peak rate, warmups of ${need} steps or more train it; shorter ones blow up or get stuck.`} Loss above {BLOWN_UP.toLocaleString('en-US')} counts as blown up. Real transformers usually use Adam, where warmup also tames noisy early step sizes; this toy uses plain gradient descent.
      </p>
    </WhatIfFrame>
  );
}

