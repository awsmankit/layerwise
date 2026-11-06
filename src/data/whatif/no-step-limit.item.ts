import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-step-limit',
  title: 'What if an agent has no step or budget limit?',
  blurb: 'Watch a stuck agent loop retry a failing tool forever, with a cost meter that climbs every step and a cap that stops it.',
  area: 'agents',
  level: 'basic',
  minutes: 3,
  why: [
    'An agent works in a loop: the model decides, a tool runs, the result goes back to the model, and the model decides again. Most of the time the task ends and the loop ends with it. But a loop can also get stuck, for example when a tool keeps returning an error and the model keeps trying a slightly different request. Nothing in the loop itself says "stop".',
    'Every trip round the loop is a call to the model, and each call sends the whole history again. So each step costs a little more than the one before. In the example on this page (prices and sizes are made up for illustration) step 1 costs about one cent, step 200 about 37 cents, and the 200 steps together cost about $38 and 20 minutes, to get nowhere.',
    'The fix is simple and lives in the program around the model, not in the model. Set a maximum number of steps, a budget in money or tokens, and a time limit, and check them before every call. When one is hit, stop and report what happened to a person. Anthropic\'s guide to building agents recommends exactly this: include stopping conditions, such as a maximum number of iterations, to maintain control.',
  ],
  takeaways: [
    'A loop that has no exit condition other than "task done" can run forever when the task cannot be done.',
    'Cost grows faster than the number of steps, because each step re-sends a longer history.',
    'Limits belong in the program: a step cap, a money or token budget and a time limit, checked before every call.',
    'When a limit stops the agent, make it report back to a person with what it tried, not fail silently.',
  ],
  lessons: ['rag-agents/agents-and-tool-use', 'systems/human-in-the-loop-design', 'evals/evaluating-agents'],
  sources: [
    { label: 'Building effective agents (Anthropic Engineering)', url: 'https://www.anthropic.com/engineering/building-effective-agents' },
  ],
  updated: '2026-11-06',
};
