import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import {
  BLOWN_UP, CLIPS, DEFAULT_CLIP, EVERY, LONG, RATE, SHORT, STEPS, TRAINED, W0,
  clipFromIndex, firstJump, indexFromClip, outcome, simulate,
} from '../../lib/whatif/no-gradient-clipping';

const r1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const log = (v: number) => Math.round(Math.log10(Math.max(v, 1e-30)) * 1000) / 1000;

const X0 = 46;
const X1 = 352;
const SW = (X1 - X0) / STEPS;
const cx = (i: number) => r1(X0 + (i + 0.5) * SW);

// chart A: gradient size, log10 from -1 to 3
const AY0 = 14;
const AY1 = 118;
const ay = (v: number) => r1(AY1 - ((clamp(log(v), -1, 3) + 1) / 4) * (AY1 - AY0));
// chart B: loss on a long sequence, log10 from -6 to 12
const BY0 = 14;
const BY1 = 112;
const by = (v: number) => r1(BY1 - ((clamp(log(v), -6, 12) + 6) / 18) * (BY1 - BY0));
// chart C: the weight, from -3 to 3
const CY0 = 12;
const CY1 = 104;
const cy = (w: number) => r1(CY1 - ((clamp(w, -3, 3) + 3) / 6) * (CY1 - CY0));

const isLong = (i: number) => i % EVERY === EVERY - 1;

function fmt(n: number): string {
  if (!Number.isFinite(n)) return 'infinite';
  if (Math.abs(n) >= 1e6) return 'over a million';
  if (Math.abs(n) >= 100) return Math.round(n).toLocaleString('en-US');
  if (Math.abs(n) >= 10) return n.toFixed(0);
  return n.toFixed(1);
}

function Bands({ y0, y1 }: { y0: number; y1: number }) {
  return (
    <>
      {Array.from({ length: STEPS }, (_, i) => i)
        .filter(isLong)
        .map((i) => (
          <rect key={i} x={r1(X0 + i * SW)} y={y0} width={r1(SW)} height={y1 - y0} fill="currentColor" fillOpacity={0.09} />
        ))}
    </>
  );
}

export default function NoGradientClipping() {
  const [on, setOn] = useState(false);
  const [ci, setCi] = useState(indexFromClip(DEFAULT_CLIP));
  const [replay, setReplay] = useState(0);
  const clip = clipFromIndex(ci);

  const bare = useMemo(() => simulate(null), []);
  const clipped = useMemo(() => simulate(clip), [clip]);
  const run = on ? clipped : bare;
  const state = outcome(run);
  const colour = state === 'trained' ? '#1f9d6b' : state === 'stuck' ? '#c28a00' : '#d6453d';
  const key = `${on}-${clip}-${replay}`;

  const n = run.steps.length;
  const lossSeries = run.steps.map((s) => s.loss);
  if (Number.isFinite(run.endLoss)) lossSeries.push(run.endLoss);
  const wSeries = run.steps.map((s) => s.w);
  if (n > 0) wSeries.push(run.steps[n - 1].next);
  const lossPath = lossSeries.map((l, i) => `${i === 0 ? 'M' : 'L'}${cx(i)} ${by(l)}`).join(' ');
  const wPath = wSeries.map((w, i) => `${i === 0 ? 'M' : 'L'}${cx(i)} ${cy(w)}`).join(' ');
  const jump = firstJump(bare);
  const lastLossX = cx(lossSeries.length - 1);

  const verdict = (() => {
    if (!on) {
      if (state === 'blown-up' && jump) {
        const after = bare.steps[jump.step + 1];
        return `No clipping: at step ${jump.step + 1} one long sequence gives a gradient of ${jump.norm.toFixed(1)}, about ${Math.round(jump.norm / jump.typical)} times the usual ${jump.typical.toFixed(1)}. The weight jumps from ${jump.from.toFixed(2)} to ${jump.to.toFixed(2)}, past the cliff at 1. The next gradient is ${fmt(after.norm)}, the weight is thrown to ${after.next.toFixed(1)} and the loss is past a trillion after step ${bare.blownUpAt}.`;
      }
      return 'No clipping: this run happens to survive.';
    }
    const head = `Clipped at ${clip}: gradients bigger than ${clip} are cut down to ${clip} (${clipped.clippedCount} of ${STEPS} steps), so no step moves the weight by more than ${(RATE * clip).toFixed(3)}.`;
    if (state === 'trained') return `${head} The loss on long sequences falls below ${TRAINED} at step ${clipped.trainedAt}.`;
    if (state === 'blown-up') return `${head} But it still blows up after step ${clipped.blownUpAt}.`;
    if (clipped.biggestJump > 0.2) return `${head} A clip this loose still lets one big step through (${clipped.biggestJump.toFixed(2)}): the weight is thrown to ${clipped.endW.toFixed(2)}, where the gradient almost vanishes, and training is stuck at a loss of ${clipped.endLoss.toFixed(2)}.`;
    return `${head} This clip is so tight that the steps are tiny: after ${STEPS} steps the weight is only ${clipped.endW.toFixed(2)} and the loss is still ${clipped.endLoss.toFixed(2)}.`;
  })();

  return (
    <WhatIfFrame
      title="A tiny recurrent network and one gradient that is far too big"
      withLabel="Clip the gradient"
      withoutLabel="Let it through"
      on={on}
      onChange={(v) => {
        setOn(v);
        setReplay((x) => x + 1);
      }}
      verdict={verdict}
      controls={
        <>
          <label className="field">
            <span>
              Clip threshold <b>{clip}</b>
            </span>
            <input
              type="range"
              min={0}
              max={CLIPS.length - 1}
              step={1}
              value={ci}
              onChange={(e) => {
                setCi(+e.target.value);
                setOn(true);
                setReplay((x) => x + 1);
              }}
              aria-label={`Clip threshold, one of ${CLIPS.join(', ')}`}
            />
          </label>
          <div className="wt-btnrow">
            <button type="button" className="btn" onClick={() => setReplay((x) => x + 1)}>
              Play it again
            </button>
          </div>
        </>
      }
    >
      <div className="wt-fig-wide">
        <svg viewBox="0 0 360 160" className="dx-svg wi-svg" role="img" aria-label={`Size of the gradient at each of ${STEPS} steps on a ten-fold scale. ${on ? `Anything above ${clip} is cut to ${clip}.` : `One step reaches ${fmt(bare.maxNorm)}.`}`}>
          <Bands y0={AY0} y1={AY1} />
          {[0.1, 1, 10, 100].map((v) => (
            <g key={v}>
              <line x1={X0} x2={X1} y1={ay(v)} y2={ay(v)} stroke="currentColor" strokeOpacity={0.15} strokeDasharray="3 4" />
              <text x={X0 - 5} y={ay(v) + 4} textAnchor="end" style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
                {v}
              </text>
            </g>
          ))}
          {on &&
            bare.steps.map((s, i) => (
              <rect key={'g' + i} x={r1(cx(i) - SW / 2 + 0.6)} y={ay(s.norm)} width={r1(SW - 1.2)} height={r1(Math.max(1, AY1 - ay(s.norm)))} fill="none" stroke="#d6453d" strokeOpacity={0.7} strokeWidth={1.2} />
            ))}
          <motion.g key={'a' + key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, ease: EASE }}>
            {run.steps.map((s, i) => (
              <g key={i}>
                <rect x={r1(cx(i) - SW / 2 + 0.6)} y={ay(s.norm)} width={r1(SW - 1.2)} height={r1(Math.max(1, AY1 - ay(s.norm)))} fill={s.clipped ? 'none' : colour} stroke={colour} strokeWidth={s.clipped ? 1.2 : 0} strokeDasharray={s.clipped ? '2 2' : undefined} />
                {s.clipped && <rect x={r1(cx(i) - SW / 2 + 0.6)} y={ay(s.applied)} width={r1(SW - 1.2)} height={r1(Math.max(1, AY1 - ay(s.applied)))} fill={colour} />}
              </g>
            ))}
          </motion.g>
          {on && (
            <g>
              <line x1={X0} x2={X1} y1={ay(clip)} y2={ay(clip)} stroke="var(--ink)" strokeWidth={1.8} strokeDasharray="6 3" />
              <text x={X1} y={ay(clip) - 4} textAnchor="end" style={{ fill: 'var(--ink)', fontSize: 12, fontWeight: 700 }}>
                clip at {clip}
              </text>
            </g>
          )}
          <text x={X0} y={AY1 + 16} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            step 1
          </text>
          <text x={(X0 + X1) / 2} y={AY1 + 16} textAnchor="middle" style={{ fill: 'var(--ink)', fontSize: 12, fontWeight: 700 }}>
            gradient size, ten-fold scale
          </text>
          <text x={X1} y={AY1 + 16} textAnchor="end" style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            step {STEPS}
          </text>
          <text x={X0} y={AY1 + 34} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            Grey columns: long sequences ({LONG} steps). Others: {SHORT} steps.
          </text>
          {on && (
            <text x={X0} y={AY1 + 50} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
              Red outline: the run without clipping. Solid: this run.
            </text>
          )}
        </svg>
      </div>

      <div className="wt-fig-wide">
        <svg viewBox="0 0 360 150" className="dx-svg wi-svg" role="img" aria-label={`Loss on a long sequence after each step on a very wide ten-fold scale. ${state === 'blown-up' ? `It explodes and overflows after step ${run.blownUpAt}.` : state === 'trained' ? 'It falls below the goal line.' : 'It ends well above the goal line.'}`}>
          <Bands y0={BY0} y1={BY1} />
          {[-3, 0, 6, 12].map((d) => (
            <g key={d}>
              <line x1={X0} x2={X1} y1={by(10 ** d)} y2={by(10 ** d)} stroke="currentColor" strokeOpacity={0.15} strokeDasharray="3 4" />
              <text x={X0 - 5} y={by(10 ** d) + 4} textAnchor="end" style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
                {d === -3 ? '0.001' : d === 0 ? '1' : d === 6 ? '1 million' : '1 trillion'}
              </text>
            </g>
          ))}
          <line x1={X0} x2={X1} y1={by(TRAINED)} y2={by(TRAINED)} stroke="#1f9d6b" strokeWidth={1.5} strokeDasharray="6 4" />
          <motion.path key={'b' + key} d={lossPath} fill="none" stroke={colour} strokeWidth={2.6} strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, ease: EASE }} />
          {run.blownUpAt !== null && run.blownUpAt < STEPS && (
            <g>
              <line x1={lastLossX} y1={by(lossSeries[lossSeries.length - 1])} x2={cx(run.blownUpAt)} y2={BY0} stroke={colour} strokeWidth={2.6} strokeDasharray="2 3" />
              <path d={`M${cx(run.blownUpAt) - 5} ${BY0 + 2} l10 10 m0 -10 l-10 10`} stroke={colour} strokeWidth={2.5} />
              <text x={cx(run.blownUpAt) + 10} y={BY0 + 14} className="wt-t-bad" style={{ fontSize: 12, fontWeight: 700 }}>
                overflow after step {run.blownUpAt}
              </text>
            </g>
          )}
          <text x={X0} y={BY1 + 16} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            step 0
          </text>
          <text x={(X0 + X1) / 2} y={BY1 + 16} textAnchor="middle" style={{ fill: 'var(--ink)', fontSize: 12, fontWeight: 700 }}>
            loss on a long sequence
          </text>
          <text x={X1} y={BY1 + 16} textAnchor="end" style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            step {STEPS}
          </text>
        </svg>
      </div>

      <div className="wt-fig-wide">
        <svg viewBox="0 0 360 140" className="dx-svg wi-svg" role="img" aria-label={`The single weight w at each step. It starts at ${W0} and the cliff is at 1. ${state === 'blown-up' ? 'It jumps past 1 and is thrown far away.' : state === 'trained' ? 'It climbs smoothly to 1 and stays.' : 'It does not settle at 1.'}`}>
          <Bands y0={CY0} y1={CY1} />
          {[-2, 0, 2].map((v) => (
            <g key={v}>
              <line x1={X0} x2={X1} y1={cy(v)} y2={cy(v)} stroke="currentColor" strokeOpacity={0.15} strokeDasharray="3 4" />
              <text x={X0 - 5} y={cy(v) + 4} textAnchor="end" style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
                {v}
              </text>
            </g>
          ))}
          <line x1={X0} x2={X1} y1={cy(1)} y2={cy(1)} stroke="#1f9d6b" strokeWidth={1.5} strokeDasharray="6 4" />
          <text x={X1} y={cy(1) - 5} textAnchor="end" className="wt-t-good" style={{ fontSize: 12, fontWeight: 700 }}>
            w = 1: the answer, and the cliff edge
          </text>
          <motion.path key={'c' + key} d={wPath} fill="none" stroke={colour} strokeWidth={2.6} strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, ease: EASE }} />
          {wSeries.map((w, i) => (
            <circle key={i} cx={cx(i)} cy={cy(w)} r={2.3} fill={colour} />
          ))}
          <text x={X0} y={CY1 + 16} style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            step 0
          </text>
          <text x={(X0 + X1) / 2} y={CY1 + 16} textAnchor="middle" style={{ fill: 'var(--ink)', fontSize: 12, fontWeight: 700 }}>
            the weight w
          </text>
          <text x={X1} y={CY1 + 16} textAnchor="end" style={{ fill: 'var(--ink-2)', fontSize: 12 }}>
            step {STEPS}
          </text>
        </svg>
      </div>

      <p className="wt-note">
        A toy: a recurrent network with one weight w that carries a memory forward, so a sequence of T steps gives output w^(T-1) and is trained to give back 1. Its gradient is (w^(T-1) - 1) x (T-1) x w^(T-2): tiny while w is below 1 and huge just above it, and the longer the sequence the steeper the cliff. Every {EVERY}th batch is a long sequence ({LONG} steps), the rest have {SHORT}. Plain gradient descent at rate {RATE}, starting at w = {W0}. Clipping by norm replaces a gradient g by g x clip / |g| when |g| is above the clip. Loss above {BLOWN_UP.toExponential(0).replace('e+', ' x 10^')} counts as overflow. A real network has millions of weights and clips the norm of all its gradients together, but the idea is the same.
      </p>
    </WhatIfFrame>
  );
}
