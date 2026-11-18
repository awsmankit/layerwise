import { useState } from 'react';
import { Root } from './shared';

/** Binomial probability: k successes in n tries, each with chance p. */
export const binomPmf = (k: number, n: number, p: number) => {
  let c = 1;
  for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i;
  return c * p ** k * (1 - p) ** (n - k);
};

/** Poisson probability: k events when the average rate is lambda. */
export const poissonPmf = (k: number, lam: number) => {
  let f = 1;
  for (let i = 2; i <= k; i++) f *= i;
  return (Math.exp(-lam) * lam ** k) / f;
};

const KMAX = 30;
const W = 360;
const H = 170;

/**
 * Two counting distributions. Binomial counts successes in n tries with chance p.
 * Poisson counts events in a fixed time when the average rate is λ. Each bar is
 * the chance of exactly k outcomes.
 */
export default function DistributionBars() {
  const [kind, setKind] = useState<'binomial' | 'poisson'>('binomial');
  const [n, setN] = useState(10);
  const [p, setP] = useState(0.3);
  const [lam, setLam] = useState(4);

  const pmf = (k: number) => (kind === 'binomial' ? binomPmf(k, n, p) : poissonPmf(k, lam));
  const top = kind === 'binomial' ? n : KMAX;
  const values = Array.from({ length: top + 1 }, (_, k) => pmf(k));
  const max = Math.max(...values, 1e-9);
  const mean = kind === 'binomial' ? n * p : lam;
  const variance = kind === 'binomial' ? n * p * (1 - p) : lam;
  const barW = Math.min(16, (W - 40) / (top + 1));

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Counting distributions</p>
        <div className="viz-controls">
          <label htmlFor="db-kind">Distribution</label>
          <select id="db-kind" value={kind} onChange={(e) => setKind(e.target.value as 'binomial' | 'poisson')}>
            <option value="binomial">Binomial (successes in n tries)</option>
            <option value="poisson">Poisson (events at rate λ)</option>
          </select>
          {kind === 'binomial' ? (
            <>
              <label htmlFor="db-n">Tries n <b className="num">{n}</b></label>
              <input id="db-n" type="range" min={1} max={30} step={1} value={n} onChange={(e) => setN(Number(e.target.value))} />
              <label htmlFor="db-p">Chance p <b className="num">{p.toFixed(2)}</b></label>
              <input id="db-p" type="range" min={0} max={1} step={0.01} value={p} onChange={(e) => setP(Number(e.target.value))} />
            </>
          ) : (
            <>
              <label htmlFor="db-l">Rate λ <b className="num">{lam.toFixed(1)}</b></label>
              <input id="db-l" type="range" min={0.5} max={15} step={0.5} value={lam} onChange={(e) => setLam(Number(e.target.value))} />
            </>
          )}
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="dx-svg" role="img" aria-label={`${kind} distribution, mean ${mean.toFixed(2)}, variance ${variance.toFixed(2)}`}>
          {values.map((v, k) => (
            <rect key={k} x={24 + k * (barW + 1)} y={H - 20 - (v / max) * (H - 40)} width={barW} height={(v / max) * (H - 40)} className="dx-curve" fill="none" />
          ))}
        </svg>
        <p className="viz-cap" aria-live="polite">
          Mean <b className="num">{mean.toFixed(2)}</b>, variance <b className="num">{variance.toFixed(2)}</b>.
          {' '}{kind === 'binomial' ? 'Binomial: mean n·p, variance n·p·(1−p).' : 'Poisson: the mean and the variance are both λ.'}
        </p>
      </div>
    </Root>
  );
}
