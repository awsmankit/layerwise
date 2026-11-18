import { useState } from 'react';
import { Root } from './shared';

/* Twelve fixed points, a cloud stretched along a tilted direction, so the answer is the same every time. */
const POINTS = Array.from({ length: 12 }, (_, i) => {
  const t = i - 5.5;
  return { x: t, y: 0.5 * t + 0.6 * Math.sin(i * 2.3) };
});

const n = POINTS.length;
const mx = POINTS.reduce((s, p) => s + p.x, 0) / n;
const my = POINTS.reduce((s, p) => s + p.y, 0) / n;
const Sxx = POINTS.reduce((s, p) => s + (p.x - mx) ** 2, 0) / n;
const Syy = POINTS.reduce((s, p) => s + (p.y - my) ** 2, 0) / n;
const Sxy = POINTS.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / n;

/** Variance of the points when projected onto the line at angle θ (radians). */
export const varianceAt = (theta: number) => {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return c * c * Sxx + 2 * s * c * Sxy + s * s * Syy;
};

/** The angle of the direction of greatest spread: the first principal component. */
export const bestAngle = () => 0.5 * Math.atan2(2 * Sxy, Sxx - Syy);

const W = 360;
const H = 220;
const px = (x: number) => W / 2 + x * 18;
const py = (y: number) => H / 2 - y * 18;

/**
 * Turn the line through the cloud and see how spread out the points are along
 * it. The spread peaks at one angle: the principal component, the eigenvector of
 * the covariance matrix with the largest eigenvalue.
 */
export default function PrincipalAxis() {
  const [deg, setDeg] = useState(20);
  const theta = (deg * Math.PI) / 180;
  const best = (bestAngle() * 180) / Math.PI;
  const bestNorm = ((best % 180) + 180) % 180;
  const v = varianceAt(theta);
  const vBest = varianceAt(bestAngle());
  const L = 9;
  const c = Math.cos(theta);
  const s = Math.sin(theta);

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Find the direction of greatest spread</p>
        <div className="viz-controls">
          <label htmlFor="pa-deg">
            Direction <b className="num">{deg}°</b>
          </label>
          <input id="pa-deg" type="range" min={0} max={179} step={1} value={deg} onChange={(e) => setDeg(Number(e.target.value))} />
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="dx-svg" role="img" aria-label={`Twelve points with a line at ${deg} degrees. Spread along it ${v.toFixed(2)}; largest at ${bestNorm.toFixed(0)} degrees.`}>
          <line x1={px(-L * c)} y1={py(-L * s)} x2={px(L * c)} y2={py(L * s)} className="dx-link" />
          {POINTS.map((p, i) => (
            <circle key={i} cx={px(p.x)} cy={py(p.y)} r="3" className="dx-packet" />
          ))}
        </svg>
        <p className="viz-cap" aria-live="polite">
          Spread along this line: <b className="num">{v.toFixed(2)}</b>. The largest spread, <b className="num">{vBest.toFixed(2)}</b>, is at about <b className="num">{bestNorm.toFixed(0)}°</b>. That direction is the principal component.
        </p>
      </div>
    </Root>
  );
}
