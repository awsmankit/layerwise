import { useMemo, useState } from 'react';
import { Root } from './shared';

/* f(x, y) = x² + 10y²: a long, narrow valley. Plain descent zigzags across it. */
const grad = (x: number, y: number): [number, number] => [2 * x, 20 * y];

const LR = 0.04;
const START: [number, number] = [-1.6, 1];
const STEPS = 30;

/** Run descent with a momentum term. beta = 0 is plain gradient descent. */
export function run(beta: number) {
  const pts: [number, number][] = [START];
  let [x, y] = START;
  let [vx, vy] = [0, 0];
  for (let i = 0; i < STEPS; i++) {
    const [gx, gy] = grad(x, y);
    vx = beta * vx + gx;
    vy = beta * vy + gy;
    x -= LR * vx;
    y -= LR * vy;
    pts.push([x, y]);
  }
  return pts;
}

const W = 340;
const H = 220;
const S = 90;
const cx = W / 2;
const cy = H / 2;
const toXY = ([x, y]: [number, number]) => [cx + x * S, cy - y * S] as const;

/**
 * Plain descent (beta 0) zigzags across the valley and crawls down it. Adding
 * momentum (beta near 0.9) keeps the steps that agree and cancels the zigzag, so
 * the path goes more directly to the bottom.
 */
export default function MomentumValley() {
  const [beta, setBeta] = useState(0.9);
  const plain = useMemo(() => run(0), []);
  const withM = useMemo(() => run(beta), [beta]);
  const finalLoss = (p: [number, number]) => p[0] * p[0] + 10 * p[1] * p[1];
  const last = withM[withM.length - 1];
  const lastPlain = plain[plain.length - 1];
  const path = (pts: [number, number][]) =>
    pts.map((p, i) => {
      const [x, y] = toXY(p);
      return `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Plain descent versus momentum</p>
        <div className="viz-controls">
          <label htmlFor="mv-b">
            Momentum β <b className="num">{beta.toFixed(2)}</b>
          </label>
          <input id="mv-b" type="range" min={0} max={0.95} step={0.01} value={beta} onChange={(e) => setBeta(Number(e.target.value))} />
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="dx-svg" role="img" aria-label={`Valley with two paths. Plain descent ends at loss ${finalLoss(lastPlain).toExponential(1)}; momentum ${beta.toFixed(2)} ends at loss ${finalLoss(last).toExponential(1)}.`}>
          <path d={path(plain)} className="dx-link" fill="none" strokeDasharray="4 3" />
          <path d={path(withM)} className="dx-curve" fill="none" />
          <circle cx={toXY(START)[0]} cy={toXY(START)[1]} r="4" className="dx-packet" />
        </svg>
        <p className="viz-cap" aria-live="polite">
          After {STEPS} steps: plain descent loss <b className="num">{finalLoss(lastPlain).toExponential(1)}</b> (dashed); with momentum <b className="num">{finalLoss(last).toExponential(1)}</b> (solid).
        </p>
      </div>
    </Root>
  );
}
