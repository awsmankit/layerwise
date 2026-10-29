import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Root, EASE } from './shared';

const layers = [
  { id: 'ai', name: 'Artificial intelligence', text: 'The big idea: getting computers to do things that usually need a thinking person. Some AI follows rules that people wrote. Most AI today learns from examples.' },
  { id: 'ml', name: 'Machine learning', text: 'Instead of people writing the rules, the computer learns them from lots of examples. A spam filter that learned from thousands of marked emails is machine learning.' },
  { id: 'dl', name: 'Deep learning', text: 'Machine learning with very big neural networks: many layers of simple calculations, stacked on top of each other. It made voice assistants, photo search and translation good enough to use every day.' },
  { id: 'gen', name: 'Generative AI', text: 'Deep learning that makes new things: text, pictures, music or code. It learns the patterns in huge numbers of examples, then makes more of the same kind.' },
  { id: 'llm', name: 'Large language models', text: 'Generative AI for text. Chatbots are built on them. Each one learned from a huge amount of writing by guessing the next bit of text, again and again.' },
] as const;

/** Concentric outlines: each idea sits inside the previous one. Click a ring to read about it. */
export default function Nesting() {
  const [sel, setSel] = useState<string>('llm');
  const current = layers.find((l) => l.id === sel)!;

  return (
    <Root>
      <div className="viz ne">
        <div className="ne-wrap">
          <div className="ne-rings" role="group" aria-label="Nested ideas, outermost first">
            {layers.map((l, i) => (
              <motion.button
                key={l.id}
                type="button"
                className={`ne-ring${sel === l.id ? ' is-sel' : ''}`}
                style={{ '--i': i } as React.CSSProperties}
                aria-pressed={sel === l.id}
                onClick={() => setSel(l.id)}
                initial={{ opacity: 0, scale: 0.94 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.12, ease: EASE }}
              >
                <span className="ne-label">{l.name}</span>
              </motion.button>
            ))}
          </div>
          <div className="ne-text" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.div key={sel} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <h3>{current.name}</h3>
                <p>{current.text}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        <p className="viz-cap">Each ring sits inside the one around it. So every large language model is also generative AI, deep learning, machine learning and AI. It does not work the other way round: not all AI is a chatbot.</p>
      </div>
    </Root>
  );
}
