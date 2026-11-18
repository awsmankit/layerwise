import { useState } from 'react';
import { Root } from './shared';

/* A car whose speed rises steadily: speed = 2 × time, in metres per second. */
const speed = (t: number) => 2 * t;

/** Exact distance from time 0 to time T: the area of the triangle under the speed line, which is T². */
export const exactDistance = (T: number) => T * T;

/** Left-rectangle approximation with n slices: each slice takes the speed at its start time. */
export function sliceDistance(T: number, n: number) {
  const dt = T / n;
  let total = 0;
  for (let i = 0; i < n; i++) total += speed(i * dt) * dt;
  return total;
}

const W = 360;
const H = 200;
const TMAX = 4;
const VMAX = 8;
const px = (t: number) => 30 + (t / TMAX) * (W - 50);
const py = (v: number) => H - 25 - (v / VMAX) * (H - 40);

/**
 * Speed against time. The area under the line, from 0 up to a time T, is the
 * distance travelled by then. Cut that area into thin slices and add them up.
 * More slices give a closer answer, and the exact answer is T².
 */
export default function IntegrationCar() {
  const [T, setT] = useState(2);
  const [n, setN] = useState(4);
  const exact = exactDistance(T);
  const approx = sliceDistance(T, n);
  const dt = T / n;

  const rects = Array.from({ length: n }, (_, i) => {
    const t0 = i * dt;
    const v = speed(t0);
    return (
      <rect key={i} x={px(t0)} y={py(v)} width={px(t0 + dt) - px(t0)} height={py(0) - py(v)} className="dx-link" fill="currentColor" opacity="0.25" stroke="currentColor" strokeWidth="0.5" />
    );
  });

  const triangle = `M ${px(0)} ${py(0)} L ${px(T)} ${py(speed(T))} L ${px(T)} ${py(0)} Z`;

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Speed and distance: the area is the distance</p>
        <div className="viz-controls">
          <label htmlFor="ic-t">Time passed T <b className="num">{T.toFixed(1)} s</b></label>
          <input id="ic-t" type="range" min={0.5} max={TMAX} step={0.1} value={T} onChange={(e) => setT(Number(e.target.value))} />
          <label htmlFor="ic-n">Slices <b className="num">{n}</b></label>
          <input id="ic-n" type="range" min={1} max={40} step={1} value={n} onChange={(e) => setN(Number(e.target.value))} />
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="dx-svg" role="img" aria-label={`Speed rising from 0 to ${speed(T).toFixed(1)} metres per second over ${T.toFixed(1)} seconds. Distance about ${approx.toFixed(2)} metres with ${n} slices; exact ${exact.toFixed(2)}.`}>
          <line x1={px(0)} y1={py(0)} x2={px(TMAX)} y2={py(0)} className="dx-link" />
          <line x1={px(0)} y1={py(0)} x2={px(0)} y2={py(VMAX)} className="dx-link" />
          <path d={triangle} fill="currentColor" opacity="0.12" />
          {rects}
          <line x1={px(0)} y1={py(0)} x2={px(TMAX)} y2={py(speed(TMAX))} className="dx-curve" />
          <line x1={px(T)} y1={py(0)} x2={px(T)} y2={py(speed(T))} className="dx-packet" strokeDasharray="4 3" />
          <text x={px(0) - 4} y={py(VMAX) - 4} className="dx-small">speed</text>
          <text x={px(TMAX) - 12} y={H - 6} className="dx-small">time</text>
        </svg>
        <p className="viz-cap" aria-live="polite">
          With {n} slices the distance is about <b className="num">{approx.toFixed(2)} m</b>. The exact distance, the full triangle up to T, is <b className="num">{exact.toFixed(2)} m</b>.
          {' '}Raise the slices and the rectangles fill the triangle more closely.
        </p>
      </div>
    </Root>
  );
}
