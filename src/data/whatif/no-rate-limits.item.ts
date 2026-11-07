import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-rate-limits',
  title: 'What if one user can send unlimited requests?',
  blurb: 'Let one noisy user, or one buggy loop, flood a shared server and watch everyone else time out, then give each user a token bucket and see the others protected.',
  area: 'serving',
  level: 'intermediate',
  minutes: 4,
  why: [
    'A shared model server has one finite amount of work it can finish per second. Without limits, requests are served roughly in the order they arrive. That sounds fair, but it is only fair per request, not per person. A user who sends 100 requests for every request from another user gets about 100 times the share of the server.',
    'This happens by accident as often as by attack: a retry loop with a bug, a script that forgot to wait, or one big customer starting a batch job. In the example on this page, one user with a bug sends 100 requests per tick for 40 ticks. The queue grows far beyond what the server can finish in time, and the ten ordinary users, who have not changed at all, find that about two in five of their requests time out.',
    'A rate limit gives each user a budget. The usual method is a token bucket: each user has a bucket that holds a few tokens and refills at a steady rate, and each request spends one token. A request with no token left is turned away at once, usually with an HTTP 429 error and a retry-after hint. Small bursts are fine, because the bucket can be full, but a sustained flood is capped at the refill rate. Official API documentation describes this: Anthropic says its API uses the token bucket algorithm, with capacity continuously replenished up to the maximum rather than reset at fixed intervals, and that limits are meant to ensure fair distribution of resources among users.',
    'The limit protects the others, and it is unfair to the noisy user on purpose: in the example, 3,916 of its 4,000 burst requests are turned away. Real systems add limits per user, per key and per organisation, count tokens as well as requests, and give clients a clear way to back off. All numbers here come from a small seeded simulation with example settings.',
  ],
  takeaways: [
    'A shared first-come queue is fair per request, so one user sending many requests takes most of the server.',
    'The harm falls on other people: their requests wait, time out, and fail, even though they did nothing different.',
    'A token bucket per user caps a flood at the refill rate while allowing short bursts. Excess requests get an immediate 429.',
    'Limits should be tested with a noisy user in mind. They are a safety feature for everyone else, not a punishment.',
  ],
  lessons: ['systems/llm-app-system-design', 'serving/life-of-a-request', 'infra/kubernetes-and-autoscaling-for-inference'],
  sources: [
    { label: 'Anthropic Claude API documentation: Rate limits', url: 'https://platform.claude.com/docs/en/api/rate-limits' },
  ],
  updated: '2026-11-07',
};
