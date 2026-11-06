import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { QUESTION, answerRank, ranked, toyReply, visible } from '../../lib/whatif/no-reranker';

/**
 * Ten passages in a list. Without a reranker they stay in first-pass order; with one they slide into their new
 * order. A line under rank k marks what the model can read.
 */
export default function NoRerankerWhatIf() {
  const [rerank, setRerank] = useState(false);
  const [k, setK] = useState(3);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const rows = ranked(rerank);
  const seen = visible(rerank, k);
  const reply = toyReply(seen);
  const before = answerRank(false);
  const after = answerRank(true);
  const maxScore = Math.max(...ranked(false).map((r) => r.score), ...ranked(true).map((r) => r.score));

  const play = () => {
    if (timer.current) clearTimeout(timer.current);
    setRerank(false);
    timer.current = setTimeout(() => setRerank(true), 900);
  };

  const verdict = rerank ? (
    <>
      The reranker re-reads all {rows.length} passages and moves the answer from rank {before} to rank {after}. With the model reading the top {k}, it {reply.answered ? 'now sees it and can answer' : 'still cannot see it'}.
    </>
  ) : (
    <>
      The first search put the answer at rank {before}. The model only reads the top {k}, so {k >= before ? 'this time it does see it (turn the reading window down to see the miss)' : `the answer is ${before - k} ${before - k === 1 ? 'place' : 'places'} below the line and the model never sees it`}.
    </>
  );

  return (
    <WhatIfFrame
      title={`Question: "${QUESTION}"`}
      withLabel="With a reranker"
      withoutLabel="Without one"
      on={rerank}
      onChange={setRerank}
      verdict={verdict}
      controls={
        <>
          <label className="field">
            <span>
              The model reads the top <b>{k}</b> {k === 1 ? 'passage' : 'passages'}
            </span>
            <input type="range" min={1} max={5} value={k} onChange={(e) => setK(+e.target.value)} aria-label="How many passages the model reads" />
          </label>
          <button type="button" className="btn quiet" onClick={play}>
            Play it
          </button>
        </>
      }
    >
      <p className="wr-lead">
        The first search is fast and rough. A reranker is a slower second look that reads the question and each passage together, then re-orders the short list. The model can only read the passages above the line.
      </p>
      <ol className="wr-list wr-rr" aria-label={rerank ? 'Passages after reranking, best first' : 'Passages from the first search, best first'}>
        {rows.flatMap((r, i) => {
          const inView = i < k;
          const li = (
            <motion.li key={r.id} layout transition={{ duration: 0.7, ease: EASE }} className={'wr-row wr-compact ' + (r.answers ? 'is-good' : inView ? '' : 'is-dim')}>
              <span className="wr-rank" aria-hidden="true">{i + 1}</span>
              <div className="wr-body">
                <span className="wr-text">{r.title}{r.answers && <b className="wr-tag"> ✓ has the answer</b>}</span>
                <span className="wr-bar" aria-hidden="true">
                  <motion.i initial={false} animate={{ width: `${Math.round((r.score / maxScore) * 100)}%` }} transition={{ duration: 0.6, ease: EASE }} />
                </span>
                <span className="wr-meta">score {r.score.toFixed(2)}{inView ? ' · model reads it' : ' · model never sees it'}</span>
              </div>
            </motion.li>
          );
          return i === k - 1 ? [li, <li key="line" className="wr-cutline" aria-hidden="true"><span>the model reads only above this line</span></li>] : [li];
        })}
      </ol>
      <div className="wr-read" aria-live="polite">
        <p className="wr-read-h">What the model reads (top {k}):</p>
        <ul>
          {seen.map((r) => (
            <li key={r.id}>{r.text}</li>
          ))}
        </ul>
        <p className={'wr-reply ' + (reply.answered ? 'is-good' : 'is-bad')}>
          <b>{reply.answered ? '✓ ' : '✗ '}Toy model says:</b> {reply.text}
        </p>
      </div>
      <p className="wr-note">
        Toy scores. First pass: cosine similarity of word counts between the question and the passage. Reranker: 0.4 times that, plus 0.2 if the passage is about returns, plus 0.4 more if it also gives a number of days. A real reranker is a trained model that reads question and passage together.
      </p>
    </WhatIfFrame>
  );
}
