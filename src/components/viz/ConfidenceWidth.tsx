import { useState } from 'react';
import { Root } from './shared';

const MEAN = 50;
const SD = 10; // the spread of single measurements, taken as known here

/** Half-width of a 95 per cent confidence interval for a mean of n measurements. */
export const halfWidth = (n: number, sd = SD) => (1.96 * sd) / Math.sqrt(n);

const W = 360;
const X_MIN = 36;
const X_MAX = 64;
const px = (v: number) => ((v - X_MIN) / (X_MAX - X_MIN)) * (W - 40) + 20;

/**
 * Average more measurements and the interval around the average gets narrower,
 * but only with the square root of n. Four times the data halves the width.
 */
export default function ConfidenceWidth() {
  const [n, setN] = useState(16);
  const hw = halfWidth(n);
  const lo = MEAN - hw;
  const hi = MEAN + hw;

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">How sure is the average?</p>
        <div className="viz-controls">
          <label htmlFor="cw-n">
            Measurements <b className="num">{n}</b>
          </label>
          <input id="cw-n" type="range" min={4} max={400} step={1} value={n} onChange={(e) => setN(Number(e.target.value))} />
        </div>
        <svg viewBox={`0 0 ${W} 80`} className="dx-svg" role="img" aria-label={`Average ${MEAN}, 95 per cent interval from ${lo.toFixed(1)} to ${hi.toFixed(1)} with ${n} measurements`}>
          <line x1={20} y1="45" x2={W - 20} y2="45" className="dx-link" />
          <rect x={px(lo)} y="32" width={Math.max(2, px(hi) - px(lo))} height="26" className="dx-packet" opacity="0.3" />
          <line x1={px(MEAN)} y1="25" x2={px(MEAN)} y2="65" className="dx-curve" />
        </svg>
        <p className="viz-cap" aria-live="polite">
          Average {MEAN}, 95 per cent interval <b className="num">{lo.toFixed(1)} to {hi.toFixed(1)}</b> (± <b className="num">{hw.toFixed(2)}</b>). Four times the measurements halves the width.
        </p>
      </div>
    </Root>
  );
}
