import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE, fmt } from '../viz/shared';
import { callCost, example, firstWrong, run, similarity, STREAM_LENGTH, summarise, sweep, thresholds, type Kind } from '../../lib/whatif/no-semantic-cache';

const COLS = 10;
const CW = 32;
const CH = 26;
const GAP = 4;
const X0 = 12;
const ROWS = STREAM_LENGTH / COLS;
const GRID_H = ROWS * (CH + GAP) - GAP;

const pct = (n: number) => `${Math.round(n * 100)}%`;

/**
 * 60 questions arrive one after another. Each square is one question: paid model call, right answer from the cache,
 * or wrong answer from the cache. Below it, the same cache at every threshold.
 */
export default function NoSemanticCacheWhatIf() {
  const [cache, setCache] = useState(true);
  const [kind, setKind] = useState<Exclude<Kind, 'none'>>('similar');
  const [ti, setTi] = useState(thresholds.indexOf(0.5));
  const threshold = thresholds[ti];

  const active: Kind = cache ? kind : 'none';
  const steps = useMemo(() => run(active, threshold), [active, threshold]);
  const sum = useMemo(() => summarise(active, steps), [active, steps]);
  const none = useMemo(() => summarise('none', run('none', 1)), []);
  const exact = useMemo(() => summarise('exact', run('exact', 1)), []);
  const sim = useMemo(() => summarise('similar', run('similar', threshold)), [threshold]);
  const curve = useMemo(() => sweep(), []);
  const bad = firstWrong(steps);
  const maxWrong = Math.max(1, ...curve.map((p) => p.wrong));

  // sweep chart geometry
  const cx0 = 46;
  const cw = 318;
  const px = (i: number) => Math.round((cx0 + (i / (thresholds.length - 1)) * cw) * 10) / 10;
  const hitY = (v: number) => Math.round((100 - v * 56) * 10) / 10;
  const barBase = 192;
  const gridBottom = 12 + GRID_H;
  const legendY = gridBottom + 18;
  const chartTop = legendY + 64;
  const H = chartTop + 236;
  const cursorX = px(ti);

  const verdict =
    active === 'none' ? (
      <>
        With no cache all {sum.total} questions go to the model: {fmt.usd(sum.cost)} and {fmt.ms(sum.avgMs)} each, even for the same question twice (example prices and times).
      </>
    ) : active === 'exact' ? (
      <>
        An exact-match cache answers {sum.hits} of {sum.total} ({pct(sum.hitRate)}) and saves {fmt.usd(sum.costSaved)} and {fmt.ms(sum.msSaved)} per question. It is never wrong, but a rephrased question misses (example prices and times).
      </>
    ) : (
      <>
        A similarity cache at {threshold.toFixed(2)} answers {sum.hits + sum.wrong} of {sum.total} ({pct(sum.hitRate)}) and saves {fmt.usd(sum.costSaved)}, but {sum.wrong} of those answers {sum.wrong === 1 ? 'is' : 'are'} wrong.
        {sum.wrong === 0 ? ' None are wrong at this setting: the price is fewer hits.' : ' Loosen the threshold more and it gets worse.'}
      </>
    );

  return (
    <WhatIfFrame
      title="60 questions in a row, with and without a cache"
      withLabel="With a cache"
      withoutLabel="No cache"
      on={cache}
      onChange={setCache}
      verdict={verdict}
      controls={
        <>
          <div className="ws-seg" role="group" aria-label="Kind of cache">
            <button type="button" className={`ws-opt${kind === 'exact' ? ' is-on' : ''}`} aria-pressed={kind === 'exact'} disabled={!cache} onClick={() => setKind('exact')}>
              Same words only
            </button>
            <button type="button" className={`ws-opt${kind === 'similar' ? ' is-on' : ''}`} aria-pressed={kind === 'similar'} disabled={!cache} onClick={() => setKind('similar')}>
              Similar questions
            </button>
          </div>
          <label className="field">
            <span>
              Similarity needed to reuse an answer <b>{cache && kind === 'similar' ? threshold.toFixed(2) : 'not used'}</b>
            </span>
            <input
              type="range"
              min={0}
              max={thresholds.length - 1}
              step={1}
              value={ti}
              disabled={!cache || kind !== 'similar'}
              onChange={(e) => setTi(+e.target.value)}
              aria-label="Similarity threshold: how alike two questions must be before the stored answer is reused"
              aria-valuetext={`${threshold.toFixed(2)} out of 1`}
            />
          </label>
        </>
      }
    >
      <p className="ws-idea">
        People ask the same things again and again, in slightly different words. A cache keeps old answers so the model does not have to answer twice. But a cache that is too keen to reuse an answer will hand someone the answer to a different question.
      </p>
      <svg
        viewBox={`0 0 380 ${H}`}
        className="dx-svg wi-svg ws-fig"
        role="img"
        aria-label={`60 questions. ${sum.modelCalls} went to the model, ${sum.hits} were answered correctly from the cache and ${sum.wrong} were answered with the wrong stored answer. Below, the hit rate and the wrong answers at each threshold.`}
      >
        <text x={X0} y={10} className="ws-svg-h">
          Each square is one question, in order
        </text>
        <g transform="translate(0 16)">
          {steps.map((s, i) => {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const cls = s.outcome === 'model' ? 'ws-c-big' : s.outcome === 'hit' ? 'ws-c-small' : 'ws-c-bad';
            const mark = s.outcome === 'model' ? 'M' : s.outcome === 'hit' ? '✓' : '✗';
            const x = X0 + col * (CW + GAP);
            const y = row * (CH + GAP);
            return (
              <motion.g key={`${i}-${s.outcome}`} initial={{ opacity: 0.2 }} animate={{ opacity: 1 }} transition={{ duration: 0.35, ease: EASE, delay: (i % COLS) * 0.02 + row * 0.02 }}>
                <rect x={x} y={y} width={CW} height={CH} rx={5} className={cls} />
                <text x={x + CW / 2} y={y + CH / 2 + 4.5} textAnchor="middle" className={`ws-cell-t${s.outcome === 'model' ? ' on-big' : ''}`} style={{ fontSize: 13 }}>
                  {mark}
                </text>
              </motion.g>
            );
          })}
        </g>
        <text x={X0} y={legendY + 12} className="ws-legend-t" style={{ fontSize: 13 }}>
          M paid model call: {sum.modelCalls}
        </text>
        <text x={X0} y={legendY + 30} className="ws-legend-t" style={{ fontSize: 13 }}>
          {'✓'} right answer from the cache: {sum.hits}
        </text>
        <text x={X0} y={legendY + 48} className="ws-legend-t" style={{ fontSize: 13 }}>
          {'✗'} wrong answer from the cache: {sum.wrong}
        </text>

        <g transform={`translate(0 ${chartTop})`}>
          <text x={X0} y={10} className="ws-svg-h">
            The same cache at every threshold
          </text>
          <text x={X0} y={28} className="ws-svg-t">
            Share of questions answered from the cache
          </text>
          <line x1={cx0} x2={cx0 + cw} y1={hitY(0)} y2={hitY(0)} className="ws-grid" />
          <line x1={cx0} x2={cx0 + cw} y1={hitY(1)} y2={hitY(1)} className="ws-grid" />
          <text x={cx0 - 6} y={hitY(1) + 4} textAnchor="end" className="ws-svg-t">
            100%
          </text>
          <text x={cx0 - 6} y={hitY(0) + 4} textAnchor="end" className="ws-svg-t">
            0%
          </text>
          <polyline fill="none" className="ws-hitline" points={curve.map((p, i) => `${px(i)},${hitY(p.hitRate)}`).join(' ')} />
          {curve.map((p, i) => (
            <circle key={p.threshold} cx={px(i)} cy={hitY(p.hitRate)} r={2.5} className="ws-good" />
          ))}
          <text x={X0} y={130} className="ws-svg-t">
            Wrong answers (out of 60)
          </text>
          <line x1={cx0} x2={cx0 + cw} y1={barBase} y2={barBase} className="ws-grid" />
          {curve.map((p, i) => {
            const h = Math.round((p.wrong / maxWrong) * 40 * 10) / 10;
            return (
              <g key={p.threshold}>
                <rect x={px(i) - 7} y={barBase - h} width={14} height={h} rx={2} className="ws-bad" />
                {p.wrong > 0 && (
                  <text x={px(i)} y={barBase - h - 4} textAnchor="middle" className="ws-svg-t" style={{ fontSize: 12 }}>
                    {p.wrong}
                  </text>
                )}
              </g>
            );
          })}
          {[0, 4, 8, 12, 14].map((i) => (
            <text key={i} x={px(i)} y={barBase + 15} textAnchor="middle" className="ws-svg-t" style={{ fontSize: 12 }}>
              {thresholds[i].toFixed(2)}
            </text>
          ))}
          <text x={cx0 + cw / 2} y={barBase + 31} textAnchor="middle" className="ws-svg-t">
            similarity needed (loose, left; strict, right)
          </text>
          {cache && kind === 'similar' && (
            <motion.line y1={hitY(1) - 8} y2={barBase} className="ws-now" initial={false} animate={{ x1: cursorX, x2: cursorX }} transition={{ duration: 0.3, ease: EASE }} />
          )}
        </g>
      </svg>

      <div className="ws-stats" role="group" aria-label="Results for this setting">
        <div>
          <b>{sum.modelCalls}</b>
          <span>model calls</span>
        </div>
        <div>
          <b>{pct(sum.hitRate)}</b>
          <span>answered from cache</span>
        </div>
        <div>
          <b className={sum.wrong > 0 ? 'ws-bad-t' : ''}>{sum.wrong}</b>
          <span>wrong answers</span>
        </div>
        <div>
          <b>{fmt.usd(sum.cost)}</b>
          <span>cost of 60 (example)</span>
        </div>
        <div>
          <b>{fmt.ms(sum.avgMs)}</b>
          <span>average wait (example)</span>
        </div>
      </div>

      {active === 'similar' && (
        <p className="ws-callout" aria-live="polite">
          {bad ? (
            <>
              <b>A wrong hit.</b> Someone asked {'“'}{bad.asked}{'”'} and was given the stored answer to {'“'}{bad.from}{'”'}. The two share enough words (similarity {bad.sim.toFixed(2)}, at or above {threshold.toFixed(2)}), but they want different answers.
            </>
          ) : (
            <>
              <b>No wrong hits at {threshold.toFixed(2)}.</b> Slide the threshold down toward 0.30 and watch look-alike questions such as {'“'}cancel my order{'”'} and {'“'}track my order{'”'} start to share answers.
            </>
          )}
        </p>
      )}

      <p className="ws-note">
        Toy data: 60 questions drawn in a fixed order from a bank of {11} topics, each asked several ways. Similarity is word overlap, a crude stand-in for an embedding; real caches use embeddings and still need a threshold. Example numbers, not a quote: each model call is {example.inputTokens} input and {example.outputTokens} output tokens at ${example.inPrice} and ${example.outPrice} per million ({fmt.usd(callCost())} a call) and takes {fmt.ms(example.modelMs)}; a cache lookup takes {example.lookupMs} ms.
      </p>
      <details className="ws-numbers">
        <summary>Open the numbers</summary>
        <div className="ws-tablewrap">
          <table className="ws-table">
            <thead>
              <tr>
                <th>Set-up</th>
                <th>Hits</th>
                <th>Wrong</th>
                <th>Cost</th>
                <th>Wait</th>
              </tr>
            </thead>
            <tbody>
              <tr className={active === 'none' ? 'is-now' : ''}>
                <td>No cache</td>
                <td>0%</td>
                <td>0</td>
                <td>{fmt.usd(none.cost)}</td>
                <td>{fmt.ms(none.avgMs)}</td>
              </tr>
              <tr className={active === 'exact' ? 'is-now' : ''}>
                <td>Same words only</td>
                <td>{pct(exact.hitRate)}</td>
                <td>{exact.wrong}</td>
                <td>{fmt.usd(exact.cost)}</td>
                <td>{fmt.ms(exact.avgMs)}</td>
              </tr>
              <tr className={active === 'similar' ? 'is-now' : ''}>
                <td>Similar at {threshold.toFixed(2)}</td>
                <td>{pct(sim.hitRate)}</td>
                <td>{sim.wrong}</td>
                <td>{fmt.usd(sim.cost)}</td>
                <td>{fmt.ms(sim.avgMs)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="ws-note">
          A question is a hit when its closest stored question is at least as similar as the threshold; it is a wrong hit when that stored question has a different right answer. Similarity = shared words / all words, after dropping filler such as {'“'}how{'”'}, {'“'}do{'”'}, {'“'}my{'”'}. For example {'“'}cancel my order{'”'} and {'“'}track my order{'”'} share 1 of 3 words (0.33), and the Paris and Tokyo weather questions share 2 of 4 (0.50): both look alike, neither should share an answer ({similarity('How do I cancel my order?', 'How do I track my order?').toFixed(2)}, {similarity('What is the weather in Paris today?', 'What is the weather in Tokyo today?').toFixed(2)}). A model call costs ({example.inputTokens} x {example.inPrice} + {example.outputTokens} x {example.outPrice}) / 1,000,000 = {fmt.usd(callCost())}. Average wait = (misses x (model + lookup) + hits x lookup) / 60.
        </p>
      </details>
    </WhatIfFrame>
  );
}
