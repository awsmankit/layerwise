import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { DIM_SHORT, DOCS, QUERIES, cosine, embed, rank, sharedWords, success, successCount } from '../../lib/whatif/no-embeddings';

/**
 * Five support pages, five ways people ask. Keyword search needs the same spelling; the toy meaning search
 * compares tiny hand-built word vectors. Rows re-sort by score when the switch or the question changes.
 */
export default function NoEmbeddingsWhatIf() {
  const [meaning, setMeaning] = useState(true);
  const [qi, setQi] = useState(0);
  const query = QUERIES[qi];
  const mode = meaning ? 'meaning' : 'keyword';
  const rows = useMemo(() => rank(query.text, mode), [query.text, mode]);
  const top = rows[0];
  const docText = (id: string) => DOCS.find((d) => d.id === id)!.text;
  const answerDoc = DOCS.find((d) => d.id === query.answer)!;
  const ok = success(query, mode);
  const shown = rows.filter((r) => r.hit).length;
  const kwCount = successCount('keyword');
  const mCount = successCount('meaning');

  const verdict = meaning ? (
    ok ? (
      <>
        You asked "{query.text}". The meaning search puts "{answerDoc.text.split(':')[0].split('.')[0]}" first, with a similarity of {top.score.toFixed(2)} out of 1
        {sharedWords(query.text, answerDoc.text).length === 0 ? ', even though the two share no words' : ''}. Right answer found.
      </>
    ) : (
      <>The meaning search did not return the right page for this question.</>
    )
  ) : ok ? (
    <>
      You asked "{query.text}". It shares {top.score} words with the right page, so keyword search finds it. It works when people reuse the page's exact words.
    </>
  ) : (
    <>
      You asked "{query.text}". No page uses those exact words, so keyword search returns {shown === 0 ? 'nothing' : 'the wrong page'}: the right answer is missing, even though it exists. Across all five example questions, keyword search finds {kwCount} and meaning search finds {mCount}.
    </>
  );

  const qv = embed(query.text);

  return (
    <WhatIfFrame
      title="One help centre, five different ways of asking"
      withLabel="With embeddings"
      withoutLabel="Without them"
      on={meaning}
      onChange={setMeaning}
      verdict={verdict}
      controls={
        <div className="wr-chips" role="group" aria-label="Pick what the user types">
          {QUERIES.map((q, i) => (
            <button key={q.id} type="button" className={'wr-chip' + (i === qi ? ' is-on' : '')} aria-pressed={i === qi} onClick={() => setQi(i)}>
              "{q.text}"
            </button>
          ))}
        </div>
      }
    >
      <p className="wr-lead">
        {meaning
          ? 'An embedding turns text into a list of numbers, so texts with similar meaning get similar numbers. Search then finds the closest numbers, not the same words.'
          : 'Without embeddings, search only checks whether the same words appear. "Cash" and "refund" are just different letters to it.'}
      </p>
      <ol className="wr-list" aria-label={`Results for ${query.text}, best first`}>
        {rows.map((r, i) => {
          const isAnswer = r.id === query.answer;
          const shared = sharedWords(query.text, docText(r.id));
          const width = meaning ? Math.max(0, r.score) : Math.min(1, r.score / 3);
          const state = isAnswer ? (r.hit ? 'is-good' : 'is-bad') : r.hit ? '' : 'is-dim';
          return (
            <motion.li key={r.id} layout transition={{ duration: 0.55, ease: EASE }} className={'wr-row ' + state}>
              <span className="wr-rank" aria-hidden="true">{r.hit ? i + 1 : '-'}</span>
              <div className="wr-body">
                <span className="wr-text">{docText(r.id)}</span>
                <span className="wr-bar" aria-hidden="true">
                  <motion.i initial={false} animate={{ width: `${Math.round(width * 100)}%` }} transition={{ duration: 0.5, ease: EASE }} />
                </span>
                <span className="wr-meta">
                  {meaning ? `similarity ${r.score.toFixed(2)}` : r.score === 0 ? 'shares no words' : `shares: ${shared.join(', ')}`}
                  {' · '}
                  {r.hit ? 'returned' : 'not returned'}
                  {isAnswer && (
                    <b className="wr-tag">{r.hit ? ' ✓ the right answer' : ' ✗ the right answer is missing'}</b>
                  )}
                </span>
              </div>
            </motion.li>
          );
        })}
      </ol>
      <p className="wr-note">
        Toy figures: the "meaning" side uses hand-built word vectors with five numbers per word. Real embeddings are learned from huge amounts of text and have hundreds or thousands of numbers.
      </p>
      <details className="wr-details">
        <summary>Open the numbers</summary>
        <div className="wr-scroll">
          <table className="wr-table">
            <caption>Toy vectors: each text is the sum of its words' vectors. Cosine similarity with the question is in the last column.</caption>
            <thead>
              <tr>
                <th scope="col">text</th>
                {DIM_SHORT.map((d) => (
                  <th scope="col" key={d}>{d}</th>
                ))}
                <th scope="col">cos</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">question</th>
                {qv.map((x, i) => (
                  <td key={i}>{x.toFixed(1)}</td>
                ))}
                <td>-</td>
              </tr>
              {DOCS.map((d) => {
                const v = embed(d.text);
                return (
                  <tr key={d.id}>
                    <th scope="row">{d.id}</th>
                    {v.map((x, i) => (
                      <td key={i}>{x.toFixed(1)}</td>
                    ))}
                    <td>{cosine(qv, v).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="wr-note">
          Meaning search returns a page only if cosine is at least 0.5 (an example setting). Keyword search counts exact shared words after dropping small words such as "the" and "my", and does not match "screen" with "screens".
        </p>
      </details>
    </WhatIfFrame>
  );
}
