import { useState } from 'react';
import { Root } from './shared';
import { ACTIVATIONS, act, type Activation } from '../../lib/nn';

type Slider = { id: 'x1' | 'x2' | 'w1' | 'w2' | 'b'; label: string; min: number; max: number };
const INPUTS: Slider[] = [
  { id: 'x1', label: 'Input 1', min: -2, max: 2 },
  { id: 'x2', label: 'Input 2', min: -2, max: 2 },
];
const WEIGHTS: Slider[] = [
  { id: 'w1', label: 'Weight 1', min: -2, max: 2 },
  { id: 'w2', label: 'Weight 2', min: -2, max: 2 },
  { id: 'b', label: 'Bias', min: -2, max: 2 },
];

const f = (n: number) => (Math.abs(n) < 0.005 ? '0.00' : n.toFixed(2));
/** A number to add: negatives go in brackets so "+ -0.60" never appears. */
const g = (n: number) => (n < 0 && Math.abs(n) >= 0.005 ? `(${f(n)})` : f(n));

/** The plot of the activation function from -4 to 4. */
const PW = 320;
const PH = 150;
const px = (z: number) => 20 + ((z + 4) / 8) * (PW - 40);
const py = (a: number) => PH - 24 - ((a + 1.5) / 5.5) * (PH - 40);

function curve(kind: Activation) {
  const pts: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const z = -4 + (i / 80) * 8;
    pts.push(`${i ? 'L' : 'M'}${px(z).toFixed(1)} ${py(Math.max(-1.5, Math.min(4, act(kind, z)))).toFixed(1)}`);
  }
  return pts.join(' ');
}

/**
 * One neuron, made of nothing but arithmetic: multiply each input by its weight, add them up with the
 * bias, then pass the total through an activation function. Move the sliders and watch each part.
 */
export default function NeuronCalc() {
  const [v, setV] = useState({ x1: 1, x2: -0.5, w1: 0.8, w2: 1.2, b: -0.3 });
  const [kind, setKind] = useState<Activation>('relu');
  const set = (id: Slider['id'], n: number) => setV((o) => ({ ...o, [id]: n }));

  const t1 = v.x1 * v.w1;
  const t2 = v.x2 * v.w2;
  const z = t1 + t2 + v.b;
  const out = act(kind, z);
  const zc = Math.max(-4, Math.min(4, z));

  const row = (s: Slider) => (
    <label key={s.id} className="da-slide">
      <span>
        {s.label} <b className="num">{f(v[s.id])}</b>
      </span>
      <input type="range" min={s.min} max={s.max} step={0.1} value={v[s.id]} onChange={(e) => set(s.id, Number(e.target.value))} aria-valuetext={f(v[s.id])} />
    </label>
  );

  return (
    <Root>
      <div className="viz da-neuron">
        <p className="viz-title">One neuron, step by step</p>
        <div className="da-row" role="group" aria-label="Activation function">
          <span className="da-lab">Activation</span>
          {ACTIVATIONS.map((a) => (
            <button key={a.id} type="button" className="da-chip" aria-pressed={kind === a.id} onClick={() => setKind(a.id)}>
              {a.label}
            </button>
          ))}
        </div>

        <div className="da-sliders">
          <div>{INPUTS.map(row)}</div>
          <div>{WEIGHTS.map(row)}</div>
        </div>

        <ol className="da-sum num" aria-live="polite">
          <li>
            Multiply: {g(v.x1)} × {g(v.w1)} = <b>{f(t1)}</b> and {g(v.x2)} × {g(v.w2)} = <b>{f(t2)}</b>
          </li>
          <li>
            Add them and the bias: {f(t1)} + {g(t2)} + {g(v.b)} = <b>{f(z)}</b>
          </li>
          <li>
            Activation ({ACTIVATIONS.find((a) => a.id === kind)!.label}): <b>{f(z)}</b> becomes <b className="da-out">{f(out)}</b>
          </li>
        </ol>

        <svg className="da-svg" viewBox={`0 0 ${PW} ${PH}`} role="img" aria-label={`Graph of the ${kind === 'linear' ? 'no-bend' : kind} activation. The total ${f(z)} gives the output ${f(out)}.`}>
          <path d={`M20 ${py(0)} H${PW - 20}`} className="da-axis" />
          <path d={`M${px(0)} 14 V${PH - 20}`} className="da-axis" />
          <path d={curve(kind)} className="da-curve" />
          <path d={`M${px(zc)} ${py(0)} V${py(Math.max(-1.5, Math.min(4, out)))}`} className="da-drop" />
          <circle cx={px(zc)} cy={py(Math.max(-1.5, Math.min(4, out)))} r="5.5" className="da-dot" />
          <text x={PW - 20} y={py(0) + 16} textAnchor="end" className="da-t">
            total in
          </text>
          <text x={px(0) + 6} y="22" className="da-t">
            out
          </text>
        </svg>
        <p className="viz-cap">
          A neuron is a weighted vote: each input is multiplied by its weight, the results are added with the bias, and the activation function bends the total. With None selected the output is just the total, so the graph is a straight line.
        </p>
      </div>
    </Root>
  );
}
