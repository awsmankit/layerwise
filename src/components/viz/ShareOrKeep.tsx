import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Root, EASE } from './shared';
import { judge, MESSAGES, tally, VERDICT_LABEL, type Verdict } from '../../lib/privacy-sort';

const ORDER: Verdict[] = ['share', 'ask', 'keep'];

/**
 * "Share or keep?": ten pretend messages, one card at a time. The learner
 * sorts each into fine to share, ask a grown-up, or keep private, and gets a
 * kind reason either way. Everything is scripted and runs in the browser.
 */
export default function ShareOrKeep() {
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, Verdict>>({});
  const total = MESSAGES.length;
  const finished = index >= total;
  const message = MESSAGES[Math.min(index, total - 1)];
  const picked = picks[message.id];
  const result = picked ? judge(message, picked) : null;
  const { correct } = tally(picks);

  const choose = (v: Verdict) => {
    if (picked) return;
    setPicks((p) => ({ ...p, [message.id]: v }));
  };
  const restart = () => {
    setPicks({});
    setIndex(0);
  };

  return (
    <Root>
      <div className="viz rb-sort">
        <p className="viz-title">Share or keep? Sort ten pretend messages</p>

        {!finished ? (
          <>
            <p className="rb-count" aria-hidden="true">
              Message {index + 1} of {total}
            </p>
            <div className="rb-progress" role="presentation">
              {MESSAGES.map((m, i) => (
                <span key={m.id} className={`rb-dot${i < index ? ' is-done' : ''}${i === index ? ' is-now' : ''}`} />
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.figure
                key={message.id}
                className="rb-note"
                initial={{ opacity: 0, y: 10, rotate: -1 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.26, ease: EASE }}
              >
                <figcaption>A pretend child types:</figcaption>
                <blockquote>{message.text}</blockquote>
              </motion.figure>
            </AnimatePresence>

            <div className="rb-choices" role="group" aria-label="Where does this message belong?">
              {ORDER.map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`rb-choice rb-${v}${picked === v ? ' is-picked' : ''}`}
                  aria-pressed={picked === v}
                  disabled={!!picked && picked !== v}
                  onClick={() => choose(v)}
                >
                  {VERDICT_LABEL[v]}
                </button>
              ))}
            </div>

            <div className="rb-feedback" aria-live="polite">
              {result && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className={result.correct ? 'is-right' : 'is-miss'}>
                  <p>
                    <b>{result.opening}</b> This one belongs in <b>{VERDICT_LABEL[result.right]}</b>.
                  </p>
                  <p>{result.why}</p>
                  <button type="button" className="btn" onClick={() => setIndex((i) => i + 1)}>
                    {index + 1 === total ? 'See how you did' : 'Next message'}
                  </button>
                </motion.div>
              )}
            </div>
          </>
        ) : (
          <div className="rb-done" aria-live="polite">
            <p className="rb-score">
              You matched <b className="num">{correct}</b> of <b className="num">{total}</b>.
            </p>
            <p>
              Some of these are judgement calls, and grown-ups sometimes disagree. The test that helps is the noticeboard: would you pin it on the school noticeboard for everyone to read? If not, keep it out of the chat. If you are unsure, ask.
            </p>
            <ul className="rb-recap">
              {MESSAGES.map((m) => (
                <li key={m.id} className={picks[m.id] === m.answer ? 'is-right' : 'is-miss'}>
                  <span className={`rb-tag rb-${m.answer}`}>{VERDICT_LABEL[m.answer]}</span>
                  <span>{m.text}</span>
                </li>
              ))}
            </ul>
            <button type="button" className="btn quiet" onClick={restart}>
              Try again
            </button>
          </div>
        )}
        <p className="viz-cap">Every name, address and number here is made up. Nothing you tap is sent anywhere.</p>
      </div>
    </Root>
  );
}
