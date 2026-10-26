import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Root, EASE } from './shared';

const layers = [
  { id: 'ai', name: 'Artificial intelligence', text: 'The broad goal: making machines do things that normally need human intelligence. It includes hand-written rules, search, planning and learning.' },
  { id: 'ml', name: 'Machine learning', text: 'Instead of writing the rules, you show the computer many examples and it works out the rules itself. A spam filter learned from thousands of labelled emails is machine learning.' },
  { id: 'dl', name: 'Deep learning', text: 'Machine learning using large neural networks with many layers. It is what made speech recognition, image recognition and translation good enough to use every day.' },
  { id: 'gen', name: 'Generative AI', text: 'Deep learning models that produce new content: text, images, audio, code. They learn the patterns in huge amounts of examples and generate more of the same kind.' },
  { id: 'llm', name: 'Large language models', text: 'Generative models for text. Chatbots such as the ones you may have used are built on them. Each one is trained to predict the next piece of text, over and over.' },
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
                style={{ inset: `${i * 14}% ${i * 7}%` }}
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
        <p className="viz-cap">Each ring is a special case of the one around it. Every large language model is generative AI, deep learning, machine learning and AI. The reverse is not true.</p>
      </div>
    </Root>
  );
}
