import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-evals',
  title: 'What if we never run evals before shipping?',
  blurb: 'Change a made-up assistant six times: the average creeps up while one important group of cases breaks, and only a test set can show it.',
  area: 'agents',
  level: 'intermediate',
  minutes: 5,
  why: [
    'An eval is a fixed set of test cases that you run, and score, every time you change a model, a prompt or a tool. It is the AI version of a regression test suite. Each case has a pass or fail, so you can compare this release with the last one case by case, not by feel.',
    'Without one, a change gets judged by trying a few examples and reading the average mood. On this page a "polish the tone" release fixes six small cases and breaks five refund-rule cases. The overall pass rate goes up by one case, and with only 40 cases its 95% interval (the range the true rate probably sits in) overlaps the previous release, so the average alone cannot show any change. The important failure is hidden underneath it.',
    'With a test set you look at groups, not just the average, and you can set a rule such as "refund rules must pass at least 6 of 8, and must not lose more than one case at once". That rule blocks release 5 before a customer meets it. The 40 cases, the 6 releases and the skills behind them are a made-up example. Real eval sets are larger, cover real traffic and include the cases that have hurt before.',
    'Anthropic\'s engineering team describes the same loop for agents: without evals teams "wait for complaints, reproduce manually, fix the bug, and hope nothing else regressed", and regression evals ask whether the agent still handles all the tasks it used to.',
  ],
  takeaways: [
    'An average can rise while an important case breaks. Look at groups, and keep a list of cases that must never fail.',
    'With few test cases the interval around a pass rate is wide, so a small change in the average is mostly noise.',
    'Run the same test set on every change, to the prompt as well as to the model.',
    'Every bug a customer finds should become a new test case, so it can never come back unnoticed.',
  ],
  lessons: ['evals/evals-101', 'evals/evaluating-agents'],
  sources: [
    { label: 'Demystifying evals for AI agents (Anthropic Engineering)', url: 'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents' },
  ],
  updated: '2026-11-06',
};
