import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Root, EASE } from './shared';

const samples = [
  { label: 'Plain English', text: 'The cat sat on the mat.', tokens: ['The', ' cat', ' sat', ' on', ' the', ' mat', '.'] },
  { label: 'A rare word', text: 'Hypoallergenic', tokens: ['Hyp', 'o', 'all', 'erg', 'enic'] },
  { label: 'Code', text: 'def add(a, b): return a + b', tokens: ['def', ' add', '(a', ',', ' b', '):', ' return', ' a', ' +', ' b'] },
  { label: 'Digits', text: '1234567890', tokens: ['123', '456', '789', '0'] },
];

// Real splits from the o200k_base tokenizer, for the beginner lesson.
const simpleSamples = [
  { label: 'A sentence', text: 'I love playing football with my friends.', tokens: ['I', ' love', ' playing', ' football', ' with', ' my', ' friends', '.'] },
  { label: 'A name', text: 'My dog is called Biscuit.', tokens: ['My', ' dog', ' is', ' called', ' Bisc', 'uit', '.'] },
  { label: 'strawberry', text: 'strawberry', tokens: ['st', 'raw', 'berry'] },
  { label: 'A long word', text: 'Supercalifragilisticexpialidocious', tokens: ['Super', 'cal', 'if', 'rag', 'il', 'istic', 'exp', 'ial', 'id', 'ocious'] },
];

export default function TokenChips({ simple = false }: { simple?: boolean }) {
  const [i, setI] = useState(0);
  const list = simple ? simpleSamples : samples;
  const s = list[i];
  const words = s.text.trim().split(/\s+/).length;

  return (
    <Root>
      <div className="viz tc">
        <div className="tc-tabs" role="tablist" aria-label="Sample text">
          {list.map((x, k) => (
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
          {s.text.length} {simple ? 'letters and spaces' : 'characters'}, {words} {words === 1 ? 'word' : 'words'}, {s.tokens.length} {simple ? 'pieces' : 'tokens'}
        </p>
        <p className="viz-cap">
          {simple ? 'Real pieces from a tokenizer that some ChatGPT models use. Other chatbots cut words up a little differently. A dot shows a space at the start of a piece.' : <>Illustrative splits. Every model family has its own tokenizer, so the same text costs a different number of tokens on different models. A leading space is shown as a dot.</>}
        </p>
      </div>
    </Root>
  );
}
