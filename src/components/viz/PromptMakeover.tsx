import { useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { BLOCKS, VAGUE, buildPrompt, cannedAnswer, strength, whatChanged, type Block } from '../../lib/prompt-makeover';

/**
 * "Prompt makeover": tick building blocks to turn a vague prompt into a clear
 * one. The answers are written in advance and labelled as examples; there is no
 * live model, so it is safe in a classroom and works offline.
 */
export default function PromptMakeover() {
  const [on, setOn] = useState<Block[]>([]);
  const [last, setLast] = useState<Block | null>(null);
  const answer = cannedAnswer(on);
  const prompt = buildPrompt(on);
  const n = strength(on);

  const toggle = (b: Block) => {
    const adding = !on.includes(b);
    setOn((cur) => (adding ? [...cur, b] : cur.filter((x) => x !== b)));
    setLast(adding ? b : null);
  };

  return (
    <Root>
      <div className="viz rb-makeover">
        <p className="viz-title">Prompt makeover: start vague, add one block at a time</p>

        <fieldset className="rb-blocks">
          <legend className="rb-label">Building blocks</legend>
          {BLOCKS.map((b) => (
            <label key={b.id} className={`rb-block${on.includes(b.id) ? ' is-on' : ''}`}>
              <input type="checkbox" checked={on.includes(b.id)} onChange={() => toggle(b.id)} />
              <span>
                <b>{b.label}</b>
                <small>{b.hint}</small>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="rb-prompt">
          <p className="rb-label">Your prompt{prompt === VAGUE ? ' (vague)' : ''}</p>
          <p className="rb-prompt-text">{prompt}</p>
          <div className="rb-meter" role="img" aria-label={`${n} of 5 building blocks used`}>
            {BLOCKS.map((b, i) => (
              <span key={b.id} className={i < n ? 'is-on' : ''} />
            ))}
          </div>
        </div>

        <div className="rb-answer">
          <p className="rb-label">Example answer (written in advance, not from a live chatbot)</p>
          <motion.div key={on.join(',')} initial={{ opacity: 0.4, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: EASE }}>
            {answer.sentences.map((s, i) => (
              <p key={i}>{s}</p>
            ))}
          </motion.div>
        </div>

        <p className="rb-changed" aria-live="polite">
          {last ? <><b>What changed.</b> {whatChanged(last)}</> : n === 0 ? 'Tick a block to see the answer change.' : 'Untick a block to see what it was doing.'}
        </p>
        <p className="viz-cap">A real chatbot would word its answer differently each time, and it can still be wrong. Check facts that matter in a book or on a trusted website.</p>
      </div>
    </Root>
  );
}
