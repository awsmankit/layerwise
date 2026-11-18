import { useState } from 'react';
import { Root } from './shared';

/** Cross-entropy for one example: minus the natural log of the probability given to the right answer. */
export const crossEntropy = (pCorrect: number) => -Math.log(pCorrect);

const W = 360;
const H = 150;
const MAX_LOSS = 5;

/**
 * Give the right answer a probability and see the penalty. The curve climbs
 * without limit as the probability heads to zero, so a confident wrong answer
 * costs far more than a hesitant one.
 */
export default function CrossEntropyLoss() {
  const [p, setP] = useState(0.66);
  const loss = crossEntropy(p);
  const bar = Math.min(loss, MAX_LOSS) / MAX_LOSS;
  const curve = Array.from({ length: 100 }, (_, i) => {
    const q = 0.01 + (i / 99) * 0.99;
    const y = Math.min(crossEntropy(q), MAX_LOSS);
    const x = 20 + (q - 0.01) / 0.99 * (W - 40);
    const py = H - 20 - (y / MAX_LOSS) * (H - 40);
    return `${i ? 'L' : 'M'} ${x.toFixed(1)} ${py.toFixed(1)}`;
  }).join(' ');
  const px = 20 + ((p - 0.01) / 0.99) * (W - 40);
  const pyPoint = H - 20 - (Math.min(loss, MAX_LOSS) / MAX_LOSS) * (H - 40);

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">The penalty for the right answer</p>
        <div className="viz-controls">
          <label htmlFor="ce-p">
            Probability given to the right answer <b className="num">{p.toFixed(2)}</b>
          </label>
          <input id="ce-p" type="range" min={0.01} max={1} step={0.01} value={p} onChange={(e) => setP(Number(e.target.value))} />
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="dx-svg" role="img" aria-label={`Loss curve; at probability ${p.toFixed(2)} the loss is ${loss.toFixed(2)}`}>
          <line x1="20" y1={H - 20} x2={W - 20} y2={H - 20} className="dx-link" />
          <path d={curve} className="dx-curve" fill="none" />
          <circle cx={px} cy={pyPoint} r="5" className="dx-packet" />
        </svg>
        <p className="viz-cap" aria-live="polite">
          Loss = −ln({p.toFixed(2)}) = <b className="num">{loss.toFixed(2)}</b>.{bar >= 1 ? ` The chart stops at ${MAX_LOSS}, so this point is off the top.` : ''}
          {' '}Probability 0.5 costs 0.69; 0.01 costs 4.61.
        </p>
      </div>
    </Root>
  );
}
