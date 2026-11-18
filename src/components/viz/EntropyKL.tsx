import { useState } from 'react';
import { Root } from './shared';

/** Entropy in bits: the average surprise when outcomes follow p. */
export const entropyBits = (p: number[]) => -p.reduce((s, x) => (x > 0 ? s + x * Math.log2(x) : s), 0);

/** KL divergence in bits: the extra surprise from using q when the truth is p. Zero only when p equals q. */
export const klBits = (p: number[], q: number[]) => p.reduce((s, x, i) => (x > 0 ? s + x * Math.log2(x / q[i]) : s), 0);

/** Make three shares from two sliders: the first and second set the first two; the third is what is left. */
const shares = (a: number, b: number) => [a, b, 1 - a - b];

/**
 * Two distributions over three outcomes. The true one, p, is in orange and the
 * model's, q, is in blue. Entropy measures p's own uncertainty; KL measures how
 * much a model q costs when the truth is p.
 */
export default function EntropyKL() {
  const [pa, setPa] = useState(0.5);
  const [pb, setPb] = useState(0.25);
  const [qa, setQa] = useState(1 / 3);
  const [qb, setQb] = useState(1 / 3);
  const p = shares(pa, pb);
  const q = shares(qa, qb);
  const ok = p.every((x) => x >= 0) && q.every((x) => x >= 0);
  const H = entropyBits(p);
  const kl = ok ? klBits(p, q) : NaN;

  const bar = (vals: number[], cls: string, label: string, offset: number) => (
    <g>
      {vals.map((v, i) => (
        <rect key={`${label}-${i}`} x={30 + i * 110 + offset} y={130 - Math.max(0, v) * 110} width={34} height={Math.max(0, v) * 110} className={cls} />
      ))}
    </g>
  );

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Two guesses about three outcomes</p>
        <div className="viz-controls">
          <label htmlFor="ek-pa">True p, outcome A <b className="num">{pa.toFixed(2)}</b></label>
          <input id="ek-pa" type="range" min={0} max={1} step={0.01} value={pa} onChange={(e) => setPa(Number(e.target.value))} />
          <label htmlFor="ek-pb">True p, outcome B <b className="num">{pb.toFixed(2)}</b></label>
          <input id="ek-pb" type="range" min={0} max={1} step={0.01} value={pb} onChange={(e) => setPb(Number(e.target.value))} />
          <label htmlFor="ek-qa">Model q, outcome A <b className="num">{qa.toFixed(2)}</b></label>
          <input id="ek-qa" type="range" min={0} max={1} step={0.01} value={qa} onChange={(e) => setQa(Number(e.target.value))} />
          <label htmlFor="ek-qb">Model q, outcome B <b className="num">{qb.toFixed(2)}</b></label>
          <input id="ek-qb" type="range" min={0} max={1} step={0.01} value={qb} onChange={(e) => setQb(Number(e.target.value))} />
        </div>
        <svg viewBox="0 0 360 150" className="dx-svg" role="img" aria-label={`Bars for true p and model q over outcomes A, B and C`}>
          {bar(p, 'dx-packet', 'p', 0)}
          {bar(q, 'dx-curve', 'q', 40)}
          {['A', 'B', 'C'].map((name, i) => (
            <text key={name} x={47 + i * 110} y="146" textAnchor="middle" className="dx-small">{name}</text>
          ))}
        </svg>
        <p className="viz-cap" aria-live="polite">
          Filled bars: true p. Outlined bars: model q.{' '}
          {ok ? (
            <>
              Entropy of p (its own uncertainty): <b className="num">{H.toFixed(2)}</b> bits. KL(p ∥ q), the extra cost of using q: <b className="num">{kl.toFixed(3)}</b> bits.
            </>
          ) : (
            'The third share is negative. Lower the first two so all three are between 0 and 1.'
          )}
        </p>
      </div>
    </Root>
  );
}
