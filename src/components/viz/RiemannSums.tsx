import { useState } from 'react';
import { Root } from './shared';

const f = (x: number) => x * x;
export const EXACT = 1 / 3; // the integral of x² from 0 to 1

/** Midpoint Riemann sum: slice [a, b] into n strips, each as tall as the curve at its middle. */
export function midpointSum(n: number, a = 0, b = 1) {
  const w = (b - a) / n;
  let s = 0;
  for (let i = 0; i < n; i++) s += f(a + (i + 0.5) * w) * w;
  return s;
}

const W = 360;
const H = 200;
const px = (x: number) => 20 + x * (W - 40);
const py = (y: number) => H - 20 - y * (H - 40);

/**
 * The area under x² between 0 and 1, filled with thin strips. More strips give a
 * better total. Integration is the limit of this sum as the strips become infinitely thin.
 */
export default function RiemannSums() {
  const [n, setN] = useState(4);
  const w = 1 / n;
  const approx = midpointSum(n);
  const strips = Array.from({ length: n }, (_, i) => {
    const x0 = i * w;
    const mid = x0 + w / 2;
    return (
      <rect key={i} x={px(x0)} y={py(f(mid))} width={px(x0 + w) - px(x0)} height={py(0) - py(f(mid))} className="dx-link" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="0.5" />
    );
  });
  const curve = Array.from({ length: 61 }, (_, i) => {
    const x = i / 60;
    return `${i ? 'L' : 'M'} ${px(x).toFixed(1)} ${py(f(x)).toFixed(1)}`;
  }).join(' ');

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Adding up thin strips</p>
        <div className="viz-controls">
          <label htmlFor="rs-n">
            Strips <b className="num">{n}</b>
          </label>
          <input id="rs-n" type="range" min={1} max={40} step={1} value={n} onChange={(e) => setN(Number(e.target.value))} />
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="dx-svg" role="img" aria-label={`Curve x squared from 0 to 1, with ${n} strips. Total ${approx.toFixed(4)}; exact value 0.3333.`}>
          {strips}
          <path d={curve} className="dx-curve" fill="none" />
        </svg>
        <p className="viz-cap" aria-live="polite">
          {n} strips give <b className="num">{approx.toFixed(4)}</b>. The exact area is 1/3 = 0.3333, error <b className="num">{Math.abs(approx - EXACT).toFixed(4)}</b>.
        </p>
      </div>
    </Root>
  );
}
