import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-continuous-batching',
  title: 'What if the server waits for the whole batch to finish?',
  blurb: 'Watch slot lanes fill with replies of different lengths: static batching leaves finished slots idle until the longest reply ends, and continuous batching refills them at once.',
  area: 'serving',
  level: 'advanced',
  minutes: 5,
  why: [
    'A server writes replies for several people at once, one token per step, in a group called a batch. Replies have very different lengths: a yes or no, or a long essay. In static batching, the server starts a group together and only returns results, and starts the next group, when the longest reply in the group is finished. Every slot whose reply finished earlier does nothing, and its user waits for a reply that is already written.',
    'Continuous batching, also called iteration-level scheduling, makes the decision at every step instead of once per group. As soon as a reply ends, its slot is given to the next waiting request, and the finished reply is returned right away. The Orca paper (OSDI 2022) names the problem: with the old approach, a request that finishes early cannot be returned to the client, and a new request must wait until the whole current batch completes. Orca reports a large throughput gain on a 175-billion-parameter model at the same latency.',
    'In the example here, 40 waiting requests share 8 slots. With replies up to 300 tokens long, static batching keeps only about 43% of the slot-steps busy, and continuous batching keeps about 85% busy and finishes the same work in about half the steps. The remaining idle time for continuous batching is the tail at the end, when the queue is empty. Every number comes from the lengths on screen, with example timing.',
    'This is a simplified picture. Real systems also have to read the prompt (prefill), and they need memory for each active request\'s KV cache. The vLLM paper shows that managing that memory in small blocks (PagedAttention) lets more requests run together, and reports 2 to 4 times higher throughput than earlier systems at the same latency. Continuous batching is why modern servers can keep a GPU busy with chat traffic.',
  ],
  takeaways: [
    'In static batching, a batch lasts as long as its longest reply, so short replies leave their slots idle.',
    'Continuous batching schedules at every step: finished replies leave at once and waiting requests take the free slot.',
    'The same tokens are written either way. Continuous batching finishes sooner, uses the GPU better, and returns each reply earlier.',
    'The gain grows with the spread of reply lengths. It is limited by memory for each request\'s KV cache.',
  ],
  lessons: ['serving/inference-optimisation', 'serving/kv-cache-and-memory', 'serving/life-of-a-request'],
  sources: [
    { label: 'Orca: A Distributed Serving System for Transformer-Based Generative Models (Yu et al., OSDI 2022)', url: 'https://www.usenix.org/conference/osdi22/presentation/yu' },
    { label: 'Efficient Memory Management for Large Language Model Serving with PagedAttention (Kwon et al., 2023)', url: 'https://arxiv.org/abs/2309.06180' },
  ],
  updated: '2026-11-07',
};
