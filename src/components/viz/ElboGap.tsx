import { useState } from 'react';
import { Root } from './shared';

/*
 * One hidden variable z ∈ {0, 1} with a prior of 0.5 each. The observed data x
 * has likelihood 0.8 under z = 0 and 0.2 under z = 1. So p(x, z) = [0.4, 0.1]
 * and p(x) = 0.5. The true posterior p(z | x) is [0.8, 0.2].
 */
const JOINT = [0.4, 0.1];
const EVIDENCE = JOINT[0] + JOINT[1];

/** Evidence lower bound for an approximation q = [q0, 1 − q0]: the expected log of joint over q. */
export const elbo = (q0: number) => {
  const q = [q0, 1 - q0];
  return q.reduce((s, qi, i) => (qi > 0 ? s + qi * Math.log(JOINT[i] / qi) : s), 0);
};

/**
 * Variational inference: the true posterior is hard to compute, so we pick a
 * simpler guess q and maximise the ELBO. The ELBO is always at most log p(x),
 * and the gap between them is the KL divergence from q to the true posterior.
 */
export default function ElboGap() {
  const [q0, setQ0] = useState(0.5);
  const value = elbo(q0);
  const target = Math.log(EVIDENCE);
  const gap = target - value;

  return (
    <Root>
      <div className="viz dx">
        <p className="viz-title">Guessing the hidden state</p>
        <div className="viz-controls">
          <label htmlFor="elbo-q">
            Guess q(z = 0) <b className="num">{q0.toFixed(2)}</b>
          </label>
          <input id="elbo-q" type="range" min={0.01} max={0.99} step={0.01} value={q0} onChange={(e) => setQ0(Number(e.target.value))} />
        </div>
        <svg viewBox="0 0 360 120" className="dx-svg" role="img" aria-label={`ELBO ${value.toFixed(3)} against log evidence ${target.toFixed(3)}; gap ${gap.toFixed(3)}`}>
          <line x1="20" y1="60" x2="340" y2="60" className="dx-link" />
          <circle cx={20 + Math.min(1, Math.max(0, (value + 2.5) / 2.5)) * 320} cy="60" r="6" className="dx-packet" />
          <circle cx={20 + Math.min(1, Math.max(0, (target + 2.5) / 2.5)) * 320} cy="60" r="6" className="dx-curve" fill="none" />
          <text x="20" y="100" className="dx-small">ELBO {value.toFixed(3)}</text>
          <text x="200" y="100" className="dx-small">log p(x) {target.toFixed(3)}</text>
        </svg>
        <p className="viz-cap" aria-live="polite">
          ELBO <b className="num">{value.toFixed(3)}</b> is at most log p(x) = <b className="num">{target.toFixed(3)}</b>. The gap, which is the KL divergence from q to the true posterior, is <b className="num">{gap.toFixed(3)}</b>. It is zero when q0 = 0.80.
        </p>
      </div>
    </Root>
  );
}
