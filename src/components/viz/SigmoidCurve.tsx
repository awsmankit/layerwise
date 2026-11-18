import { useState } from 'react';
import { Root } from './shared';

/** The sigmoid squashes any number into a probability between 0 and 1. */
export const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

const W = 360;
const H = 180;
const X_MIN = -6;
const X_MAX = 6;
const px = (x: number) => ((x - X_MIN) / (X_MAX - X_MIN)) * W;
const py = (p: number) => H - 10 - p * (H - 20);

/**
 * A logistic model: z = w·x + b, then the sigmoid turns z into a probability.
 * The weight w sets how steep the S is, the bias b shifts it sideways, and the
 * input x picks a point on it.
 */
export default function SigmoidCurve() {
  const [w, setW] = useState(1);
  const [b, setB] = useState(0);
  const [x0, setX0] = useState(2);
  const z = w * x0 + b;
  const p = sigmoid(z);
  const curve = Array.from({ length: 121 }, (_, i) => {
    const x = X_MIN + (i / 120) * (X_MAX - X_MIN);
    return `${i ? 'L' : 'M'} ${px(x).toFixed(1)} ${py(sigmoid(w * x + b)).toFixed(1)}`;
  }).join(' ');

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">A sigmoid turns a score into a probability</p>
        <div className="viz-controls">
          <label htmlFor="sg-w">Weight w <b className="num">{w.toFixed(2)}</b></label>
          <input id="sg-w" type="range" min={-3} max={3} step={0.05} value={w} onChange={(e) => setW(Number(e.target.value))} />
          <label htmlFor="sg-b">Bias b <b className="num">{b.toFixed(2)}</b></label>
          <input id="sg-b" type="range" min={-4} max={4} step={0.05} value={b} onChange={(e) => setB(Number(e.target.value))} />
          <label htmlFor="sg-x">Input x <b className="num">{x0.toFixed(2)}</b></label>
          <input id="sg-x" type="range" min={-6} max={6} step={0.05} value={x0} onChange={(e) => setX0(Number(e.target.value))} />
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="dx-svg" role="img" aria-label={`Sigmoid of w x plus b. At x ${x0.toFixed(2)} the probability is ${p.toFixed(2)}.`}>
          <line x1={px(X_MIN)} y1={py(0.5)} x2={px(X_MAX)} y2={py(0.5)} className="dx-link" strokeDasharray="3 3" />
          <path d={curve} className="dx-curve" fill="none" />
          <circle cx={px(x0)} cy={py(p)} r="5" className="dx-packet" />
        </svg>
        <p className="viz-cap" aria-live="polite">
          z = w·x + b = <b className="num">{z.toFixed(2)}</b>, so the probability is <b className="num">{p.toFixed(2)}</b>. The score z can be any number; the sigmoid keeps the answer between 0 and 1.
        </p>
      </div>
    </Root>
  );
}
