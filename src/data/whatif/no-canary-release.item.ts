import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-canary-release',
  title: 'What if every change goes to every user at once?',
  blurb: 'Release the same bad change to everyone at once, or to 1% first and then step up with automatic rollback, and watch how many users are harmed as the minutes pass.',
  area: 'serving',
  level: 'intermediate',
  minutes: 4,
  why: [
    'A change to a model, a prompt or the code around them can break things in ways that tests did not catch. Tests run on examples someone thought of; real users bring the rest. If the change goes to everyone at once, everyone meets the bug at the same moment.',
    'A canary release sends the change to a small share of traffic first, while the old version keeps serving the rest. Google\'s site reliability book defines canarying as a partial and time-limited deployment of a change and its evaluation. Only the traffic that reaches the canary can be harmed, so the damage grows with the share exposed. If the monitor sees trouble, the change is rolled back automatically. If it stays quiet, the share steps up: here 1%, 5%, 25%, then everyone.',
    'The trade is time. A small canary has few requests, so it takes longer to collect enough failures to be sure something is wrong. In the simulation the all-at-once release is noticed after 1 minute and the canary after 12, yet the canary harms far fewer users because it was only on 5% of traffic when it was caught. The alarm rule matters too: a bad change that breaks only 1% of requests never crosses the 2% alarm line in either run.',
    'The counts on this page are expected values from a stated rule, not measurements: the alarm fires when the new version has failed at least 20 requests and at least 2% of its requests in the last 10 minutes, and rollback takes 3 minutes. Traffic and failure share are examples you can change.',
  ],
  takeaways: [
    'Releasing to everyone at once exposes every user to a bad change at the same time.',
    'A canary limits harm to the share of traffic it gets, then widens only while the monitor stays quiet.',
    'Small canaries detect more slowly, but harm far fewer users before the rollback.',
    'A canary is only as good as its alarm: a rule that cannot see a small failure rate will let it through.',
  ],
  lessons: ['systems/testing-and-deploying-ml-models', 'systems/monitoring-and-drift', 'evals/llmops-in-production'],
  sources: [
    { label: 'Canarying Releases (Google, Site Reliability Engineering Workbook)', url: 'https://sre.google/workbook/canarying-releases/' },
  ],
  updated: '2026-11-07',
  predict: {
    question: 'A bad change breaks 1 in 5 of the requests it handles. We release it to 1% of users first, widen it step by step and roll back automatically when failures pile up. Compared with releasing to everyone at once, what happens?',
    options: [
      'About the same number of users are harmed. The problem is just found sooner.',
      'Far fewer users are harmed, even though it takes longer to notice the problem.',
      'Far fewer users are harmed, and the problem is also noticed faster.',
    ],
    answer: 1,
    why: 'In the example, releasing to everyone harms 480 users and is noticed after 1 minute. The canary harms 42 users but is noticed only after 12 minutes, because so few requests reach it at first.',
  },
};
