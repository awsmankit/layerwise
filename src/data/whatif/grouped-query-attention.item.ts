import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'grouped-query-attention',
  title: 'What if every attention head keeps its own keys and values?',
  blurb: 'Change how many key-value heads the heads share and watch the cache per token, and the number of conversations that fit in memory, move.',
  area: 'llm',
  level: 'advanced',
  minutes: 5,
  why: [
    'An attention head looks at earlier words with a query, and reads back what it finds through keys and values. Keys and values of old words never change, so a serving system keeps them in a cache instead of recomputing them. In standard multi-head attention every head keeps its own keys and values, for every layer, for every token of every conversation.',
    'For the example shape on this page (32 layers, 32 heads, 128 numbers per head, 16-bit numbers) that is 2 x 32 x 32 x 128 x 2 = 524,288 bytes, or 512 KiB, per token. A conversation of 8,192 tokens then holds 4 GiB. In an example 48 GiB left over after the weights, only 12 such conversations fit. The size of the cache, more than the arithmetic, decides how many people one GPU can serve.',
    'Multi-query attention (Shazeer, 2019) lets all heads share a single set of keys and values. The paper says decoding is slow because of the memory bandwidth spent repeatedly loading large key and value tensors, and sharing shrinks them, with only a minor loss in quality in its experiments. On this page that is 16 KiB per token and 384 conversations. Grouped-query attention (Ainslie et al., 2023) sits between: an intermediate number of key-value heads, such as 8, which gives 128 KiB per token and 48 conversations. The GQA abstract says it reaches quality close to multi-head attention at a speed comparable to multi-query, and that an existing multi-head checkpoint can be converted with about 5% of its original pre-training compute.',
    'The numbers here are memory arithmetic on an example shape, not measured results for any product. They do not tell you how much quality each choice costs. That is what the papers test.',
  ],
  takeaways: [
    'The cache holds keys and values for every layer, every key-value head and every token, so its size is proportional to the number of key-value heads.',
    'Letting groups of heads share keys and values shrinks the cache by that group size: 4 heads per group is 4 times smaller.',
    'A smaller cache per token means more conversations, or longer ones, in the same GPU memory.',
    'Multi-query is the extreme (one shared set), grouped-query is the middle ground, and multi-head is the other extreme (no sharing).',
  ],
  lessons: ['serving/kv-cache-and-memory', 'deep-learning/modern-llm-architecture', 'serving/inference-optimisation'],
  sources: [
    { label: 'GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints (Ainslie et al., 2023)', url: 'https://arxiv.org/abs/2305.13245' },
    { label: 'Fast Transformer Decoding: One Write-Head is All You Need (Shazeer, 2019)', url: 'https://arxiv.org/abs/1911.02150' },
  ],
  updated: '2026-11-06',
  predict: {
    question: 'Normally each of 32 attention heads keeps its own keys and values. If every group of 4 heads shared one set (8 sets instead of 32), how many more conversations would fit in the same memory?',
    options: [
      'About a quarter more, since only some of the heads change.',
      'About four times as many.',
      'About thirty-two times as many.',
    ],
    answer: 1,
    why: 'The cache grows with the number of key-value heads, so 8 instead of 32 is 4 times smaller: 128 KiB instead of 512 KiB per token. At 8,192 tokens in the 48 GiB example, 12 conversations become 48.',
  },
};
