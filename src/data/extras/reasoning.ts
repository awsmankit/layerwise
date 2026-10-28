import type { Extra } from '../lesson-extras';

export const extras_reasoning: Record<string, Extra> = {
  'llm/reasoning-models': {
    takeaways: [
      'A reasoning model writes its own working before the answer. That thinking comes first, so you wait for it, and it is billed as output tokens.',
      'You are billed for the full thinking, not the short summary a provider may show you, and it counts against your output limit.',
      'OpenAI, Anthropic and Google each expose a dial (reasoning effort, effort, thinking level); read the real thinking tokens from the usage fields.',
      'Give a thinking model the goal, the constraints and the output format, not the steps. Lower the effort setting before reaching for prompt tricks.',
      'Decide with an eval: run at two effort levels and compare pass rate, tokens and time, then pick the lowest setting that passes, judged by cost per solved task.',
    ],
    prereq: ['llm/prompting-and-structured-output', 'evals/evals-101'],
    quiz: [
      {
        q: 'A request uses 600 thinking tokens and 150 answer tokens. How many tokens are billed as output?',
        options: ['150, because only the answer is visible', '750, because thinking is billed as output', '600, because only the thinking counts', 'I don’t know'],
        answer: 1,
        why: 'All three providers bill the full thinking as output tokens, on top of the answer: 600 + 150 = 750. The summary you see is not what you pay for.',
      },
      {
        q: 'A reasoning model sometimes returns no answer at all, even though the request succeeded. What is the most likely cause?',
        options: [
          'The output limit was used up by thinking before the answer started',
          'The model refuses to answer short questions',
          'Thinking tokens are not counted against the limit',
          'I don’t know',
        ],
        answer: 0,
        why: 'Thinking counts against the output limit. If the limit runs out while the model is still thinking, the response can stop before any visible answer, so size the limit for thinking plus the answer.',
      },
      {
        q: 'Which request is the best fit for low or no thinking?',
        options: ['Plan a three-step database migration', 'Classify a support email into one of five categories', 'Find a bug that spans four files', 'I don’t know'],
        answer: 1,
        why: 'Provider guidance puts fact retrieval and classification at low or no thinking; multi-step planning and debugging are where extra thinking tends to pay off.',
      },
      {
        q: 'On 10 test cases, setting A costs $0.023 and solves 5; setting B costs $0.083 and solves 8. Which has the lower cost per solved task?',
        options: ['B, because it solves more', 'A, about $0.0046 against about $0.0104', 'They are equal', 'I don’t know'],
        answer: 1,
        why: 'Cost per solved task is total spend divided by tasks solved: 0.023 ÷ 5 ≈ $0.0046 for A and 0.083 ÷ 8 ≈ $0.0104 for B. B solves more, and may still be worth it if a wrong answer is costly.',
      },
    ],
  },
};
