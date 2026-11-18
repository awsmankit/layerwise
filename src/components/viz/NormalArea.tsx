import { useState } from 'react';
import { Root } from './shared';

/** Error function, Abramowitz and Stegun 7.1.26 (absolute error below 1.5e-7). */
export function erf(x: number) {
  const s = x < 0 ? -1 : 1;
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return s * y;
}

/** Normal cumulative probability: the chance a value falls at or below x. */
export const cdf = (x: number, mu: number, sd: number) => 0.5 * (1 + erf((x - mu) / (sd * Math.SQRT2)));

const W = 360;
const H = 180;
const X_MIN = -4;
const X_MAX = 4;
const pdf = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
const px = (x: number) => ((x - X_MIN) / (X_MAX - X_MIN)) * W;
const py = (y: number) => H - 10 - (y / 0.42) * (H - 20);

/**
 * The normal curve, standard (mean 0, spread 1). Pick a range and the shaded
 * area is the probability a value falls inside it. The area is found by adding
 * up the curve, which is the integral from the integration lesson.
 */
export default function NormalArea() {
  const [a, setA] = useState(-1.96);
  const [b, setB] = useState(1.96);
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const prob = cdf(hi, 0, 1) - cdf(lo, 0, 1);

  const curve = Array.from({ length: 121 }, (_, i) => {
    const x = X_MIN + (i / 120) * (X_MAX - X_MIN);
    return `${i ? 'L' : 'M'} ${px(x).toFixed(1)} ${py(pdf(x)).toFixed(1)}`;
  }).join(' ');
  const shade = `M ${px(lo)} ${py(0)} ` + Array.from({ length: 61 }, (_, i) => {
    const x = lo + (i / 60) * (hi - lo);
    return `L ${px(x).toFixed(1)} ${py(pdf(x)).toFixed(1)}`;
  }).join(' ') + ` L ${px(hi)} ${py(0)} Z`;

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">The normal curve and an area under it</p>
        <div className="viz-controls">
          <label htmlFor="na-a">
            From <b className="num">{a.toFixed(2)}</b>
          </label>
          <input id="na-a" type="range" min={-4} max={4} step={0.01} value={a} onChange={(e) => setA(Number(e.target.value))} />
          <label htmlFor="na-b">
            To <b className="num">{b.toFixed(2)}</b>
          </label>
          <input id="na-b" type="range" min={-4} max={4} step={0.01} value={b} onChange={(e) => setB(Number(e.target.value))} />
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="dx-svg" role="img" aria-label={`Normal curve with the area from ${lo.toFixed(2)} to ${hi.toFixed(2)} shaded. Probability ${(prob * 100).toFixed(1)} per cent.`}>
          <path d={shade} fill="currentColor" opacity="0.25" />
          <path d={curve} className="dx-curve" fill="none" />
          <line x1={px(0)} y1={py(0)} x2={px(0)} y2={py(pdf(0))} className="dx-link" strokeDasharray="3 3" />
        </svg>
        <p className="viz-cap" aria-live="polite">
          Probability between {lo.toFixed(2)} and {hi.toFixed(2)}: <b className="num">{(prob * 100).toFixed(1)}%</b>.
          {' '}From −1.96 to 1.96 is 95%, the usual "95 per cent interval".
        </p>
      </div>
    </Root>
  );
}
