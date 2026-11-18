import { useMemo, useState } from 'react';
import { Root } from './shared';

/* The loss is L(w) = (w − 3)². Its lowest point is w = 3, and its slope is 2(w − 3). */
const loss = (w: number) => (w - 3) ** 2;
const grad = (w: number) => 2 * (w - 3);

/** One gradient descent step: move against the slope by lr times the slope. */
export const step = (w: number, lr: number) => w - lr * grad(w);

const W = 360;
const H = 200;
const X_MIN = -2;
const X_MAX = 8;
const Y_MAX = 30;
const px = (w: number) => ((w - X_MIN) / (X_MAX - X_MIN)) * W;
const py = (y: number) => H - (Math.min(y, Y_MAX) / Y_MAX) * H;

const START = 0;
const MAX_STEPS = 12;

/**
 * Gradient descent on one dial. The curve is the loss; the dot is the current
 * value of w. Each step moves the dot downhill by learning rate × slope. Watch
 * how a small rate creeps, a good rate lands, and a too-large rate overshoots.
 */
export default function GradientStepper() {
  const [lr, setLr] = useState(0.1);
  const [steps, setSteps] = useState(0);

  const path = useMemo(() => {
    const ws = [START];
    for (let i = 0; i < steps; i++) ws.push(step(ws[ws.length - 1], lr));
    return ws;
  }, [lr, steps]);

  const w = path[path.length - 1];
  const diverging = Math.abs(w - 3) > 50;
  const curve = Array.from({ length: 81 }, (_, i) => {
    const wv = X_MIN + (i / 80) * (X_MAX - X_MIN);
    return `${i ? 'L' : 'M'} ${px(wv).toFixed(1)} ${py(loss(wv)).toFixed(1)}`;
  }).join(' ');

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Gradient descent on one dial</p>
        <div className="viz-controls">
          <label htmlFor="gs-lr">
            Learning rate <b className="num">{lr.toFixed(2)}</b>
          </label>
          <input id="gs-lr" type="range" min={0.01} max={1.1} step={0.01} value={lr} onChange={(e) => { setLr(Number(e.target.value)); setSteps(0); }} />
          <button type="button" onClick={() => setSteps((s) => Math.min(MAX_STEPS, s + 1))} disabled={steps >= MAX_STEPS || diverging}>
            Take a step
          </button>
          <button type="button" onClick={() => setSteps(0)}>Reset</button>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="dx-svg" role="img" aria-label={`Loss curve with minimum at w = 3. After ${steps} steps w is ${Number.isFinite(w) ? w.toFixed(2) : 'too large to show'}.`}>
          <path d={curve} className="dx-curve" fill="none" />
          <circle cx={px(3)} cy={py(0)} r="3" className="dx-link" />
          {path.map((v, i) => (
            <circle key={i} cx={px(Math.max(X_MIN, Math.min(X_MAX, v)))} cy={py(loss(v))} r={i === path.length - 1 ? 5 : 2.5} className={i === path.length - 1 ? 'dx-packet' : 'dx-link'} />
          ))}
        </svg>
        <p className="viz-cap" aria-live="polite">
          Step {steps}: w = <b className="num">{Number.isFinite(w) ? w.toFixed(2) : '∞'}</b>, loss = <b className="num">{Number.isFinite(w) ? loss(w).toFixed(2) : '∞'}</b>.
          {steps === 0 && <> With this learning rate the first step takes w from 0 to <b className="num">{step(START, lr).toFixed(2)}</b>.</>}
          {diverging ? ' The steps are growing, so the rate is too large and the loss is blowing up.' : ' The minimum is at w = 3.'}
        </p>
      </div>
    </Root>
  );
}
