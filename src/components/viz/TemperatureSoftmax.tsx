import { useState } from 'react';
import { Root } from './shared';

const SCORES = [2.0, 1.0, 0.1];
const NAMES = ['cat', 'dog', 'car'];

/** Softmax with a temperature: divide the scores by T before the usual softmax. */
export function softmaxT(z: number[], T: number) {
  const scaled = z.map((x) => x / T);
  const m = Math.max(...scaled);
  const e = scaled.map((x) => Math.exp(x - m));
  const total = e.reduce((s, x) => s + x, 0);
  return e.map((x) => x / total);
}

/** Entropy in bits of a list of probabilities: how spread out the choice is. */
const entropy = (p: number[]) => -p.reduce((s, x) => (x > 0 ? s + x * Math.log2(x) : s), 0);

/**
 * The same scores, with a temperature knob. Low temperature sharpens the choice
 * towards the top score. High temperature flattens it, so a sampler picks more
 * varied words. This is the setting behind "creative" versus "precise" answers.
 */
export default function TemperatureSoftmax() {
  const [T, setT] = useState(1);
  const p = softmaxT(SCORES, T);
  const H = entropy(p);

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">One set of scores, one temperature</p>
        <div className="viz-controls">
          <label htmlFor="ts-t">
            Temperature <b className="num">{T.toFixed(2)}</b>
          </label>
          <input id="ts-t" type="range" min={0.1} max={3} step={0.01} value={T} onChange={(e) => setT(Number(e.target.value))} />
        </div>
        <svg viewBox="0 0 360 150" className="dx-svg" role="img" aria-label={`Probabilities at temperature ${T.toFixed(2)}: ${NAMES.map((nm, i) => `${nm} ${(p[i] * 100).toFixed(0)} per cent`).join(', ')}`}>
          {p.map((v, i) => (
            <g key={NAMES[i]}>
              <rect x={40 + i * 100} y={130 - v * 110} width={40} height={v * 110} className="dx-packet" />
              <text x={60 + i * 100} y="145" textAnchor="middle" className="dx-small">{NAMES[i]}</text>
            </g>
          ))}
        </svg>
        <p className="viz-cap" aria-live="polite">
          Probabilities: {NAMES.map((nm, i) => `${nm} ${(p[i] * 100).toFixed(0)}%`).join(', ')}. Entropy <b className="num">{H.toFixed(2)}</b> bits. At T = 1 this is the plain softmax from the earlier lesson.
        </p>
      </div>
    </Root>
  );
}
