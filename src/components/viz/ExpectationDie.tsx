import { useState } from 'react';
import { Root } from './shared';

/** Expected value: each outcome times its probability, added up. */
export const expectation = (xs: number[], ps: number[]) => xs.reduce((s, x, i) => s + x * ps[i], 0);

/** Variance: the average squared distance from the expected value. */
export const variance = (xs: number[], ps: number[]) => {
  const mu = expectation(xs, ps);
  return xs.reduce((s, x, i) => s + (x - mu) ** 2 * ps[i], 0);
};

const FACES = [1, 2, 3, 4, 5, 6];

/**
 * A six-sided die where you set the chance of a six. The other five faces share
 * the rest equally. Watch the expected value and the spread move together.
 */
export default function ExpectationDie() {
  const [p6, setP6] = useState(1 / 6);
  const rest = (1 - p6) / 5;
  const ps = FACES.map((f) => (f === 6 ? p6 : rest));
  const mu = expectation(FACES, ps);
  const v = variance(FACES, ps);
  const max = Math.max(...ps);

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">A die you can load</p>
        <div className="viz-controls">
          <label htmlFor="ed-p6">
            Chance of a six <b className="num">{Math.round(p6 * 100)}%</b>
          </label>
          <input id="ed-p6" type="range" min={0} max={0.6} step={0.01} value={p6} onChange={(e) => setP6(Number(e.target.value))} />
        </div>
        <svg viewBox="0 0 360 180" className="dx-svg" role="img" aria-label={`Bar chart of six faces. Expected value ${mu.toFixed(2)}, variance ${v.toFixed(2)}.`}>
          {FACES.map((f, i) => {
            const h = (ps[i] / max) * 130;
            const x = 20 + i * 56;
            return (
              <g key={f}>
                <rect x={x} y={150 - h} width={36} height={h} className="dx-curve" fill="none" />
                <text x={x + 18} y="170" textAnchor="middle" className="dx-small">{f}</text>
              </g>
            );
          })}
          <line x1={20 + (mu - 1) * 56 + 18} y1="10" x2={20 + (mu - 1) * 56 + 18} y2="150" className="dx-packet" strokeDasharray="4 4" />
        </svg>
        <p className="viz-cap" aria-live="polite">
          Expected value (the long-run average): <b className="num">{mu.toFixed(2)}</b>. Variance (spread): <b className="num">{v.toFixed(2)}</b>.
          {' '}A fair die gives 3.50 and 2.92.
        </p>
      </div>
    </Root>
  );
}
