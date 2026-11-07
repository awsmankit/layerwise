import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { bestIndex, DEGREE, lambdaLabel, LAMBDAS, makeData, N_TEST, N_TRAIN, NOISE, predict, run, truth } from '../../lib/whatif/no-regularisation';

const r1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const num = (n: number) => (n >= 100 ? Math.round(n).toLocaleString('en-US') : n >= 10 ? n.toFixed(1) : n.toFixed(2));

// curve plot: x from -1 to 1, y from -2 to 2
const PX0 = 14;
const PX1 = 346;
const PY0 = 28;
const PY1 = 228;
const px = (x: number) => r1(PX0 + ((x + 1) / 2) * (PX1 - PX0));
const py = (y: number) => r1(PY1 - ((clamp(y, -2.4, 2.4) + 2) / 4) * (PY1 - PY0));

// weight bars: height is the number of digits, log10(1 + |w|), up to 3.3
const BX0 = 44;
const BX1 = 350;
const BY1 = 128;
const BH = 100; // pixels for 3.3 (about 2,000)
const bh = (w: number) => r1((Math.min(Math.log10(1 + Math.abs(w)), 3.3) / 3.3) * BH);

const data = makeData();
const BEST = bestIndex(data);
const CURVE_X = Array.from({ length: 61 }, (_, i) => -1 + (2 * i) / 60);
const TRUTH_PATH = CURVE_X.map((x, i) => `${i === 0 ? 'M' : 'L'}${px(x)} ${py(truth(x))}`).join(' ');

export default function NoRegularisation() {
  const [idx, setIdx] = useState(0);
  const lambda = LAMBDAS[idx];
  const res = useMemo(() => run(data, lambda), [lambda]);
  const baseline = useMemo(() => run(data, 0), []);
  const best = useMemo(() => run(data, LAMBDAS[BEST]), []);
  const on = idx > 0;

  const curve = CURVE_X.map((x, i) => `${i === 0 ? 'M' : 'L'}${px(x)} ${py(predict(res.w, x))}`).join(' ');
  const wild = res.testError > 2 * NOISE;
  const flat = idx >= LAMBDAS.length - 2;
  const colour = wild ? '#d6453d' : flat ? '#c28a00' : '#1f9d6b';

  const verdict = !on ? (
    <>
      Without it, the curve hits all {N_TRAIN} training points (error {res.trainError.toFixed(2)}) but wiggles wildly between them. On {N_TEST} unseen points the error is {num(res.testError)}, about {Math.round(res.testError / NOISE)} times the noise level of {NOISE}. The biggest weight is {num(res.maxWeight)}.
    </>
  ) : flat ? (
    <>
      Too much weight decay ({lambdaLabel(lambda)}): the curve is nearly flat and misses the real shape. Training error {res.trainError.toFixed(2)}, unseen error {res.testError.toFixed(2)}; the weights have almost vanished (biggest {res.maxWeight.toFixed(2)}).
    </>
  ) : (
    <>
      Weight decay {lambdaLabel(lambda)}: the curve is smoother. Training error goes up to {res.trainError.toFixed(2)}, but the error on unseen points falls from {num(baseline.testError)} to {num(res.testError)}, and the biggest weight from {num(baseline.maxWeight)} to {num(res.maxWeight)}.
    </>
  );

  return (
    <WhatIfFrame
      title={`A degree-${DEGREE} curve fitted to ${N_TRAIN} noisy points (toy data)`}
      withLabel="With weight decay"
      withoutLabel="Without it"
      on={on}
      onChange={(v) => setIdx(v ? BEST : 0)}
      verdict={verdict}
      controls={
        <label className="field">
          <span>
            Weight decay strength <b>{lambdaLabel(lambda)}</b>
          </span>
          <input type="range" min={0} max={LAMBDAS.length - 1} step={1} value={idx} onChange={(e) => setIdx(+e.target.value)} aria-label={`Weight decay strength, position ${idx} of ${LAMBDAS.length - 1}, currently ${lambdaLabel(lambda)}`} />
        </label>
      }
    >
      <div className="wt-fig-wide">
        <svg viewBox="0 0 360 244" className="dx-svg wi-svg" role="img" aria-label={`The fitted curve with weight decay ${lambdaLabel(lambda)}. Training error ${res.trainError.toFixed(2)}, unseen error ${res.testError.toFixed(2)}.`}>
          <defs>
            <clipPath id="wt-reg-clip">
              <rect x={PX0} y={PY0 - 4} width={PX1 - PX0} height={PY1 - PY0 + 8} />
            </clipPath>
          </defs>
          <rect x={PX0} y={PY0 - 4} width={PX1 - PX0} height={PY1 - PY0 + 8} rx={6} fill="var(--surface)" stroke="currentColor" strokeOpacity={0.3} />
          <line x1={PX0} x2={PX1} y1={py(0)} y2={py(0)} stroke="currentColor" strokeOpacity={0.15} />
          <g clipPath="url(#wt-reg-clip)">
            <path d={TRUTH_PATH} fill="none" stroke="currentColor" strokeOpacity={0.55} strokeWidth={1.6} strokeDasharray="5 4" />
            {data.test.map((p, i) => (
              <circle key={'t' + i} cx={px(p.x)} cy={py(p.y)} r={2.8} fill="none" stroke="currentColor" strokeOpacity={0.6} strokeWidth={1.2} />
            ))}
            <motion.path d={curve} initial={false} animate={{ d: curve, stroke: colour }} transition={{ duration: 0.6, ease: EASE }} fill="none" strokeWidth={2.8} strokeLinejoin="round" />
            {data.train.map((p, i) => (
              <circle key={'a' + i} cx={px(p.x)} cy={py(p.y)} r={4.6} fill="var(--ink)" stroke="var(--surface)" strokeWidth={1.5} />
            ))}
          </g>
          <text x={PX0 + 6} y={18} className={wild ? 'wt-t-bad' : flat ? 'wt-t-warn' : 'wt-t-good'} style={{ fontSize: 13, fontWeight: 700 }}>
            {!on ? 'wiggly: it fitted the noise' : flat ? 'too flat: it ignores the pattern' : 'smooth: it follows the pattern'}
          </text>
          <text x={PX0} y={PY1 + 16} style={{ fill: 'var(--ink-2)', fontSize: 11 }}>
            filled = {N_TRAIN} training points, hollow = {N_TEST} unseen, dashed = hidden truth
          </text>
        </svg>
      </div>
      <div className="wt-fig-wide">
        <svg viewBox="0 0 360 164" className="dx-svg wi-svg" role="img" aria-label={`Size of the ${DEGREE} weights, one bar each. Biggest weight ${num(res.maxWeight)}.`}>
          {[0, 1, 2, 3].map((d) => {
            const h = r1((Math.log10(1 + 10 ** d) / 3.3) * BH);
            return (
              <g key={d}>
                <line x1={BX0} x2={BX1} y1={BY1 - h} y2={BY1 - h} stroke="currentColor" strokeOpacity={0.15} strokeDasharray="3 4" />
                <text x={BX0 - 5} y={BY1 - h + 4} textAnchor="end" style={{ fill: 'var(--ink-2)', fontSize: 11 }}>
                  {(10 ** d).toLocaleString('en-US')}
                </text>
              </g>
            );
          })}
          {res.w.slice(1).map((w, i) => {
            const bw = (BX1 - BX0) / DEGREE;
            const h = bh(w);
            const big = Math.abs(w) > 10;
            return (
              <g key={i}>
                <motion.rect x={r1(BX0 + i * bw + 3)} width={r1(bw - 6)} rx={2} initial={false} animate={{ y: r1(BY1 - h), height: h }} transition={{ duration: 0.5, ease: EASE }} fill={big ? '#d6453d' : '#1f9d6b'} />
                <text x={r1(BX0 + i * bw + bw / 2)} y={BY1 + 14} textAnchor="middle" style={{ fill: 'var(--ink-2)', fontSize: 11 }}>
                  w{i + 1}
                </text>
              </g>
            );
          })}
          <text x={4} y={12} style={{ fill: 'var(--ink)', fontSize: 12, fontWeight: 700 }}>
            weight sizes, ten-fold scale (red = over 10)
          </text>
          <text x={BX0} y={BY1 + 30} style={{ fill: 'var(--ink-2)', fontSize: 11 }}>
            biggest weight: {num(res.maxWeight)}, all together: {num(res.norm)}
          </text>
        </svg>
      </div>
      <div className="wt-fig-wide">
        <svg viewBox="0 0 360 96" className="dx-svg wi-svg" role="img" aria-label={`Error on training points ${res.trainError.toFixed(2)}, error on unseen points ${res.testError.toFixed(2)}, noise level ${NOISE}.`}>
          {[
            { label: 'training points', v: res.trainError, y: 8, c: '#1f9d6b' },
            { label: 'unseen points', v: res.testError, y: 46, c: res.testError > 2 * NOISE ? '#d6453d' : '#1f9d6b' },
          ].map((b) => {
            const w = r1(clamp(b.v / 1.0, 0, 1) * 200);
            return (
              <g key={b.label}>
                <text x={4} y={b.y + 17} style={{ fill: 'var(--ink)', fontSize: 12 }}>
                  {b.label}
                </text>
                <motion.rect x={110} y={b.y} height={26} rx={3} initial={false} animate={{ width: Math.max(w, 2) }} transition={{ duration: 0.5, ease: EASE }} fill={b.c} />
                {b.v > 1 ? (
                  <text x={304} y={b.y + 18} textAnchor="end" style={{ fill: '#fff', fontSize: 12, fontWeight: 700 }}>
                    {num(b.v)}, off the scale
                  </text>
                ) : (
                  <text x={r1(110 + Math.max(w, 2) + 6)} y={b.y + 18} style={{ fill: 'var(--ink)', fontSize: 12, fontWeight: 700 }}>
                    {b.v.toFixed(2)}
                  </text>
                )}
              </g>
            );
          })}
          <line x1={r1(110 + NOISE * 200)} x2={r1(110 + NOISE * 200)} y1={2} y2={80} stroke="currentColor" strokeOpacity={0.6} strokeDasharray="4 3" />
          <text x={r1(110 + NOISE * 200)} y={93} textAnchor="middle" style={{ fill: 'var(--ink-2)', fontSize: 11 }}>
            noise level {NOISE}
          </text>
        </svg>
      </div>
      <p className="wt-note">
        Numbers: toy data, {N_TRAIN} training points around y = sin(pi x) with random noise of spread {NOISE}, fitted with a degree-{DEGREE} polynomial ({DEGREE + 1} weights, so with no penalty it can pass through every point). Weight decay adds lambda x (sum of squared weights) to the squared error; here that has an exact answer, so there is no training noise. Error is root-mean-square. Picking the strength with the lowest error on the unseen points, the best lambda here is {lambdaLabel(LAMBDAS[BEST])} (error {best.testError.toFixed(2)}). Real networks use the same penalty (or its cousin, weight decay in the optimiser), with the strength picked on a validation set.
      </p>
    </WhatIfFrame>
  );
}
