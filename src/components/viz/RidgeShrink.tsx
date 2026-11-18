import { useState } from 'react';
import { Root } from './shared';

/* The data pulls w towards 3. The penalty pulls it towards 0 with strength lambda. */
const fit = (w: number) => (w - 3) ** 2;
export const ridgeLoss = (w: number, lambda: number) => fit(w) + lambda * w * w;

/** The w that minimises the loss with penalty lambda: 3 divided by (1 + lambda). */
export const ridgeW = (lambda: number) => 3 / (1 + lambda);

const W = 360;
const H = 180;
const X_MIN = -1;
const X_MAX = 4;
const Y_MAX = 9;
const px = (w: number) => ((w - X_MIN) / (X_MAX - X_MIN)) * W;
const py = (y: number) => H - 10 - (Math.min(y, Y_MAX) / Y_MAX) * (H - 20);

/**
 * Regularisation adds a penalty for large dials: lambda times w². The lowest
 * point moves towards zero as lambda grows. The data wants w = 3; the penalty
 * wants w = 0. The answer lands between them.
 */
export default function RidgeShrink() {
  const [lambda, setLambda] = useState(0);
  const w = ridgeW(lambda);
  const curve = Array.from({ length: 121 }, (_, i) => {
    const v = X_MIN + (i / 120) * (X_MAX - X_MIN);
    return `${i ? 'L' : 'M'} ${px(v).toFixed(1)} ${py(ridgeLoss(v, lambda)).toFixed(1)}`;
  }).join(' ');

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">A penalty pulls the answer towards zero</p>
        <div className="viz-controls">
          <label htmlFor="rs-l">
            Penalty λ <b className="num">{lambda.toFixed(2)}</b>
          </label>
          <input id="rs-l" type="range" min={0} max={3} step={0.05} value={lambda} onChange={(e) => setLambda(Number(e.target.value))} />
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="dx-svg" role="img" aria-label={`Loss curve with penalty ${lambda.toFixed(2)}; lowest point at w = ${w.toFixed(2)}`}>
          <line x1={px(0)} y1="10" x2={px(0)} y2={H - 10} className="dx-link" strokeDasharray="3 3" />
          <path d={curve} className="dx-curve" fill="none" />
          <circle cx={px(w)} cy={py(ridgeLoss(w, lambda))} r="5" className="dx-packet" />
        </svg>
        <p className="viz-cap" aria-live="polite">
          Lowest point at <b className="num">w = {w.toFixed(2)}</b>. With no penalty it is 3; as λ grows it slides towards 0.
        </p>
      </div>
    </Root>
  );
}
