import { useState } from 'react';
import { Root } from './shared';

/** Log-likelihood of heads probability p after k heads in n flips. Guarded so 0 × log 0 counts as 0. */
export const logLik = (p: number, k: number, n: number) =>
  (k > 0 ? k * Math.log(p) : 0) + (n - k > 0 ? (n - k) * Math.log(1 - p) : 0);

/** The value of p that makes the observed flips most likely: the share of heads. */
export const mle = (k: number, n: number) => k / n;

const N = 10;
const W = 360;
const H = 180;
const px = (p: number) => 20 + p * (W - 40);

/**
 * You flip a coin ten times and see k heads. Each possible bias p gets a
 * likelihood: how probable these exact flips are if the coin has that bias. The
 * tallest point of the curve is the maximum likelihood estimate.
 */
export default function MleCoin() {
  const [k, setK] = useState(7);
  const best = mle(k, N);
  const peak = logLik(best, k, N);
  const curve = Array.from({ length: 101 }, (_, i) => {
    const p = i / 100;
    const rel = Math.exp(logLik(p, k, N) - peak);
    return `${i ? 'L' : 'M'} ${px(p).toFixed(1)} ${(H - 15 - rel * (H - 30)).toFixed(1)}`;
  }).join(' ');

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Which bias fits the flips best?</p>
        <div className="viz-controls">
          <label htmlFor="mle-k">
            Heads in {N} flips <b className="num">{k}</b>
          </label>
          <input id="mle-k" type="range" min={0} max={N} step={1} value={k} onChange={(e) => setK(Number(e.target.value))} />
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="dx-svg" role="img" aria-label={`Likelihood of heads probability, peaking at ${best.toFixed(2)} after ${k} heads in ${N} flips`}>
          <line x1={px(0)} y1={H - 15} x2={px(1)} y2={H - 15} className="dx-link" />
          <path d={curve} className="dx-curve" fill="none" />
          <line x1={px(best)} y1="10" x2={px(best)} y2={H - 15} className="dx-packet" strokeDasharray="4 4" />
          <text x={px(0)} y={H - 2} className="dx-small">0</text>
          <text x={px(1) - 6} y={H - 2} className="dx-small">1</text>
        </svg>
        <p className="viz-cap" aria-live="polite">
          {k} heads in {N} flips makes <b className="num">{best.toFixed(2)}</b> the most likely bias. The estimate is just the share of heads, and the curve gets sharper as you add more flips.
        </p>
      </div>
    </Root>
  );
}
