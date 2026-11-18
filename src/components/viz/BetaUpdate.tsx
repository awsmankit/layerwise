import { useState } from 'react';
import { Root } from './shared';

/** The unnormalised Beta shape x^(a-1) (1-x)^(b-1). Scaled for plotting, so only the shape is shown. */
const shape = (x: number, a: number, b: number) => x ** (a - 1) * (1 - x) ** (b - 1);

const W = 360;
const H = 170;
const px = (x: number) => 20 + x * (W - 40);

/**
 * A Beta distribution is a belief about a chance between 0 and 1. Start with a
 * prior (a, b). Each success adds one to a, each failure adds one to b. The
 * posterior is the updated belief. Watch it narrow as the data arrives.
 */
export default function BetaUpdate() {
  const [s, setS] = useState(7);
  const [f, setF] = useState(3);
  const a0 = 1;
  const b0 = 1;
  const a1 = a0 + s;
  const b1 = b0 + f;

  const xs = Array.from({ length: 101 }, (_, i) => i / 100);
  const curve = (a: number, b: number) => {
    const vals = xs.map((x) => shape(Math.min(Math.max(x, 0.001), 0.999), a, b));
    const max = Math.max(...vals);
    return xs.map((x, i) => `${i ? 'L' : 'M'} ${px(x).toFixed(1)} ${(H - 15 - (vals[i] / max) * (H - 30)).toFixed(1)}`).join(' ');
  };
  const postMean = a1 / (a1 + b1);

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Updating a belief about a chance</p>
        <div className="viz-controls">
          <label htmlFor="bu-s">Successes <b className="num">{s}</b></label>
          <input id="bu-s" type="range" min={0} max={30} step={1} value={s} onChange={(e) => setS(Number(e.target.value))} />
          <label htmlFor="bu-f">Failures <b className="num">{f}</b></label>
          <input id="bu-f" type="range" min={0} max={30} step={1} value={f} onChange={(e) => setF(Number(e.target.value))} />
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="dx-svg" role="img" aria-label={`Prior Beta(1, 1) flat, posterior Beta(${a1}, ${b1}) with mean ${postMean.toFixed(2)}`}>
          <line x1={px(0)} y1={H - 15} x2={px(1)} y2={H - 15} className="dx-link" />
          <path d={curve(a0, b0)} className="dx-link" fill="none" strokeDasharray="4 3" />
          <path d={curve(a1, b1)} className="dx-curve" fill="none" />
        </svg>
        <p className="viz-cap" aria-live="polite">
          Prior Beta(1, 1) is flat (dashed). After {s} successes and {f} failures the posterior is Beta({a1}, {b1}), with mean <b className="num">{postMean.toFixed(2)}</b>. Heights are scaled, so only the shape is comparable.
        </p>
      </div>
    </Root>
  );
}
