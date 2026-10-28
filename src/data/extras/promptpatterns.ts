import type { Extra } from '../lesson-extras';

export const extras_promptpatterns: Record<string, Extra> = {
  'llm/prompt-patterns-and-optimisation': {
    takeaways: [
      'Good few-shot examples are relevant, diverse and consistently formatted; vendor guidance suggests 3 to 5 as a starting point, and every example costs tokens on every call.',
      'Five workflow patterns cover most LLM products: chaining, routing, parallelization, orchestrator-workers and evaluator-optimizer. Start with the simplest one that passes your evals.',
      'Improve a prompt one change at a time against the same eval set, and keep a held-out set you check once at the end.',
      'Automatic optimisers such as DSPy search many prompts against your metric, so overfitting a small set is a real risk and the held-out set matters more.',
    ],
    prereq: ['llm/prompting-and-structured-output', 'evals/evals-101'],
    quiz: [
      {
        q: 'Your few-shot examples are five emails that all end up labelled "billing". What is the likely result?',
        options: [
          'The model may learn that everything is billing, because the examples are not diverse',
          'The model becomes more accurate, because the examples are consistent',
          'Nothing changes, because the model ignores examples after the first one',
          'I don’t know',
        ],
        answer: 0,
        why: 'Examples should be diverse so the model does not pick up an unintended pattern. Five look-alike examples teach the surface pattern, not the judgement.',
      },
      {
        q: 'Which workflow pattern sends each incoming email to a different prompt depending on whether it is about billing, a bug or a question?',
        options: ['Routing', 'Prompt chaining', 'Evaluator-optimizer', 'Orchestrator-workers'],
        answer: 0,
        why: 'Routing classifies an input and sends it to a specialised follow-up task. Chaining runs fixed steps in order, and the other two involve delegation or feedback loops.',
      },
      {
        q: 'Your edited prompt scores 94% on the 30 cases you tuned it on, but 71% on cases you set aside. What should you conclude?',
        options: [
          'It probably overfit the 30 cases: revert, and widen or diversify the set',
          'It is ready to ship, because 94% is above 90%',
          'The held-out set is too hard, so you should drop it',
          'I don’t know',
        ],
        answer: 0,
        why: 'A large gap between tuned cases and held-out cases is the sign of a prompt that memorised its tuning set. The held-out set exists to catch exactly this.',
      },
      {
        q: 'Your single prompt already meets its target on the eval set, and a teammate proposes a chain of four model calls "to be safe". What does the lesson say?',
        options: [
          'Add it, because more calls always improve accuracy',
          'Replace it with an agent, which needs fewer calls',
          'Hold off: every extra call adds latency and tokens, so add a pattern only when evals show a single prompt falls short',
          'Add it, but run the whole chain twice and take the majority',
        ],
        answer: 2,
        why: 'The lesson calls a pattern a cost: a chain adds a call per step and votes add roughly one call each. Add a pattern when your evals show a single prompt falls short, not before.',
      },
    ],
  },
};
