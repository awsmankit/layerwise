import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-batching',
  title: 'What if the server handles one request at a time?',
  blurb: 'Fill a GPU lane with waiting users and watch throughput climb and the cost per token fall, then switch batching off and watch the queue and the bill grow.',
  area: 'serving',
  level: 'intermediate',
  minutes: 5,
  why: [
    'A language model writes its reply one token at a time. For every token the GPU has to read all the model weights from memory. For an 8-billion-parameter model in 16-bit numbers that is 16 GB, read again for each new token. The arithmetic on those weights is quick. The reading is what takes the time, so we say decode is memory-bound.',
    'Because the weights are read anyway, the GPU can write the next token for many people in the same step. This is batching. Each extra person adds only their own KV cache (the stored keys and values of their conversation) to the read, which is small next to the weights. So in the example on this page, 16 people together get about 13 times the total output of one person, while each person is slowed by only about a fifth.',
    'Without batching, the GPU still costs the same per hour, but it produces tokens for one person at a time. Cost per token rises by the same factor that throughput falls, and everyone else waits in a queue. Real servers use continuous batching: they add new requests and drop finished ones at every step, instead of waiting for a whole group to finish. The limit is memory, because every extra user needs cache space.',
    'All hardware and price numbers here are examples chosen to show the shape, not measurements of any real GPU or provider.',
  ],
  takeaways: [
    'Decode is limited by reading the weights from memory, not by arithmetic, so a GPU serving one person is mostly idle.',
    'Batching shares one read of the weights between many people. Total tokens per second climb, and cost per token falls.',
    'Each extra person costs only their KV cache. The batch size is capped by memory, and each person gets a little slower as it grows.',
    'Without batching, the last person in a queue waits for every reply ahead of them.',
  ],
  lessons: ['serving/inference-optimisation', 'serving/life-of-a-request', 'serving/kv-cache-and-memory', 'infra/gpu-basics'],
  sources: [
    { label: 'Efficient Memory Management for LLM Serving with PagedAttention (Kwon et al., 2023)', url: 'https://arxiv.org/abs/2309.06180' },
  ],
  updated: '2026-11-06',
};
