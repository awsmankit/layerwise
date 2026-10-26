import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Root, EASE } from './shared';

const samples = [
  { label: 'Plain English', text: 'The cat sat on the mat.', tokens: ['The', ' cat', ' sat', ' on', ' the', ' mat', '.'] },
  { label: 'A rare word', text: 'Hypoallergenic', tokens: ['Hyp', 'o', 'all', 'erg', 'enic'] },
  { label: 'Code', text: 'def add(a, b): return a + b', tokens: ['def', ' add', '(a', ',', ' b', '):', ' return', ' a', ' +', ' b'] },
  { label: 'Digits', text: '1234567890', tokens: ['123', '456', '789', '0'] },
];

export default function TokenChips() {
  const [i, setI] = useState(0);
  const s = samples[i];
  const words = s.text.trim().split(/\s+/).length;

  return (
    <Root>
      <div className="viz tc">
        <div className="tc-tabs" role="tablist" aria-label="Sample text">
          {samples.map((x, k) => (
            <button
              key={x.label}
              type="button"
              role="tab"
              aria-selected={k === i}
              className={`tc-tab${k === i ? ' is-active' : ''}`}
              onClick={() => setI(k)}
            >
              {x.label}
            </button>
          ))}
        </div>
        <p className="tc-source">{s.text}</p>
        <div className="tc-chips">
          <AnimatePresence mode="popLayout">
            {s.tokens.map((t, k) => (
              <motion.span
                key={`${i}-${k}`}
                className={`tc-chip c${k % 3}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: k * 0.06, duration: 0.3, ease: EASE }}
              >
                {t.replace(/ /g, '·')}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
        <p className="tc-stat num">
          {s.text.length} characters, {words} {words === 1 ? 'word' : 'words'}, {s.tokens.length} tokens
        </p>
        <p className="viz-cap">
          Illustrative splits. Every model family has its own tokenizer, so the same text costs a different number of tokens on different models. A leading space is shown as a dot.
        </p>
      </div>
    </Root>
  );
}
