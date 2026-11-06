import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import WhatIfFrame from './WhatIfFrame';
import { EASE } from '../viz/shared';
import { dateMissDays, isCorrect, productMiss, questions, score, script } from '../../lib/whatif/no-tool-use';

const WHO: Record<string, string> = { you: 'You', model: 'Model', tool: 'Tool result', program: 'Program' };

/**
 * A scripted chat. Without tools the stand-in model writes a confident answer from memory.
 * With tools it asks the program to run a check, and the answer comes from the result.
 */
export default function NoToolUseWhatIf() {
  const [tools, setTools] = useState(true);
  const [qi, setQi] = useState(1);
  const q = questions[qi];
  const turns = useMemo(() => script(q, tools), [q, tools]);
  const [shown, setShown] = useState(turns.length);
  const [playing, setPlaying] = useState(false);

  // whenever the script changes (new question, or switch flipped) show the finished conversation
  useEffect(() => {
    setPlaying(false);
    setShown(turns.length);
  }, [turns]);

  useEffect(() => {
    if (!playing) return;
    if (shown >= turns.length) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setShown((s) => s + 1), 800);
    return () => clearTimeout(t);
  }, [playing, shown, turns.length]);

  const play = () => {
    setShown(1);
    setPlaying(true);
  };
  const next = () => {
    setPlaying(false);
    setShown((s) => (s >= turns.length ? 1 : s + 1));
  };

  const done = shown >= turns.length;
  const ok = isCorrect(q, tools);
  const verdict = tools ? (
    <>With tools the model hands the check to a program and reads back the result: {score(true)} of {questions.length} answers right. The tool result is the thing that makes the answer true.</>
  ) : (
    <>
      Without tools the model has only what it remembers: {score(false)} of {questions.length} right, and every wrong answer sounds just as sure as a right one. It thinks it is{' '}
      {dateMissDays().toLocaleString('en-US')} days earlier than it is, its sum is off by {productMiss()}, and it has never seen your orders.
    </>
  );

  return (
    <WhatIfFrame
      title="Three questions a model cannot answer from memory"
      withLabel="With tools"
      withoutLabel="No tools"
      on={tools}
      onChange={setTools}
      verdict={verdict}
      controls={
        <div className="wa-picker" role="group" aria-label="Choose a question">
          {questions.map((x, i) => (
            <button key={x.id} type="button" className={`wa-pick${i === qi ? ' is-on' : ''}`} aria-pressed={i === qi} onClick={() => setQi(i)}>
              <span>{x.label}</span>
              <small>{x.need}</small>
            </button>
          ))}
        </div>
      }
    >
      <p className="wa-tag">Scripted illustration with a stand-in model. Not a real product, and the figures are examples.</p>
      <ol className="wa-chat" aria-label={`Scripted conversation, ${tools ? 'with' : 'without'} tools`}>
        <AnimatePresence initial={false}>
          {turns.slice(0, shown).map((t, i) => (
            <motion.li
              key={`${q.id}-${tools}-${i}`}
              className={`wa-bubble wa-${t.who}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <span className="wa-who">{WHO[t.who]}</span>
              <span className={t.who === 'tool' || (t.who === 'model' && tools && i === 1) ? 'wa-mono' : ''}>{t.text}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
      {done && (
        <motion.div className={`wa-check ${ok ? 'is-good' : 'is-bad'}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <b>{ok ? '✓ Right' : '✗ Wrong, and said with confidence'}</b>
          <span>The true answer: {q.truth}</span>
        </motion.div>
      )}
      <div className="wa-btns">
        <button type="button" className="btn quiet" onClick={play}>
          {playing ? 'Playing…' : 'Play it'}
        </button>
        <button type="button" className="btn quiet" onClick={next}>
          Next step
        </button>
        <span className="wa-count" aria-live="polite">
          Step {Math.min(shown, turns.length)} of {turns.length}
        </span>
      </div>
      <ul className="wa-score" aria-label="Result for each question">
        {questions.map((x) => {
          const good = isCorrect(x, tools);
          return (
            <li key={x.id} className={good ? 'is-good' : 'is-bad'}>
              <span aria-hidden="true">{good ? '✓' : '✗'}</span> {x.label}: {good ? 'right' : 'wrong'}
            </li>
          );
        })}
      </ul>
    </WhatIfFrame>
  );
}
