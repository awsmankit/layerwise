import { useState } from 'react';
import { Root } from './shared';

/* The function is f(x) = x². Its slope at x is 2x, which the widget checks numerically. */
const f = (x: number) => x * x;

/** Slope of the line through (x, f(x)) and (x + h, f(x + h)). Shrinks to the derivative as h shrinks. */
export const secantSlope = (x: number, h: number) => (f(x + h) - f(x)) / h;

const X_MIN = -3;
const X_MAX = 3;
const Y_MAX = 9;
const W = 360;
const H = 240;
const px = (x: number) => ((x - X_MIN) / (X_MAX - X_MIN)) * W;
const py = (y: number) => H - (y / Y_MAX) * H;

/**
 * Pick a point on f(x) = x² and a step h. The dashed line is the secant through
 * the point and the point h further on. The solid line is the tangent: the slope
 * the secant approaches as h shrinks.
 */
export default function DerivativeSlope() {
  const [x, setX] = useState(1);
  const [h, setH] = useState(1);

  const sec = secantSlope(x, h);
  const tan = 2 * x;

  const pts = Array.from({ length: 61 }, (_, i) => {
    const xv = X_MIN + (i / 60) * (X_MAX - X_MIN);
    return `${i ? 'L' : 'M'} ${px(xv).toFixed(1)} ${py(f(xv)).toFixed(1)}`;
  }).join(' ');

  const lineThrough = (slope: number, cx: number) => {
    const x1 = X_MIN;
    const x2 = X_MAX;
    const y1 = f(cx) + slope * (x1 - cx);
    const y2 = f(cx) + slope * (x2 - cx);
    return { x1: px(x1), y1: py(y1), x2: px(x2), y2: py(y2) };
  };

  const secLine = lineThrough(sec, x);
  const tanLine = lineThrough(tan, x);

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Slope of f(x) = x²</p>
        <div className="viz-controls">
          <label htmlFor="ds-x">
            Point x = <b className="num">{x.toFixed(2)}</b>
          </label>
          <input id="ds-x" type="range" min={-2.5} max={2.5} step={0.05} value={x} onChange={(e) => setX(Number(e.target.value))} />
          <label htmlFor="ds-h">
            Step h = <b className="num">{h.toFixed(2)}</b>
          </label>
          <input id="ds-h" type="range" min={0.05} max={2} step={0.05} value={h} onChange={(e) => setH(Number(e.target.value))} />
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="dx-svg" role="img" aria-label={`Parabola with a point at x = ${x.toFixed(2)}, a secant with slope ${sec.toFixed(2)} and a tangent with slope ${tan.toFixed(2)}`}>
          <path d={pts} className="dx-curve" fill="none" />
          <line x1={secLine.x1} y1={secLine.y1} x2={secLine.x2} y2={secLine.y2} className="dx-link" strokeDasharray="4 4" />
          <line x1={tanLine.x1} y1={tanLine.y1} x2={tanLine.x2} y2={tanLine.y2} className="dx-curve" />
          <circle cx={px(x)} cy={py(f(x))} r="4" className="dx-packet" />
          <circle cx={px(x + h)} cy={py(f(x + h))} r="3" className="dx-link" />
        </svg>
        <p className="viz-cap" aria-live="polite">
          Secant slope over step h: <b className="num">{sec.toFixed(2)}</b>. True slope (derivative) 2x: <b className="num">{tan.toFixed(2)}</b>.
          {' '}Make h smaller and the secant slope closes in on the derivative.
        </p>
      </div>
    </Root>
  );
}
