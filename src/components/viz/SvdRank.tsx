import { useState } from 'react';
import { Root } from './shared';

/** Singular values of a 2×2 matrix [[a, b], [c, d]]: square roots of the eigenvalues of AᵀA. */
export function singularValues(a: number, b: number, c: number, d: number): [number, number] {
  // AᵀA = [[a²+c², ab+cd], [ab+cd, b²+d²]]
  const p = a * a + c * c;
  const q = a * b + c * d;
  const r = b * b + d * d;
  const tr = p + r;
  const det = p * r - q * q;
  const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
  const l1 = tr / 2 + disc;
  const l2 = Math.max(0, tr / 2 - disc);
  return [Math.sqrt(l1), Math.sqrt(l2)];
}

/**
 * Any matrix splits into stretches along perpendicular directions, the singular
 * values. Keeping only the largest one gives the best rank-1 approximation. The
 * error of that approximation is the second singular value.
 */
export default function SvdRank() {
  const [a, setA] = useState(3);
  const [b, setB] = useState(0);
  const [c, setC] = useState(0);
  const [d, setD] = useState(1);
  const [s1, s2] = singularValues(a, b, c, d);
  const energy = s1 * s1 + s2 * s2;
  const share = energy === 0 ? 0 : (s1 * s1) / energy;
  const scale = Math.max(s1, 1e-9);

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Singular values: how much a matrix stretches</p>
        <div className="viz-controls">
          {[
            ['a', a, setA],
            ['b', b, setB],
            ['c', c, setC],
            ['d', d, setD],
          ].map(([name, value, set]) => {
            const id = `svd-${String(name)}`;
            return (
              <label key={id} htmlFor={id}>
                {String(name)} <b className="num">{Number(value).toFixed(1)}</b>
                <input id={id} type="range" min={-3} max={3} step={0.1} value={Number(value)} onChange={(e) => (set as (v: number) => void)(Number(e.target.value))} />
              </label>
            );
          })}
        </div>
        <svg viewBox="0 0 360 150" className="dx-svg" role="img" aria-label={`Singular values ${s1.toFixed(2)} and ${s2.toFixed(2)}. Rank-one approximation keeps ${(share * 100).toFixed(0)} per cent of the energy.`}>
          <rect x="60" y={130 - (s1 / scale) * 110} width="60" height={(s1 / scale) * 110} className="dx-packet" />
          <text x="90" y="145" textAnchor="middle" className="dx-small">σ₁ {s1.toFixed(2)}</text>
          <rect x="220" y={130 - (s2 / scale) * 110} width="60" height={(s2 / scale) * 110} className="dx-curve" fill="none" />
          <text x="250" y="145" textAnchor="middle" className="dx-small">σ₂ {s2.toFixed(2)}</text>
        </svg>
        <p className="viz-cap" aria-live="polite">
          Matrix [[{a.toFixed(1)}, {b.toFixed(1)}], [{c.toFixed(1)}, {d.toFixed(1)}]]. Signs do not change the stretch sizes, only the directions.
          {' '}Keeping only σ₁ keeps <b className="num">{(share * 100).toFixed(1)}%</b> of the squared size. The rank-one error is σ₂ = <b className="num">{s2.toFixed(2)}</b>.
        </p>
      </div>
    </Root>
  );
}
