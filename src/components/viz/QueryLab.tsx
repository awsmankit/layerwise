import { useId, useMemo, useState } from 'react';
import { Root } from './shared';
import { QUESTIONS, STRATEGIES, SCORERS, grid, passageById, retrieve, searchFree, type Scorer } from '../../lib/query-lab';
import type { Strategy } from '../../lib/query-lab-data';

const KS = [1, 2, 3, 5];
const CUSTOM = 'custom';
const pct = (x: number) => Math.round(x * 100);

/**
 * Retrieval lab on a tiny invented help centre. The rewrites, paraphrases, sub-questions and hypothetical
 * answers are scripted stand-ins for what a model would write; the embedding scorer is a stand-in too.
 */
export default function QueryLab() {
  const [qid, setQid] = useState(QUESTIONS[0].id);
  const [custom, setCustom] = useState('where do I leave it when I am done');
  const [strategy, setStrategy] = useState<Strategy>('raw');
  const [scorer, setScorer] = useState<Scorer>('keyword');
  const [k, setK] = useState(2);
  const inputId = useId();

  const isCustom = qid === CUSTOM;
  const q = QUESTIONS.find((x) => x.id === qid) ?? QUESTIONS[0];
  const strat = isCustom ? 'raw' : strategy;

  const res = useMemo(() => (isCustom ? null : retrieve(q, strat, scorer, k)), [isCustom, q, strat, scorer, k]);
  const freeIds = useMemo(() => (isCustom ? searchFree(custom, scorer, k) : []), [isCustom, custom, scorer, k]);
  const g = useMemo(() => grid(scorer, k), [scorer, k]);

  const ids = isCustom ? freeIds : res!.ids;
  const queries = isCustom ? [custom] : res!.queries;
  const summary = isCustom
    ? `${ids.length} passages returned. There is no answer key for a typed question, so no recall is shown.`
    : `Recall at ${k}: ${q.gold.filter((x) => ids.includes(x)).length} of ${q.gold.length} right ${q.gold.length === 1 ? 'passage' : 'passages'} found, ${pct(res!.recall)} per cent.`;

  return (
    <Root>
      <div className="viz wla wla-ql">
        <p className="viz-title">Same question, different ways to ask the index</p>

        <div className="wla-row" role="group" aria-label="Question">
          <span className="wla-label">Question</span>
          {QUESTIONS.map((x) => (
            <button key={x.id} type="button" className="wla-chip" aria-pressed={qid === x.id} onClick={() => setQid(x.id)}>
              {x.label}
            </button>
          ))}
          <button type="button" className="wla-chip" aria-pressed={isCustom} onClick={() => setQid(CUSTOM)}>
            Type your own
          </button>
        </div>

        {isCustom ? (
          <div className="wla-ask">
            <label htmlFor={inputId} className="wla-cap">
              Your question (searched as typed, since only the five examples have scripted rewrites)
            </label>
            <input id={inputId} type="text" value={custom} maxLength={120} onChange={(e) => setCustom(e.target.value)} className="wla-input" />
          </div>
        ) : (
          <div className="wla-ask">
            {q.history && (
              <ul className="wla-chat" aria-label="Earlier in the conversation">
                {q.history.map((m, i) => (
                  <li key={i} className={m.who === 'user' ? 'is-user' : 'is-bot'}>
                    <span className="wla-who">{m.who === 'user' ? 'Person' : 'Assistant'}</span> {m.text}
                  </li>
                ))}
              </ul>
            )}
            <p className="wla-q">
              <span className="wla-who">Person</span> {q.question}
            </p>
          </div>
        )}

        <div className="wla-row" role="group" aria-label="Query strategy">
          <span className="wla-label">Strategy</span>
          {STRATEGIES.map((s) => (
            <button key={s.id} type="button" className="wla-chip" aria-pressed={strat === s.id} disabled={isCustom && s.id !== 'raw'} onClick={() => setStrategy(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="wla-row" role="group" aria-label="Search method">
          <span className="wla-label">Search</span>
          {SCORERS.map((s) => (
            <button key={s.id} type="button" className="wla-chip" aria-pressed={scorer === s.id} onClick={() => setScorer(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="wla-row" role="group" aria-label="How many passages to keep">
          <span className="wla-label">Keep top</span>
          {KS.map((n) => (
            <button key={n} type="button" className="wla-chip" aria-pressed={k === n} onClick={() => setK(n)}>
              {n}
            </button>
          ))}
        </div>

        <div className="wla-sent">
          <p className="wla-cap">
            What goes to the search
            {!isCustom && <> ({res!.llmCalls === 0 ? 'no extra model call' : '1 extra model call before searching'}; {queries.length} {queries.length === 1 ? 'search' : 'searches'})</>}
          </p>
          <ol className="wla-queries">
            {queries.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ol>
        </div>

        <div className="wla-res">
          <p className="wla-cap">Top {k} passages returned</p>
          {ids.length === 0 ? (
            <p className="wla-note">Nothing matched at all.</p>
          ) : (
            <ol className="wla-hits">
              {ids.map((id) => {
                const p = passageById(id);
                const right = !isCustom && q.gold.includes(id);
                return (
                  <li key={id} className={right ? 'is-right' : ''}>
                    <span className="wla-hit-t">{p.title}</span>
                    {!isCustom && <span className={`wla-badge${right ? ' is-right' : ''}`}>{right ? 'answers it' : 'not it'}</span>}
                    <span className="wla-hit-x">{p.text}</span>
                  </li>
                );
              })}
            </ol>
          )}
          <div className="wla-status" aria-live="polite">
            {summary}
            {!isCustom && ' Missed passages: ' + (q.gold.filter((x) => !ids.includes(x)).map((x) => passageById(x).title).join(', ') || 'none') + '.'}
          </div>
          {!isCustom && <p className="wla-hint">{q.note}</p>}
        </div>

        <div className="wla-sum">
          <p className="wla-cap">Recall at {k} (per cent of the right passages found), all five questions, {SCORERS.find((s) => s.id === scorer)!.label}</p>
          <table className="wla-table wla-grid">
            <thead>
              <tr>
                <th scope="col">Question</th>
                {STRATEGIES.map((s) => (
                  <th key={s.id} scope="col">
                    {s.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r) => (
                <tr key={r.id}>
                  <th scope="row">{QUESTIONS.find((x) => x.id === r.id)!.label}</th>
                  {r.cells.map((c, i) => (
                    <td key={i} className={`wla-cell${c === 1 ? ' is-full' : c === 0 ? ' is-zero' : ''}${r.id === qid && STRATEGIES[i].id === strat ? ' is-here' : ''}`}>
                      {pct(c)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="wla-mean">
                <th scope="row">Mean</th>
                {g.means.map((m, i) => (
                  <td key={i}>{pct(m)}</td>
                ))}
              </tr>
            </tbody>
          </table>
          <p className="viz-cap">
            An invented help centre of 18 short passages, five questions, and rewrites, paraphrases, sub-questions and hypothetical answers written by hand to stand in for a language model. The embedding scorer is also a stand-in: it groups words such as "dog" and "pet" by hand-made concepts. Treat the numbers as an illustration of the mechanisms, not a benchmark, and measure on your own questions.
          </p>
        </div>
      </div>
    </Root>
  );
}
