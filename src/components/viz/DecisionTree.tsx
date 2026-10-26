import { useState } from 'react';
import { motion } from 'motion/react';
import { Root, EASE } from './shared';
import { withBase } from '../../lib/url';

type Node =
  | { q: string; options: { label: string; next: string }[] }
  | { result: { title: string; body: string; link?: { label: string; href: string } } };

const adaptation: Record<string, Node> = {
  start: {
    q: 'What is the main problem with the answers today?',
    options: [
      { label: 'It does not know our data: private, recent or changing', next: 'knowledge' },
      { label: 'It knows enough, but the style, format or behaviour is wrong', next: 'behaviour' },
      { label: 'The answers are fine but it is too slow or too expensive', next: 'cost' },
      { label: 'I have not measured quality yet', next: 'measure' },
    ],
  },
  measure: {
    result: {
      title: 'Build a small eval set first',
      body: 'Collect 30 to 50 real inputs with the answers you would accept. Without it you cannot tell whether any change helped. Then come back to this chooser with a concrete failure in hand.',
      link: { label: 'Evals 101', href: '/learn/evals/evals-101/' },
    },
  },
  knowledge: {
    q: 'Is the knowledge small and stable, a few pages that rarely change?',
    options: [
      { label: 'Yes', next: 'stuff' },
      { label: 'No, it is large or it changes', next: 'rag' },
    ],
  },
  stuff: {
    result: {
      title: 'Put it in the prompt',
      body: 'Include the text directly and use prompt caching so you do not pay full price to resend it on every request. No retrieval system needed.',
      link: { label: 'Context windows and caching', href: '/learn/llm/context-window-and-caching/' },
    },
  },
  rag: {
    result: {
      title: 'Use retrieval (RAG)',
      body: 'Index your documents, fetch the relevant chunks per question, and let the model answer from them. Updates are a re-index, not a retraining job, and you can show sources.',
      link: { label: 'RAG from scratch', href: '/learn/rag-agents/rag-from-scratch/' },
    },
  },
  behaviour: {
    q: 'Does a clearer instruction plus 3 to 10 examples in the prompt fix it?',
    options: [
      { label: 'Yes, or I have not tried that yet', next: 'prompting' },
      { label: 'No, I tried and it is not consistent enough', next: 'examples' },
    ],
  },
  prompting: {
    result: {
      title: 'Improve the prompt',
      body: 'Few-shot examples, a clear output schema and explicit rules fix most behaviour problems at no training cost. Try this before anything heavier.',
      link: { label: 'Prompting and structured output', href: '/learn/llm/prompting-and-structured-output/' },
    },
  },
  examples: {
    q: 'Do you have several hundred high-quality examples of exactly the behaviour you want?',
    options: [
      { label: 'Yes', next: 'finetune' },
      { label: 'No', next: 'collect' },
    ],
  },
  finetune: {
    result: {
      title: 'Consider fine-tuning',
      body: 'Fine-tuning teaches style, format and narrow skills well. It does not reliably add new facts, so pair it with retrieval if knowledge is also an issue. Keep your eval set to prove it beat the prompt.',
      link: { label: 'Prompting vs RAG vs fine-tuning', href: '/learn/llm/prompting-vs-rag-vs-fine-tuning/' },
    },
  },
  collect: {
    result: {
      title: 'Collect examples first',
      body: 'Use the strongest model with a good prompt for now, log real inputs and the corrections people make, and revisit when you have enough clean examples.',
    },
  },
  cost: {
    q: 'Is a long prefix, such as instructions or documents, repeated across many requests?',
    options: [
      { label: 'Yes', next: 'caching' },
      { label: 'No', next: 'smaller' },
    ],
  },
  caching: {
    result: {
      title: 'Use prompt caching',
      body: 'Put the stable part of the prompt first and let the platform cache it. Cached input tokens are billed at a discount and also reduce time to first token.',
      link: { label: 'Cost levers', href: '/learn/cost/cost-levers/' },
    },
  },
  smaller: {
    q: 'Does a smaller model score well enough on your eval set?',
    options: [
      { label: 'Yes', next: 'switch' },
      { label: 'For some requests only', next: 'route' },
      { label: 'No', next: 'distill' },
    ],
  },
  switch: {
    result: {
      title: 'Switch to the smaller model',
      body: 'Use the eval set to confirm the quality holds, then switch. Keep the eval running so you notice if the model is updated.',
    },
  },
  route: {
    result: {
      title: 'Route by difficulty',
      body: 'Send easy requests to a small model and escalate hard ones to a large one. A cheap classifier or the small model’s own confidence can make the call.',
      link: { label: 'Model routing and fallbacks', href: '/learn/systems/model-routing-and-fallbacks/' },
    },
  },
  distill: {
    result: {
      title: 'Distill or fine-tune a small model',
      body: 'Use the large model’s outputs as training data for a smaller one on your narrow task. This is a larger investment, so make sure volume justifies it.',
      link: { label: 'Cost levers', href: '/learn/cost/cost-levers/' },
    },
  },
};

export default function DecisionTree() {
  const [path, setPath] = useState<{ id: string; choice?: string }[]>([{ id: 'start' }]);

  const choose = (label: string, next: string) =>
    setPath((p) => [...p.slice(0, -1), { ...p[p.length - 1], choice: label }, { id: next }]);

  return (
    <Root>
      <div className="viz dt">
        <p className="viz-title">Prompting, retrieval or fine-tuning: what fits your problem?</p>
        <ol className="dt-path">
          {path.map((step, i) => {
            const n = adaptation[step.id];
            const isLast = i === path.length - 1;
            return (
              <motion.li
                key={step.id}
                className={isLast ? 'is-current' : 'is-past'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                <span className="dt-dot" aria-hidden="true" />
                {'q' in n ? (
                  <>
                    <p className="dt-q">{n.q}</p>
                    {step.choice ? (
                      <p className="dt-a">{step.choice}</p>
                    ) : (
                      <div className="dt-options">
                        {n.options.map((o) => (
                          <button key={o.label} type="button" className="btn quiet" onClick={() => choose(o.label, o.next)}>
                            {o.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="dt-result">
                    <h3>{n.result.title}</h3>
                    <p>{n.result.body}</p>
                    {n.result.link && (
                      <p>
                        <a href={withBase(n.result.link.href)}>{n.result.link.label}</a>
                      </p>
                    )}
                  </div>
                )}
              </motion.li>
            );
          })}
        </ol>
        <div className="dt-actions">
          <button type="button" className="btn quiet" disabled={path.length === 1} onClick={() => setPath((p) => (p.length > 1 ? [...p.slice(0, -2), { id: p[p.length - 2].id }] : p))}>
            Back
          </button>
          <button type="button" className="btn quiet" disabled={path.length === 1} onClick={() => setPath([{ id: 'start' }])}>
            Start over
          </button>
        </div>
      </div>
    </Root>
  );
}
