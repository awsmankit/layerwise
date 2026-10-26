import { useRef, useState } from 'react';
import { AnimatePresence, motion, useScroll, useSpring } from 'motion/react';
import { Root, EASE } from './shared';

type Ev = { year: string; title: string; detail: string };
type Era = { name: string; note: string; events: Ev[] };

const eras: Era[] = [
  {
    name: 'Early AI and classical ML',
    note: 'Hand-built features, small models, one model per task.',
    events: [
      { year: '1950', title: 'The imitation game', detail: 'Alan Turing’s paper “Computing Machinery and Intelligence” asks whether machines can think and proposes a behavioural test.' },
      { year: '1958', title: 'The perceptron', detail: 'Frank Rosenblatt’s perceptron is an early learning machine: a single layer of weights trained from examples.' },
      { year: '1986', title: 'Backpropagation popularised', detail: 'Rumelhart, Hinton and Williams show that multi-layer networks can be trained by propagating errors backwards. This is still how networks learn today.' },
      { year: '1997', title: 'LSTM', detail: 'Hochreiter and Schmidhuber’s long short-term memory network makes learning from sequences practical for years of speech and text work.' },
      { year: '1998', title: 'LeNet', detail: 'Yann LeCun and colleagues use convolutional networks to read handwritten digits, a template for later vision systems.' },
    ],
  },
  {
    name: 'Deep learning',
    note: 'Models learn their own features; GPUs become essential.',
    events: [
      { year: '2012', title: 'AlexNet', detail: 'A GPU-trained convolutional network wins the ImageNet challenge by a wide margin and deep learning takes over computer vision.' },
      { year: '2013', title: 'Word embeddings', detail: 'word2vec (Mikolov et al.) shows that words can be mapped to vectors where distance carries meaning.' },
      { year: '2014', title: 'Attention for translation', detail: 'Bahdanau, Cho and Bengio add attention to sequence-to-sequence models so the decoder can look back at relevant input words.' },
    ],
  },
  {
    name: 'Transformers and scale',
    note: 'One architecture, pretrained once, adapted to everything.',
    events: [
      { year: '2017', title: 'Attention Is All You Need', detail: 'The transformer drops recurrence entirely and relies on attention. It trains in parallel on GPUs and scales far better than earlier designs.' },
      { year: '2018', title: 'BERT and GPT', detail: 'Pretraining on raw text and then fine-tuning becomes the standard recipe for language tasks.' },
      { year: '2020', title: 'Scaling laws and GPT-3', detail: 'Kaplan et al. find that loss falls predictably as you scale parameters, data and compute. GPT-3 shows that a large model can pick up a task from a few examples in the prompt.' },
      { year: '2022', title: 'Assistants', detail: 'Instruction tuning and reinforcement learning from human feedback (InstructGPT) turn text predictors into assistants, and ChatGPT brings them to the public. Chinchilla refines how to balance model size against training data.' },
    ],
  },
  {
    name: 'The application era',
    note: 'You mostly compose systems; you rarely train the model.',
    events: [
      { year: '2023', title: 'Managed model platforms and RAG', detail: 'Cloud services such as AWS Bedrock reach general availability, giving enterprises model APIs inside their existing security perimeter. Retrieval-augmented generation becomes the default way to add private knowledge.' },
      { year: '2024', title: 'Reasoning models and tool protocols', detail: 'Models trained to reason before answering appear. The Model Context Protocol is introduced as an open standard for connecting models to tools and data.' },
      { year: '2025 on', title: 'Agents in production', detail: 'The hard problems shift to evals, cost control, reliability and permissions for systems where the model chooses its own actions.' },
    ],
  },
];

export default function Timeline() {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<string | null>('2017');
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 70%', 'end 55%'] });
  const draw = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 });

  return (
    <Root>
      <div className="tl" ref={ref}>
        <span className="tl-spine" aria-hidden="true" />
        <motion.span className="tl-spine-fill" aria-hidden="true" style={{ scaleY: draw }} />
        {eras.map((era) => (
          <section key={era.name} className="tl-era">
            <header className="tl-era-head">
              <h3>{era.name}</h3>
              <p>{era.note}</p>
            </header>
            <ol className="tl-events">
              {era.events.map((ev) => {
                const isOpen = open === ev.year + ev.title;
                const key = ev.year + ev.title;
                return (
                  <li key={key} className={`tl-event${isOpen ? ' is-open' : ''}`}>
                    <button
                      type="button"
                      className="tl-btn"
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? null : key)}
                    >
                      <span className="tl-node" aria-hidden="true" />
                      <span className="tl-year num">{ev.year}</span>
                      <span className="tl-title">{ev.title}</span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.p
                          className="tl-detail"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.36, ease: EASE }}
                        >
                          <span>{ev.detail}</span>
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </Root>
  );
}
