import { useState } from 'react';
import { Root } from './shared';

/* f(x, y) = x² + 3y². Its contours are ellipses, and its gradient points uphill. */
const f = (x: number, y: number) => x * x + 3 * y * y;

const W = 300;
const H = 300;
const S = 60; // pixels per unit
const cx = W / 2;
const cy = H / 2;

/**
 * A surface with two dials, x and y. The partial derivative for each dial is the
 * slope when only that dial moves. Together they form the gradient, an arrow
 * that points uphill; the descent step goes the other way.
 */
export default function PartialSlopes() {
  const [x, setX] = useState(1);
  const [y, setY] = useState(1);
  const dfdx = 2 * x;
  const dfdy = 6 * y;
  const value = f(x, y);
  const scale = 0.6;

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Two dials, two partial slopes</p>
        <div className="viz-controls">
          <label htmlFor="ps-x">
            x <b className="num">{x.toFixed(2)}</b>
          </label>
          <input id="ps-x" type="range" min={-2} max={2} step={0.05} value={x} onChange={(e) => setX(Number(e.target.value))} />
          <label htmlFor="ps-y">
            y <b className="num">{y.toFixed(2)}</b>
          </label>
          <input id="ps-y" type="range" min={-2} max={2} step={0.05} value={y} onChange={(e) => setY(Number(e.target.value))} />
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="dx-svg" role="img" aria-label={`Contours of x squared plus 3 y squared. Point at x ${x.toFixed(2)}, y ${y.toFixed(2)}, gradient arrow.`}>
          {[1, 4, 9].map((c) => (
            <ellipse key={c} cx={cx} cy={cy} rx={Math.sqrt(c) * S} ry={Math.sqrt(c / 3) * S} className="dx-link" fill="none" />
          ))}
          <line x1={cx} y1={cy} x2={cx + x * S} y2={cy + y * S} className="dx-link" strokeDasharray="3 3" />
          <line x1={cx + x * S} y1={cy + y * S} x2={cx + (x + dfdx * scale) * S} y2={cy + (y + dfdy * scale) * S} className="dx-packet" />
          <circle cx={cx + x * S} cy={cy + y * S} r="4" className="dx-packet" />
        </svg>
        <p className="viz-cap" aria-live="polite">
          ∂f/∂x = 2x = <b className="num">{dfdx.toFixed(2)}</b> and ∂f/∂y = 6y = <b className="num">{dfdy.toFixed(2)}</b>. The loss here is <b className="num">{value.toFixed(2)}</b>. The arrow shows the uphill direction; descent moves the other way.
        </p>
      </div>
    </Root>
  );
}
