import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import {
  DOCS,
  DIMS,
  QUERIES,
  RRF_K,
  answerRank,
  embed,
  firstCount,
  hybridList,
  keywordList,
  rankOf,
  shortTitle,
  vectorList,
  type Ranked,
} from '../../lib/whatif/no-hybrid-search';

const SHOW = 3;

/** A short ranked list. The right page is always visible: in the top rows, or added below with its real rank, or marked missing. */
function Block({ title, sub, list, answer, none }: { title: string; sub: string; list: Ranked[]; answer: string; none: string }) {
  const top = list.slice(0, SHOW);
  const at = rankOf(list, answer);
  const extra = at !== null && at > SHOW ? list[at - 1] : null;
  const max = Math.max(...list.map((r) => r.score), 1e-9);
  const row = (r: Ranked) => {
    const good = r.id === answer;
    return (
      <li key={r.id} className={'wr-row wr-compact ' + (good ? (r.rank === 1 ? 'is-good' : 'is-bad') : '')}>
        <span className="wr-rank" aria-hidden="true">{r.rank}</span>
        <div className="wr-body">
          <span className="wr-text">{shortTitle(r.id)}{good && <b className="wr-tag">{r.rank === 1 ? ' ✓ the right page' : ` ✗ the right page, but only at rank ${r.rank}`}</b>}</span>
          <span className="wr-bar" aria-hidden="true"><i style={{ width: `${Math.round((r.score / max) * 100)}%` }} /></span>
          <span className="wr-meta">score {r.score.toFixed(2)}</span>
        </div>
      </li>
    );
  };
  return (
    <section className="wr-col" aria-label={title}>
      <h4 className="wr-card-h">{title}</h4>
      <p className="wr-meta">{sub}</p>
      <ol className="wr-list">
        {top.length === 0 && (
          <li className="wr-row wr-compact is-dim"><span className="wr-meta">{none}</span></li>
        )}
        {top.map(row)}
        {extra && (
          <>
            <li className="wr-gap" aria-hidden="true">...</li>
            {row(extra)}
          </>
        )}
        {at === null && top.length > 0 && (
          <li className="wr-row wr-compact is-bad"><span className="wr-text"><b className="wr-tag">✗ The right page is not in this list.</b></span></li>
        )}
        {at === null && top.length === 0 && (
          <li className="wr-row wr-compact is-bad"><span className="wr-text"><b className="wr-tag">✗ The right page is missing.</b></span></li>
        )}
      </ol>
    </section>
  );
}

/**
 * One question, three ranked lists: keyword search, vector search, and the two fused by reciprocal rank fusion.
 * The switch turns the keyword half off, leaving vectors alone.
 */
export default function NoHybridSearchWhatIf() {
  const [hybrid, setHybrid] = useState(true);
  const [qi, setQi] = useState(0);
  const [k, setK] = useState(RRF_K);
  const q = QUERIES[qi];
  const answer = DOCS.find((d) => d.id === q.answer)!;

  const kw = useMemo(() => keywordList(q.text), [q.text]);
  const vec = useMemo(() => vectorList(q.text), [q.text]);
  const fused = useMemo(() => hybridList(q.text, k), [q.text, k]);
  const rk = rankOf(kw, q.answer);
  const rv = rankOf(vec, q.answer);
  const rh = rankOf(fused, q.answer);
  const topFused = fused.slice(0, SHOW);
  const fusedAnswer = fused.find((f) => f.id === q.answer);
  const maxFused = fused[0].score;

  const nKw = firstCount('keyword', k);
  const nVec = firstCount('vector', k);
  const nHyb = firstCount('hybrid', k);
  const saved = QUERIES.filter((x) => answerRank(x, 'vector') !== 1 && answerRank(x, 'keyword') === 1).length;

  const where = (r: number | null) => (r === null ? 'is not in the list at all' : `is at rank ${r}`);
  const verdict = hybrid ? (
    <>
      For "{q.text}" ({q.note}): keyword search {where(rk)}, vector search {where(rv)}, and fusing both puts it at rank {rh}. Over all five example questions the right page comes first {nHyb} times with both, but only {nKw} with keywords alone and {nVec} with vectors alone.
    </>
  ) : (
    <>
      For "{q.text}" ({q.note}): with vectors only, the right page {where(rv)}. Over all five example questions it comes first just {nVec} times. Keyword search would have put the right page first for {saved} of the {QUERIES.length - nVec} it misses, but it is switched off.
    </>
  );

  const qv = embed(q.text);

  return (
    <WhatIfFrame
      title="Twelve support pages, five ways of asking"
      withLabel="Keywords + vectors"
      withoutLabel="Vectors only"
      on={hybrid}
      onChange={setHybrid}
      verdict={verdict}
      controls={
        <>
          <div className="wr-chips" role="group" aria-label="Pick what the user types">
            {QUERIES.map((x, i) => (
              <button key={x.id} type="button" className={'wr-chip' + (i === qi ? ' is-on' : '')} aria-pressed={i === qi} onClick={() => setQi(i)}>
                "{x.text}"
              </button>
            ))}
          </div>
          {hybrid && (
            <label className="field">
              <span>RRF constant k: <b>{k}</b></span>
              <input type="range" min={1} max={100} value={k} onChange={(e) => setK(+e.target.value)} aria-label="Reciprocal rank fusion constant k" />
            </label>
          )}
        </>
      }
    >
      <p className="wr-lead">
        The right page for this question is: <b>"{answer.text}"</b>
      </p>
      <div className={'wr-cols' + (hybrid ? ' is-three' : '')}>
        {hybrid && (
          <Block
            title="1. Keyword search"
            sub="Word matching (BM25). Only pages that share a word are returned."
            list={kw}
            answer={q.answer}
            none="No page shares a word with this question, so nothing is returned."
          />
        )}
        <Block
          title={hybrid ? '2. Vector search' : 'Vector search (the only search)'}
          sub="Meaning only. It ranks every page, even bad ones."
          list={vec}
          answer={q.answer}
          none="Nothing."
        />
        {hybrid && (
          <section className="wr-col" aria-label="3. Fused with reciprocal rank fusion">
            <h4 className="wr-card-h">3. Fused (RRF, k = {k})</h4>
            <p className="wr-meta">Each page scores 1 / (k + rank) in every list that holds it, and the scores are added.</p>
            <ol className="wr-list">
              {topFused.map((f) => {
                const good = f.id === q.answer;
                return (
                  <motion.li key={f.id} layout transition={{ duration: 0.6, ease: EASE }} className={'wr-row wr-compact ' + (good ? (f.rank === 1 ? 'is-good' : 'is-bad') : '')}>
                    <span className="wr-rank" aria-hidden="true">{f.rank}</span>
                    <div className="wr-body">
                      <span className="wr-text">{shortTitle(f.id)}{good && <b className="wr-tag">{f.rank === 1 ? ' ✓ the right page' : ` ✗ the right page, but only at rank ${f.rank}`}</b>}</span>
                      <span className="wr-bar" aria-hidden="true">
                        <motion.i initial={false} animate={{ width: `${Math.round((f.score / maxFused) * 100)}%` }} transition={{ duration: 0.5, ease: EASE }} />
                      </span>
                      <span className="wr-meta">
                        {f.fromKeyword !== null ? `1/(${k}+${f.fromKeyword})` : 'no keyword hit'}
                        {' + '}
                        {f.fromVector !== null ? `1/(${k}+${f.fromVector})` : 'not in vectors'}
                        {' = '}
                        {f.score.toFixed(4)}
                      </span>
                    </div>
                  </motion.li>
                );
              })}
              {fusedAnswer && fusedAnswer.rank > SHOW && (
                <li className="wr-row wr-compact is-bad"><span className="wr-text"><b className="wr-tag">✗ The right page is at rank {fusedAnswer.rank}.</b></span></li>
              )}
            </ol>
          </section>
        )}
      </div>
      <p className="wr-note">
        Toy figures on twelve made-up pages. The vector side is a hand-built table with six topic numbers per word: it knows "refused" means "declined", but every code or hyphenated name falls into one shared slot, so it cannot tell E-4012 from E-4021. Real embeddings blur codes in the same way, only less perfectly. Ties are broken by page order.
      </p>
      <details className="wr-details">
        <summary>Open the numbers</summary>
        <div className="wr-scroll">
          <table className="wr-table">
            <caption>
              Question vector (topic numbers): {DIMS.map((d, i) => `${d} ${qv[i].toFixed(1)}`).join(', ')}. Right page at rank {answerRank(q, 'keyword') ?? 'none'} (keyword), {answerRank(q, 'vector')} (vector), {answerRank(q, 'hybrid', k)} (fused).
            </caption>
            <thead>
              <tr>
                <th scope="col">page</th>
                <th scope="col">kw rank</th>
                <th scope="col">vec rank</th>
                <th scope="col">RRF</th>
              </tr>
            </thead>
            <tbody>
              {fused.slice(0, 6).map((f) => (
                <tr key={f.id}>
                  <th scope="row">{f.id}</th>
                  <td>{f.fromKeyword ?? '-'}</td>
                  <td>{f.fromVector ?? '-'}</td>
                  <td>{f.score.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="wr-note">
          Reciprocal rank fusion (Cormack, Clarke and Büttcher, 2009) uses only ranks, so a keyword score and a cosine similarity, which are on different scales, need no conversion. The paper fixed k = 60; a smaller k lets the top ranks dominate, a larger one flattens the scores.
        </p>
      </details>
    </WhatIfFrame>
  );
}

