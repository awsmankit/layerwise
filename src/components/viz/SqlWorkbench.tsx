import { useMemo, useState } from 'react';
import { Root } from './shared';
import { guardSql, judge, runSql, type QueryResult, type Value } from '../../lib/mini-sql';
import { ALLOWED_TABLES, MAIN, QUESTIONS, VARIANT } from '../../lib/sql-workbench-data';

/*
 * Text-to-SQL workbench. Pick a question, pick a hand-written "model" query (or edit it), and see it run
 * against a tiny invented database next to the gold query. Three measures are shown side by side so the
 * learner can watch them disagree. All logic is in lib/mini-sql.ts; nothing leaves the browser.
 */

const DBS = [MAIN, VARIANT];

const show = (v: Value) => (v === null ? 'NULL' : typeof v === 'number' ? String(Math.round(v * 100) / 100) : v);

function Grid({ title, result, error }: { title: string; result?: QueryResult; error?: string }) {
  return (
    <div className="wlc-grid">
      <p className="wlc-grid-title">{title}</p>
      {error ? (
        <p className="wlc-err" role="status">Error: {error}</p>
      ) : result ? (
        <div className="wlc-scroll" tabIndex={0} role="region" aria-label={title}>
          <table>
            <thead>
              <tr>{result.columns.map((c, i) => <th key={i} scope="col">{c}</th>)}</tr>
            </thead>
            <tbody>
              {result.rows.slice(0, 8).map((r, i) => (
                <tr key={i}>{r.map((v, j) => <td key={j} className={typeof v === 'number' ? 'num' : undefined}>{show(v)}</td>)}</tr>
              ))}
              {result.rows.length === 0 && <tr><td colSpan={Math.max(1, result.columns.length)}>no rows</td></tr>}
            </tbody>
          </table>
          {result.rows.length > 8 && <p className="wlc-more">{result.rows.length - 8} more rows not shown</p>}
        </div>
      ) : null}
    </div>
  );
}

const Mark = ({ ok }: { ok: boolean }) => <span className={`wlc-mark ${ok ? 'is-yes' : 'is-no'}`}>{ok ? 'Yes' : 'No'}</span>;

export default function SqlWorkbench() {
  const [qi, setQi] = useState(0);
  const q = QUESTIONS[qi];
  const [candId, setCandId] = useState<string | null>(q.candidates[0].id);
  const [sql, setSql] = useState(q.candidates[0].sql);
  const cand = q.candidates.find((c) => c.id === candId) ?? null;

  const pickQuestion = (i: number) => {
    setQi(i);
    setCandId(QUESTIONS[i].candidates[0].id);
    setSql(QUESTIONS[i].candidates[0].sql);
  };
  const pickCandidate = (id: string) => {
    setCandId(id);
    setSql(q.candidates.find((c) => c.id === id)!.sql);
  };

  const gold = useMemo(() => runSql(MAIN, q.gold), [q]);
  const pred = useMemo(() => runSql(MAIN, sql), [sql]);
  const verdict = useMemo(() => judge(DBS, q.gold, sql), [q, sql]);
  const guard = useMemo(() => guardSql(sql, ALLOWED_TABLES, 100), [sql]);

  const board = useMemo(() => {
    const all = QUESTIONS.flatMap((qq) => qq.candidates.map((c) => judge(DBS, qq.gold, c.sql)));
    return { n: all.length, exact: all.filter((v) => v.exact).length, exec: all.filter((v) => v.execution).length, everywhere: all.filter((v) => v.everywhere).length };
  }, []);

  const second = verdict.perDb[1];

  return (
    <Root>
      <div className="viz wlc-bench">
        <p className="viz-title">Text-to-SQL workbench: run it, then judge it</p>
        <p className="wlc-note">The shop database and the model queries are invented for this lesson. The queries were written by hand to show typical mistakes; they are not output from a real model.</p>

        <div className="wlc-row" role="group" aria-label="Question">
          {QUESTIONS.map((x, i) => (
            <button key={x.id} type="button" className={`wlc-btn${i === qi ? ' is-on' : ''}`} aria-pressed={i === qi} onClick={() => pickQuestion(i)}>
              Question {i + 1}
            </button>
          ))}
        </div>
        <p className="wlc-q"><b>{q.text}</b></p>
        <p className="wlc-schema">Tables: customers(id, name, region, joined), products(id, name, category, price), orders(id, customer_id, product_id, qty, status, ordered_on).</p>

        <div className="wlc-row" role="group" aria-label="Model query to try">
          {q.candidates.map((c) => (
            <button key={c.id} type="button" className={`wlc-btn${c.id === candId ? ' is-on' : ''}`} aria-pressed={c.id === candId} onClick={() => pickCandidate(c.id)}>
              {c.label}
            </button>
          ))}
        </div>

        <label className="wlc-label" htmlFor="wlc-sql">Query to test (edit it if you like)</label>
        <textarea
          id="wlc-sql"
          className="wlc-sql"
          rows={4}
          spellCheck={false}
          value={sql}
          onChange={(e) => {
            setSql(e.target.value);
            setCandId(null);
          }}
        />
        <p className="wlc-gold"><span>Gold query</span><code>{q.gold}</code></p>

        <div className="wlc-grids">
          <Grid title="Gold result (main data)" result={gold.ok ? gold.result : undefined} error={gold.ok ? undefined : gold.error} />
          <Grid title="Your query's result (main data)" result={pred.ok ? pred.result : undefined} error={pred.ok ? undefined : pred.error} />
        </div>

        <ul className="wlc-verdicts" aria-live="polite">
          <li><span>Exact string match with the gold query</span><Mark ok={verdict.exact} /></li>
          <li><span>Same rows on the main data (execution match{gold.ok && gold.result.ordered ? ', order counts' : ', order ignored'})</span><Mark ok={verdict.execution} /></li>
          <li><span>Same rows on a second database with different data</span>{second.ran ? <Mark ok={second.match} /> : <span className="wlc-mark is-no">Did not run</span>}</li>
          <li><span>Passes the safety guard</span>{guard.ok ? <Mark ok /> : <Mark ok={false} />}</li>
        </ul>
        <p className="wlc-say" aria-live="polite">
          {cand ? cand.note : 'You edited the query, so there is no ready-made note. Compare the two result tables and the marks above.'}{' '}
          {guard.ok ? `Guard: ${guard.note}.` : `Guard: ${guard.reason}.`}
        </p>
        <p className="wlc-hint"><b>Hint for this question:</b> {q.hint}</p>

        <h4 className="wlc-h">All {board.n} hand-written queries, three ways to score them</h4>
        <ul className="wlc-board">
          <li><span>Exact string match accepts</span><b className="num">{board.exact} of {board.n}</b></li>
          <li><span>Execution match on the main data accepts</span><b className="num">{board.exec} of {board.n}</b></li>
          <li><span>Execution match on both databases accepts</span><b className="num">{board.everywhere} of {board.n}</b></li>
        </ul>
        <p className="viz-cap">
          Exact match rejects correct queries that are merely written differently. Execution on one database accepts a query that got lucky with the data. Checking on more than one database catches it. None of these can tell you whether the gold query itself matches what the person meant.
        </p>
      </div>
    </Root>
  );
}
