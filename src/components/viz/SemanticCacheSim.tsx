import { useMemo, useState } from 'react';
import { Root } from './shared';
import { ANSWERS, EXAMPLE_PRICES, SWEEP, simulate, sweep } from '../../lib/semantic-cache';

const money = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toFixed(2)}`;
const pct = (n: number) => `${Math.round(n * 100)}%`;

const OUTCOME_TEXT = { miss: 'miss: model called', 'hit-right': 'hit: right answer', 'hit-wrong': 'hit: WRONG answer' } as const;

/**
 * Run a scripted stream of 40 support questions through a semantic cache. The embedding is a stand-in
 * (counts of three-letter chunks), the stream is invented and the prices are examples.
 */
export default function SemanticCacheSim() {
  const [threshold, setThreshold] = useState(0.85);
  const [scoped, setScoped] = useState(false);
  const [wrongCost, setWrongCost] = useState(EXAMPLE_PRICES.wrongAnswer);

  const prices = useMemo(() => ({ ...EXAMPLE_PRICES, wrongAnswer: wrongCost }), [wrongCost]);
  const r = useMemo(() => simulate(threshold, scoped, prices), [threshold, scoped, prices]);
  const sw = useMemo(() => sweep(scoped, prices), [scoped, prices]);
  const nearest = SWEEP.reduce((a, b) => (Math.abs(b - threshold) < Math.abs(a - threshold) ? b : a));
  const maxHits = Math.max(1, ...sw.map((s) => s.result.hits));

  return (
    <Root>
      <div className="viz wm wm-sc">
        <p className="viz-title">A semantic cache on 40 scripted questions</p>
        <div className="viz-controls wm-controls">
          <label className="field">
            <span>
              Similarity needed for a hit <b className="num">{threshold.toFixed(2)}</b>
            </span>
            <input type="range" min={0.5} max={1} step={0.01} value={threshold} onChange={(e) => setThreshold(+e.target.value)} />
          </label>
          <label className="field">
            <span>
              Cost of one wrong answer (example) <b className="num">${wrongCost.toFixed(2)}</b>
            </span>
            <input type="range" min={0} max={0.25} step={0.01} value={wrongCost} onChange={(e) => setWrongCost(+e.target.value)} />
          </label>
        </div>
        <div className="wm-chips" role="group" aria-label="Cache key">
          <button type="button" className="wm-chip" aria-pressed={!scoped} onClick={() => setScoped(false)}>
            One cache for both shops
          </button>
          <button type="button" className="wm-chip" aria-pressed={scoped} onClick={() => setScoped(true)}>
            Separate cache per shop
          </button>
        </div>

        <dl className="wm-stats">
          <div>
            <dt>Hit rate</dt>
            <dd className="num">{pct(r.hitRate)}</dd>
          </div>
          <div className={r.wrongHits > 0 ? 'is-bad' : ''}>
            <dt>Wrong answers served</dt>
            <dd className="num">
              {r.wrongHits} <small>of {r.hits} hits</small>
            </dd>
          </div>
          <div>
            <dt>Saved on model calls</dt>
            <dd className="num">{money(r.grossSaving)}</dd>
          </div>
          <div className={r.netSaving < 0 ? 'is-bad' : 'is-good'}>
            <dt>After wrong answers</dt>
            <dd className="num">{money(r.netSaving)}</dd>
          </div>
        </dl>
        <div className="wm-status" aria-live="polite">
          At a threshold of {threshold.toFixed(2)} the cache answered {r.hits} of {r.total} questions ({r.rightHits} correctly, {r.wrongHits} wrongly) and called the model {r.misses} times.
          {r.wrongHits === 0 ? ' Nothing wrong was served.' : ` ${r.wrongHits === 1 ? 'One user' : `${r.wrongHits} users`} received another question's answer.`} Net of the assumed cost of wrong answers, the saving is {money(r.netSaving)} on this stream.
        </div>

        <p className="wm-cap">Every threshold at once ({scoped ? 'separate cache per shop' : 'one cache for both shops'})</p>
        <ul className="wm-sweep" aria-label="Hits at each threshold">
          {sw.map(({ threshold: t, result }) => (
            <li key={t} className={t === nearest ? 'is-now' : ''}>
              <span className="wm-sweep-t num">{t.toFixed(2)}</span>
              <span className="wm-sweep-bar" aria-hidden="true">
                <span className="wm-sweep-right" style={{ width: `${(result.rightHits / maxHits) * 100}%` }} />
                <span className="wm-sweep-wrong" style={{ width: `${(result.wrongHits / maxHits) * 100}%` }} />
              </span>
              <span className="wm-sweep-n num">
                {result.rightHits} right{result.wrongHits > 0 ? `, ${result.wrongHits} wrong` : ''}
              </span>
            </li>
          ))}
        </ul>

        <p className="wm-cap">The stream, question by question</p>
        <div className="wm-log" tabIndex={0} role="region" aria-label="Question log">
          <ol>
            {r.steps.map((s) => (
              <li key={s.index} className={`wm-log-${s.outcome}`}>
                <span className="wm-log-q">
                  <span className="wm-tenant">{s.question.tenant}</span> {s.question.text}
                </span>
                <span className="wm-log-o">
                  {OUTCOME_TEXT[s.outcome]}
                  {s.outcome !== 'miss' && s.matchText && (
                    <small>
                      {' '}
                      matched &ldquo;{s.matchText}&rdquo; at {s.similarity.toFixed(2)}
                      {s.outcome === 'hit-wrong' && s.servedAnswer ? `; served: ${ANSWERS[s.servedAnswer]}` : ''}
                    </small>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <p className="viz-cap">
          The stream is invented, with many repeats (real traffic usually repeats less). The similarity is a stand-in: counts of three-letter chunks, not a real embedding model, so its scale will not match any real model's. Prices are examples: {money(EXAMPLE_PRICES.llmCall)} per model call, {`$${EXAMPLE_PRICES.lookup}`} per lookup.
        </p>
      </div>
    </Root>
  );
}
