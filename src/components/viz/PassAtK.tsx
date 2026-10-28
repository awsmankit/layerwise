import { useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from './shared';

/** Chance that at least one of k independent trials succeeds. */
export const passAtK = (p: number, k: number) => 1 - (1 - p) ** k;
/** Chance that all k independent trials succeed. */
export const passHatK = (p: number, k: number) => p ** k;

const KMAX = 10;
const X0 = 56;
const X1 = 456;
const Y0 = 24; // top, 100%
const Y1 = 196; // bottom, 0%
const x = (k: number) => X0 + ((k - 1) / (KMAX - 1)) * (X1 - X0);
const y = (v: number) => Y1 - v * (Y1 - Y0);
const pct = (v: number) => `${v >= 0.9995 ? '100' : v < 0.0005 ? '0' : (v * 100).toFixed(v < 0.1 || v > 0.9 ? 1 : 0)}%`;

const line = (f: (k: number) => number) => Array.from({ length: KMAX }, (_, i) => `${i ? 'L' : 'M'} ${x(i + 1).toFixed(1)} ${y(f(i + 1)).toFixed(1)}`).join(' ');

/**
 * The same agent, scored two ways. pass@k asks whether at least one of k tries worked;
 * pass^k asks whether all k worked. With a fixed success rate per trial, the first climbs
 * towards 100% and the second falls towards 0%. The curves are computed from the sliders.
 */
export default function PassAtK() {
  const [rate, setRate] = useState(80);
  const [k, setK] = useState(3);
  const p = rate / 100;
  const a = passAtK(p, k);
  const b = passHatK(p, k);

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">pass@k and pass^k from one success rate</p>
        <div className="viz-controls">
          <label className="field">
            <span>
              Success rate per trial <b>{rate}%</b>
            </span>
            <input type="range" min={10} max={99} step={1} value={rate} onChange={(e) => setRate(+e.target.value)} />
          </label>
          <label className="field">
            <span>
              Trials, k <b>{k}</b>
            </span>
            <input type="range" min={1} max={KMAX} step={1} value={k} onChange={(e) => setK(+e.target.value)} />
          </label>
        </div>

        <svg viewBox="0 0 740 240" className="dx-svg" role="img" aria-label={`With a ${rate}% success rate per trial and ${k} trials, pass at k is ${pct(a)} and pass hat k is ${pct(b)}.`}>
          {[0, 0.5, 1].map((v) => (
            <g key={v}>
              <path d={`M ${X0} ${y(v)} H ${X1}`} className="dx-link" style={{ strokeDasharray: v === 0 ? 'none' : '2 4', strokeOpacity: 0.3 }} />
              <text x={X0 - 8} y={y(v) + 4} textAnchor="end" className="dx-small">{`${v * 100}%`}</text>
            </g>
          ))}
          {[1, 5, 10].map((t) => (
            <text key={t} x={x(t)} y={Y1 + 18} textAnchor="middle" className="dx-small">{t}</text>
          ))}
          <text x={(X0 + X1) / 2} y={Y1 + 34} textAnchor="middle" className="dx-small">trials, k</text>

          <motion.path d={line((t) => passAtK(p, t))} initial={false} animate={{ opacity: 1 }} className="dx-curve" style={{ stroke: 'var(--ok)', strokeWidth: 2 }} />
          <motion.path d={line((t) => passHatK(p, t))} initial={false} animate={{ opacity: 1 }} className="dx-curve" style={{ stroke: 'var(--warn)', strokeWidth: 2 }} />

          {/* the selected k */}
          <motion.line initial={false} animate={{ x1: x(k), x2: x(k) }} transition={{ duration: 0.25, ease: EASE }} y1={Y0} y2={Y1} className="dx-link" style={{ strokeDasharray: '3 4' }} />
          <motion.circle initial={false} animate={{ cx: x(k), cy: y(a) }} transition={{ duration: 0.25, ease: EASE }} r="5" style={{ fill: 'var(--ok)' }} />
          <motion.circle initial={false} animate={{ cx: x(k), cy: y(b) }} transition={{ duration: 0.25, ease: EASE }} r="5" style={{ fill: 'var(--warn)' }} />

          {/* readout */}
          <rect x="500" y="24" width="220" height="82" rx="10" className="dx-core" />
          <path d="M 514 46 H 538" style={{ stroke: 'var(--ok)', strokeWidth: 3 }} />
          <text x="546" y="50" className="dx-name" style={{ fontSize: 13 }}>pass@{k}</text>
          <text x="706" y="52" textAnchor="end" className="dx-word" style={{ fontSize: 22 }}>{pct(a)}</text>
          <text x="514" y="80" className="dx-small">at least one of {k} works</text>
          <text x="514" y="96" className="dx-small">1 − (1 − {p.toFixed(2)})^{k}</text>

          <rect x="500" y="118" width="220" height="82" rx="10" className="dx-core dx-hot" />
          <path d="M 514 140 H 538" style={{ stroke: 'var(--warn)', strokeWidth: 3 }} />
          <text x="546" y="144" className="dx-name" style={{ fontSize: 13 }}>pass^{k}</text>
          <text x="706" y="146" textAnchor="end" className="dx-word" style={{ fontSize: 22 }}>{pct(b)}</text>
          <text x="514" y="174" className="dx-small">all {k} work</text>
          <text x="514" y="190" className="dx-small">{p.toFixed(2)}^{k}</text>
        </svg>

        <p className="viz-cap">
          Assumes every trial succeeds with the same chance, independently of the others. Real tasks are not like that: some are always solved and some never, which is why you also read the results task by task. Use pass@k when one success is enough, pass^k when the agent must work every time.
        </p>
      </div>
    </Root>
  );
}
