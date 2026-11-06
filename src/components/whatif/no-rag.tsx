import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { CUTOFF_MONTH, MATCH_CUTOFF, MONTHS, QUESTIONS, answer, tally } from '../../lib/whatif/no-rag';

const KIND = { private: 'private fact', recent: 'recent fact', stable: 'stable public fact' } as const;
const SOURCE = { memory: 'from its training memory', guess: 'a guess: the most common answer it saw', passage: 'from the retrieved passage' } as const;

/**
 * A question flows down through four cards: the question, the search, what the model reads, and its answer.
 * The toy model is made up; it shows the shape of the gap, not how any real model behaves.
 */
export default function NoRagWhatIf() {
  const [rag, setRag] = useState(true);
  const [qi, setQi] = useState(0);
  const [step, setStep] = useState(3);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const q = QUESTIONS[qi];
  const a = answer(q, rag);
  const withRag = tally(true);
  const without = tally(false);

  const play = () => {
    if (timer.current) clearInterval(timer.current);
    setStep(0);
    let s = 0;
    timer.current = setInterval(() => {
      s += 1;
      setStep(s);
      if (s >= 3 && timer.current) clearInterval(timer.current);
    }, 650);
  };

  const verdict = rag ? (
    a.source === 'passage' ? (
      <>With retrieval the model is handed the passage and answers "{a.text}", which is {a.correct ? 'right' : 'wrong'}. Across the four example questions it gets {withRag} of {QUESTIONS.length} right.</>
    ) : (
      <>Nothing in the store matches this question, so the model falls back on memory and answers "{a.text}", which is {a.correct ? 'right: stable public facts are in its memory' : 'wrong'}. Across all four it gets {withRag} of {QUESTIONS.length} right.</>
    )
  ) : a.correct ? (
    <>Without retrieval the model answers "{a.text}" from memory, and that is right: this is a stable public fact. Across all four example questions it gets only {without} of {QUESTIONS.length} right.</>
  ) : (
    <>Without retrieval the toy model answers "{a.text}" ({a.source === 'guess' ? 'a guess' : 'out of date'}), and the true answer is "{q.truth}". It sounds just as sure either way. Across all four questions it gets {without} of {QUESTIONS.length} right.</>
  );

  const card = (n: number, cls: string, children: React.ReactNode) => (
    <motion.div
      key={`${qi}-${rag}-${n}`}
      className={'wr-card ' + cls}
      initial={false}
      animate={{ opacity: step >= n ? 1 : 0.18, y: step >= n ? 0 : 8 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      {children}
    </motion.div>
  );

  return (
    <WhatIfFrame
      title="Ask a toy model about things it could not have learned"
      withLabel="With retrieval"
      withoutLabel="No retrieval"
      on={rag}
      onChange={setRag}
      verdict={verdict}
      controls={
        <>
          <div className="wr-chips" role="group" aria-label="Pick a question">
            {QUESTIONS.map((x, i) => {
              const r = answer(x, rag);
              return (
                <button key={x.id} type="button" className={'wr-chip' + (i === qi ? ' is-on' : '')} aria-pressed={i === qi} onClick={() => setQi(i)}>
                  {r.correct ? '✓ ' : '✗ '}
                  {x.text}
                </button>
              );
            })}
          </div>
          <button type="button" className="btn quiet" onClick={play}>
            Play it
          </button>
        </>
      }
    >
      <p className="wr-lead">
        A language model only knows what was in its training text, up to a cutoff date. It cannot know your private documents or last month's news. This is a made-up toy model with a tiny memory, to show the gap.
      </p>
      <div className="wr-flow">
        {card(0, '', (
          <>
            <p className="wr-card-h">Question <span className="wr-badge">{KIND[q.kind]}</span></p>
            <p className="wr-card-t">{q.text}</p>
          </>
        ))}
        <span className="wr-arrow" aria-hidden="true">↓</span>
        {card(1, rag ? '' : 'is-off', rag ? (
          <>
            <p className="wr-card-h">Search the private documents</p>
            {a.passage ? (
              <p className="wr-card-t">
                Best passage (matches {Math.round(a.score * 100)}% of the question's words): "{a.passage.text}"
              </p>
            ) : (
              <p className="wr-card-t">No passage matches at least {Math.round(MATCH_CUTOFF * 100)}% of the question's words, so nothing is added.</p>
            )}
          </>
        ) : (
          <>
            <p className="wr-card-h">Search: switched off</p>
            <p className="wr-card-t">The model never looks at any documents.</p>
          </>
        ))}
        <span className="wr-arrow" aria-hidden="true">↓</span>
        {card(2, '', (
          <>
            <p className="wr-card-h">What the model has in front of it</p>
            <p className="wr-card-t">
              {a.passage ? 'The question and the passage above.' : `Only the question, and what it remembers. Its memory stops at the end of ${MONTHS[CUTOFF_MONTH - 1]} (an example cutoff).`}
            </p>
          </>
        ))}
        <span className="wr-arrow" aria-hidden="true">↓</span>
        {card(3, a.correct ? 'is-good' : 'is-bad', (
          <>
            <p className="wr-card-h">{a.correct ? '✓ Answer, correct' : '✗ Answer, wrong'}</p>
            <p className="wr-card-t wr-big">{a.text}</p>
            <p className="wr-card-s">{SOURCE[a.source]}{a.correct ? '' : `. The true answer is "${q.truth}".`}</p>
          </>
        ))}
      </div>
      <p className="wr-note">
        Score so far, four example questions: <b>{without} right without retrieval</b>, <b>{withRag} right with it</b>. The made-up facts, the March cutoff and the 50% match rule are all examples. A real model might refuse, hedge or use other tools instead of guessing.
      </p>
    </WhatIfFrame>
  );
}
