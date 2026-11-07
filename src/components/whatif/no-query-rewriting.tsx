import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { CHAT, PAGES, STANDALONE, answerRank, correctCount, queryFor, resultsFor, topTies } from '../../lib/whatif/no-query-rewriting';

const SHOW = 3;

/**
 * A short chat about three made-up plans. The switch decides what search receives for each message: the raw text,
 * or a standalone question. Pick a message (or play the whole chat) and see which pages come back.
 */
export default function NoQueryRewritingWhatIf() {
  const [rewrite, setRewrite] = useState(false);
  const [turn, setTurn] = useState(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const query = queryFor(turn, rewrite);
  const results = resultsFor(turn, rewrite);
  const top = results.slice(0, SHOW);
  const ties = topTies(turn, rewrite);
  const rank = answerRank(turn, rewrite);
  const answerId = CHAT[turn].answer;
  const answerPage = PAGES.find((p) => p.id === answerId)!;
  const ok = rank === 1 && ties === 1;
  const maxScore = results.length ? results[0].score : 1;
  const rawRank = answerRank(turn, false);
  const changed = STANDALONE[turn] !== CHAT[turn].user;
  const rows = CHAT.map((_, t) => ({ t, rank: answerRank(t, rewrite), ties: topTies(t, rewrite) }));

  const play = () => {
    if (timer.current) clearTimeout(timer.current);
    let t = 0;
    setTurn(0);
    const step = () => {
      t += 1;
      if (t < CHAT.length) {
        setTurn(t);
        timer.current = setTimeout(step, 1400);
      }
    };
    timer.current = setTimeout(step, 1400);
  };

  const verdict = !changed ? (
    <>
      Message {turn + 1} already names the plan, so rewriting changes nothing: the right page comes first either way. The trouble starts with the follow-ups: across the {CHAT.length} messages the right page is first {correctCount(rewrite)} times {rewrite ? 'with rewriting' : 'with the raw text'}, against {correctCount(!rewrite)} {rewrite ? 'without' : 'with'} it.
    </>
  ) : rewrite ? (
    <>
      Rewritten to "{query}", search puts the right page {ok ? 'first, alone' : `at rank ${rank}`} (raw text: rank {rawRank ?? 'none'}). Across the {CHAT.length} messages the right page is first {correctCount(true)} times, against {correctCount(false)} with the raw text.
    </>
  ) : (
    <>
      Search got only "{query}", which does not say which plan. {ties > 1 ? `${ties} pages tie for first, so the right one lands at rank ${rank} and the reply is likely about the wrong plan.` : `The wrong page comes first and the right one is at rank ${rank}.`} Across the {CHAT.length} messages the right page is first just {correctCount(false)} {correctCount(false) === 1 ? 'time' : 'times'}.
    </>
  );

  return (
    <WhatIfFrame
      title="A chat about three made-up storage plans"
      withLabel="With query rewriting"
      withoutLabel="Raw question"
      on={rewrite}
      onChange={setRewrite}
      verdict={verdict}
      controls={
        <>
          <div className="wr-chips" role="group" aria-label="Pick a message in the chat">
            {CHAT.map((c, i) => (
              <button key={c.user} type="button" className={'wr-chip' + (i === turn ? ' is-on' : '')} aria-pressed={i === turn} onClick={() => setTurn(i)}>
                Message {i + 1}
              </button>
            ))}
          </div>
          <button type="button" className="btn quiet" onClick={play}>
            Play the chat
          </button>
        </>
      }
    >
      <p className="wr-lead">
        Search looks at one query at a time. It cannot see the chat. A follow-up like "does it work offline?" only makes sense with the messages before it.
      </p>
      <ol className="wr-chat" aria-label="The chat so far">
        {CHAT.slice(0, turn + 1).map((c, i) => (
          <motion.li key={c.user} initial={{ opacity: 0, y: 6 }} animate={{ opacity: i === turn ? 1 : 0.6, y: 0 }} transition={{ duration: 0.4, ease: EASE }} className={'wr-bubble' + (i === turn ? ' is-now' : '')}>
            <span className="wr-meta">You, message {i + 1}</span>
            {c.user}
          </motion.li>
        ))}
      </ol>
      <div className={'wr-card ' + (ok ? 'is-good' : 'is-bad')} style={{ marginTop: '0.7rem' }}>
        <p className="wr-card-h">What search receives</p>
        <p className="wr-card-t wr-q">
          <b>"{query}"</b>
        </p>
        {rewrite && changed && <p className="wr-card-s">Rewritten from "{CHAT[turn].user}" using the chat so far.</p>}
        {!rewrite && changed && <p className="wr-card-s">Sent as typed. A rewriter would have sent "{STANDALONE[turn]}".</p>}
      </div>
      <p className="wr-meta" style={{ margin: '0.7rem 0 0.3rem' }}>
        The right page is: <b>"{answerPage.text}"</b>
      </p>
      <ol className="wr-list" aria-label={`Top ${SHOW} pages found for this query`}>
        {top.map((h, i) => {
          const good = h.id === answerId;
          const tied = results.filter((r) => r.score === h.score).length;
          return (
            <motion.li key={h.id} layout transition={{ duration: 0.55, ease: EASE }} className={'wr-row wr-compact ' + (good ? (i === 0 ? 'is-good' : 'is-bad') : '')}>
              <span className="wr-rank" aria-hidden="true">{i + 1}</span>
              <div className="wr-body">
                <span className="wr-text">{h.text}{good && <b className="wr-tag">{i === 0 ? ' ✓ the right page' : ` ✗ the right page, but only at rank ${i + 1}`}</b>}</span>
                <span className="wr-bar" aria-hidden="true">
                  <motion.i initial={false} animate={{ width: `${Math.round((h.score / maxScore) * 100)}%` }} transition={{ duration: 0.5, ease: EASE }} />
                </span>
                <span className="wr-meta">score {h.score.toFixed(2)}{tied > 1 ? ` · tied with ${tied - 1} other ${tied === 2 ? 'page' : 'pages'}` : ''}</span>
              </div>
            </motion.li>
          );
        })}
        {rank !== null && rank > SHOW && (
          <li className="wr-row wr-compact is-bad"><span className="wr-text"><b className="wr-tag">✗ The right page is at rank {rank}, below the pages shown.</b></span></li>
        )}
        {rank === null && (
          <li className="wr-row wr-compact is-bad"><span className="wr-text"><b className="wr-tag">✗ The right page was not found.</b></span></li>
        )}
      </ol>
      <p className="wr-card-h" style={{ margin: '0.9rem 0 0.3rem' }}>Right page first, message by message ({rewrite ? 'rewritten' : 'raw'})</p>
      <ul className="wr-score" aria-label="Result for each message">
        {rows.map((r) => {
          const good = r.rank === 1 && r.ties === 1;
          return (
            <li key={r.t} className={'wr-score-i ' + (good ? 'is-good' : 'is-bad')}>
              <span className="wr-meta">Message {r.t + 1}</span>
              <b>{good ? '✓ rank 1' : `✗ rank ${r.rank ?? 'none'}`}</b>
              {r.ties > 1 && <span className="wr-meta">{r.ties}-way tie</span>}
            </li>
          );
        })}
      </ul>
      <p className="wr-note">
        Toy setup: nine made-up pages, search by word matching (tf-idf), and a hand-written rewriter that swaps "it" for the plan being discussed. A real rewriter is a language model that reads the chat history and writes the standalone question, and it can get that wrong too. Ties keep page order.
      </p>
    </WhatIfFrame>
  );
}
