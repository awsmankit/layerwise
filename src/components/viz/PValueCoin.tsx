import { useState } from 'react';
import { Root } from './shared';

const N = 20;

/** Binomial probability for n = 20 tries at chance p. */
const pmf = (k: number, p: number) => {
  let c = 1;
  for (let i = 1; i <= k; i++) c = (c * (N - k + i)) / i;
  return c * p ** k * (1 - p) ** (N - k);
};

/**
 * Exact two-sided p-value for a fair coin (chance 0.5): add up the probability
 * of every count at least as surprising as the one observed.
 */
export const twoSidedP = (k: number, p = 0.5) => {
  const observed = pmf(k, p);
  let total = 0;
  for (let j = 0; j <= N; j++) if (pmf(j, p) <= observed + 1e-12) total += pmf(j, p);
  return Math.min(1, total);
};

const W = 360;
const H = 160;
const bw = (W - 40) / (N + 1);

/**
 * The null hypothesis says the coin is fair. Observe k heads in 20 flips and the
 * p-value is how often a fair coin would look at least this unusual. Small
 * p-values argue against the null; they do not prove the coin is biased.
 */
export default function PValueCoin() {
  const [k, setK] = useState(15);
  const p = twoSidedP(k);
  const observed = pmf(k, 0.5);
  const values = Array.from({ length: N + 1 }, (_, j) => pmf(j, 0.5));
  const max = Math.max(...values);

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Is this coin fair?</p>
        <div className="viz-controls">
          <label htmlFor="pv-k">Heads in {N} flips <b className="num">{k}</b></label>
          <input id="pv-k" type="range" min={0} max={N} step={1} value={k} onChange={(e) => setK(Number(e.target.value))} />
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="dx-svg" role="img" aria-label={`Fair-coin distribution over 20 flips. Observed ${k} heads, two-sided p-value ${p.toFixed(3)}.`}>
          {values.map((v, j) => {
            const hit = v <= observed + 1e-12;
            return (
              <rect
                key={j}
                x={20 + j * bw}
                y={H - 20 - (v / max) * (H - 40)}
                width={bw - 2}
                height={(v / max) * (H - 40)}
                className={hit ? 'dx-packet' : 'dx-link'}
                opacity={j === k ? 1 : 0.6}
              />
            );
          })}
        </svg>
        <p className="viz-cap" aria-live="polite">
          Exact two-sided p-value: <b className="num">{p.toFixed(3)}</b>. Shaded bars are the counts at least as surprising as {k}.
          {' '}A common cut-off is 0.05, but it is a convention, not proof.
        </p>
      </div>
    </Root>
  );
}
