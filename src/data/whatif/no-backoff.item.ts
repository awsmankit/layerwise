import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-backoff',
  title: 'What if clients retry immediately when the server is overloaded?',
  blurb: 'Run a small simulation of a short burst of traffic and watch immediate retries pile up into a storm that never ends, while backoff with jitter lets the server recover.',
  area: 'serving',
  level: 'intermediate',
  minutes: 5,
  why: [
    'When a server is too busy it turns requests away, often with the HTTP status 429, which means too many requests. A well-behaved client then tries again later. The question is how much later. A client that retries at once adds its failed request back to the load in the very next moment, on top of everyone else\'s new requests.',
    'That is a retry storm. In the simulation here, the server handles 20 requests per tick (a tick is one step of the clock) and normal traffic is 14. A burst of 40 per tick for five ticks pushes it over. Turning a request away is not free, so in this model every rejection wastes a tenth of a request\'s work. With immediate retries the offered load keeps climbing, the server spends its effort rejecting, and it finishes almost nothing even after the burst is over.',
    'The fix is exponential backoff with jitter. Backoff means each failed try waits longer than the last: up to 2, then 4, then 8 ticks and so on, up to a cap. Jitter means the wait is a random number in that range, so clients do not all return at the same moment. The retries spread out, the server catches up, and the queue drains. A server can also send a Retry-After header to say how long to wait, and clients should honour it.',
    'This is a toy model with example numbers, not a measurement of any real service. It shows the shape: the same burst, the same server, and only the retry rule changes.',
  ],
  takeaways: [
    'A retry is new load. Retrying at once adds the failed requests back on top of fresh ones.',
    'Past its limit a server can serve less, not just the same, because rejecting requests also costs work.',
    'Exponential backoff spaces retries out, and jitter stops clients from returning in lockstep.',
    'Cap the number of retries or the waiting time, and honour a Retry-After header when one is sent.',
  ],
  lessons: ['cost/semantic-caching-and-batch-apis', 'serving/life-of-a-request', 'infra/kubernetes-and-autoscaling-for-inference'],
  sources: [
    { label: 'Exponential Backoff And Jitter (AWS Architecture Blog, Marc Brooker, 2015)', url: 'https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/' },
    { label: 'RFC 6585, section 4: 429 Too Many Requests and Retry-After', url: 'https://www.rfc-editor.org/rfc/rfc6585#section-4' },
  ],
  updated: '2026-11-06',
};
