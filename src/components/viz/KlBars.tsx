import { useState } from 'react';
import { Root } from './shared';
import { KL_MODELS, NEXT_TOKENS, TRUTH, crossEntropy, entropy, kl } from '../../lib/lm-loss';

const fmt = (x: number) => (Math.abs(x - Math.round(x * 1000) / 1000) < 1e-9 ? String(Math.round(x * 1000) / 1000) : x.toFixed(3));

export default function KlBars() {
  const [id, setId] = useState('flat');
  const m = KL_MODELS.find((x) => x.id === id)!;
  const hp = entropy(TRUTH);
  const hpq = crossEntropy(TRUTH, m.q);
  const d = kl(TRUTH, m.q);
  const summary = `The data's own entropy is ${hp.toFixed(2)} bits. This model's cross-entropy is ${hpq.toFixed(2)} bits. The difference, the KL divergence, is ${d.toFixed(2)} bits.`;

  return (
    <Root>
      <div className="viz wb wb-kl">
        <p className="viz-title">Using the wrong distribution costs bits</p>
        <p className="wb-note">
          After "The cat sat on the ..." suppose the true chances are as in the top bars. Pick a model and see how many extra bits per word it pays for believing something else.
        </p>
        <div className="wb-row" role="group" aria-label="Model">
          <span className="wb-label">Model</span>
          {KL_MODELS.map((x) => (
            <button key={x.id} type="button" className="wb-chip" aria-pressed={id === x.id} onClick={() => setId(x.id)}>
              {x.label}
            </button>
          ))}
        </div>

        <ul className="wb-bars">
          {NEXT_TOKENS.map((t, i) => (
            <li key={t} className="wb-bar-row">
              <span className="wb-bar-name">{t}</span>
              <span className="wb-bar-pair">
                <span className="wb-bar-track">
                  <span className="wb-bar-fill wb-bar-truth" style={{ width: `${TRUTH[i] * 100}%` }} />
                </span>
                <span className="wb-bar-track">
                  <span className="wb-bar-fill wb-bar-model" style={{ width: `${m.q[i] * 100}%` }} />
                </span>
              </span>
              <span className="wb-bar-num num">
                {fmt(TRUTH[i])} vs {fmt(m.q[i])}
              </span>
            </li>
          ))}
        </ul>
        <p className="wb-key" aria-hidden="true">
          <i className="wb-k wb-k-real" /> true chance &nbsp; <i className="wb-k wb-k-fake" /> the model's belief
        </p>

        <div className="wb-calc" aria-live="polite">
          <span className="sr-only">{summary}</span>
          <p aria-hidden="true">
            Entropy of the truth, H(p): <b>{hp.toFixed(2)}</b> bits. The best any model can average.
          </p>
          <p aria-hidden="true">
            Cross-entropy of this model, H(p, q): <b>{hpq.toFixed(2)}</b> bits.
          </p>
          <p aria-hidden="true">
            KL divergence = {hpq.toFixed(2)} - {hp.toFixed(2)} = <b>{d.toFixed(2)}</b> bits of waste per word.
          </p>
        </div>

        <p className="viz-cap">
          Probabilities are made-up example numbers. Cross-entropy is -sum of p times log2 q over the four words; entropy is the same with q replaced by p. KL is never negative and is zero only when the model's belief matches the truth. It is not symmetric: swapping the two gives a different number.
        </p>
      </div>
    </Root>
  );
}
