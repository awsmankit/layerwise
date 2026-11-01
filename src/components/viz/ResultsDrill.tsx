import { useState } from 'react';
import { Root } from './shared';
import { QUESTIONS, TABLE, TABLE_CAPTION, TABLE_FOOTNOTE } from '../../lib/paper-reading';

/*
 * Results-table drill on a made-up table (see lib/paper-reading.ts). Four questions about error bars, single runs,
 * baselines and test-set tuning.
 */

export default function ResultsDrill() {
  const [picked, setPicked] = useState<Record<string, number | undefined>>({});
  const correct = QUESTIONS.filter((q) => picked[q.id] === q.answer).length;
  const answered = QUESTIONS.filter((q) => picked[q.id] !== undefined).length;

  return (
    <Root>
      <div className="viz w5b-drill">
        <p className="viz-title">Read the results table</p>
        <p className="w5b-note">The table below is made up for this exercise. Every number and name is invented.</p>
        <div className="w5b-table-wrap">
          <table className="w5b-table">
            <caption>{TABLE_CAPTION}</caption>
            <thead>
              <tr>
                <th scope="col">Model</th>
                <th scope="col">Accuracy (%)</th>
                <th scope="col">Runs</th>
                <th scope="col">Parameters</th>
                <th scope="col">Tuned?</th>
              </tr>
            </thead>
            <tbody>
              {TABLE.map((r) => (
                <tr key={r.id}>
                  <th scope="row">{r.name}</th>
                  <td>{r.std === undefined ? r.mean.toFixed(1) : `${r.mean.toFixed(1)} ± ${r.std.toFixed(1)}`}</td>
                  <td>{r.runs}</td>
                  <td>{r.paramsM} M</td>
                  <td>{r.tuned ? 'yes' : 'no'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="w5b-small">{TABLE_FOOTNOTE}</p>

        <ol className="w5b-qs">
          {QUESTIONS.map((q) => {
            const p = picked[q.id];
            return (
              <li key={q.id} className="w5b-q">
                <fieldset className="w5b-fs">
                  <legend className="w5b-legend">{q.q}</legend>
                  <div className="w5b-optcol">
                    {q.options.map((o, i) => (
                      <label key={o} className={`w5b-opt w5b-opt-wide${p === i ? ' w5b-on' : ''}`}>
                        <input type="radio" name={`q-${q.id}`} checked={p === i} onChange={() => setPicked((c) => ({ ...c, [q.id]: i }))} />
                        <span>{o}</span>
                      </label>
                    ))}
                  </div>
                  <p className={`w5b-fb${p === undefined ? '' : p === q.answer ? ' w5b-fb-ok' : ' w5b-fb-no'}`} aria-live="polite">
                    {p === undefined ? '' : (
                      <>
                        <b>{p === q.answer ? 'Right. ' : `Not this one. The better answer is: ${q.options[q.answer]}. `}</b>
                        {q.why}
                      </>
                    )}
                  </p>
                </fieldset>
              </li>
            );
          })}
        </ol>
        <div className="w5b-result" role="status" aria-live="polite">
          <p>
            <b>
              {answered} of {QUESTIONS.length} answered, {correct} right.
            </b>{' '}
            The "clearly ahead" check here is a rule of thumb (the gap is bigger than the two ± values added together), not a proper significance test.
          </p>
        </div>
        <div className="w5b-actions">
          <button type="button" className="btn quiet" onClick={() => setPicked({})}>
            Start again
          </button>
        </div>
      </div>
    </Root>
  );
}
