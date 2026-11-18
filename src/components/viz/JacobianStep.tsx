import { useState } from 'react';
import { Root } from './shared';

/* F(x, y) = (x·y, x + y²): two outputs from two inputs. */
export const F = (x: number, y: number): [number, number] => [x * y, x + y * y];

/** The Jacobian: the grid of partial derivatives, one row per output, one column per input. */
export const jacobian = (x: number, y: number): number[][] => [
  [y, x],
  [1, 2 * y],
];

/**
 * A vector function turns a small input step into an output step. Near a point,
 * the Jacobian predicts that step with a linear map. Make the step small and the
 * prediction matches the exact change; make it large and they drift apart.
 */
export default function JacobianStep() {
  const [x, setX] = useState(1);
  const [y, setY] = useState(2);
  const [dx, setDx] = useState(0.1);
  const [dy, setDy] = useState(-0.1);

  const J = jacobian(x, y);
  const lin = [J[0][0] * dx + J[0][1] * dy, J[1][0] * dx + J[1][1] * dy];
  const [f0, g0] = F(x, y);
  const [f1, g1] = F(x + dx, y + dy);
  const exact = [f1 - f0, g1 - g0];
  const err = Math.hypot(lin[0] - exact[0], lin[1] - exact[1]);

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Jacobian: the best linear guess for a small step</p>
        <div className="viz-controls">
          <label htmlFor="jc-x">Point x <b className="num">{x.toFixed(2)}</b></label>
          <input id="jc-x" type="range" min={-2} max={2} step={0.05} value={x} onChange={(e) => setX(Number(e.target.value))} />
          <label htmlFor="jc-y">Point y <b className="num">{y.toFixed(2)}</b></label>
          <input id="jc-y" type="range" min={-2} max={2} step={0.05} value={y} onChange={(e) => setY(Number(e.target.value))} />
          <label htmlFor="jc-dx">Step dx <b className="num">{dx.toFixed(2)}</b></label>
          <input id="jc-dx" type="range" min={-1} max={1} step={0.01} value={dx} onChange={(e) => setDx(Number(e.target.value))} />
          <label htmlFor="jc-dy">Step dy <b className="num">{dy.toFixed(2)}</b></label>
          <input id="jc-dy" type="range" min={-1} max={1} step={0.01} value={dy} onChange={(e) => setDy(Number(e.target.value))} />
        </div>
        <p className="viz-cap" aria-live="polite">
          Jacobian at this point: [{J[0][0].toFixed(2)}, {J[0][1].toFixed(2)}; {J[1][0].toFixed(2)}, {J[1][1].toFixed(2)}].
          {' '}Predicted output change: (<b className="num">{lin[0].toFixed(3)}</b>, <b className="num">{lin[1].toFixed(3)}</b>).
          {' '}Exact change: (<b className="num">{exact[0].toFixed(3)}</b>, <b className="num">{exact[1].toFixed(3)}</b>).
          {' '}Gap: <b className="num">{err.toFixed(4)}</b>.
        </p>
      </div>
    </Root>
  );
}
