import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-flash-attention',
  title: 'What if attention stores the whole n-by-n score table?',
  blurb: 'See how the table of attention scores grows with the square of the prompt length, when it stops fitting in an example GPU, and what computing it in tiles changes.',
  area: 'llm',
  level: 'advanced',
  minutes: 5,
  why: [
    'To decide what to look at, attention gives every token a score against every other token. For a prompt of n tokens that is a table with n by n scores, one table per head. Double the prompt and the table is four times bigger. The FlashAttention paper (Dao et al., 2022) says that standard implementations write this score matrix, and the softmax result computed from it, to the GPU\'s main memory (called HBM), which takes O(N squared) memory.',
    'For the example on this page, with 32 heads and 16-bit scores, one layer needs 4 GiB for the table at 8,192 tokens, 16 GiB at 16,384, 64 GiB at 32,768 and 1 TiB at 131,072. Against an example 24 GiB GPU, the table alone stops fitting at about 20,000 tokens, even if the weights took no room at all. These are arithmetic on example sizes, not measurements of any product.',
    'FlashAttention avoids the table. It splits the work into tiles small enough for the chip\'s fast on-chip memory, and keeps a running maximum and sum for each row so that the softmax can be finished tile by tile. The paper says it computes exact attention, not an approximation, and that it needs O(N) additional memory beyond the inputs and output. It does somewhat more arithmetic than the standard method, but far fewer reads and writes of main memory, which is where the paper places the cost. It also recomputes the scores in the backward pass of training instead of storing them. The paper reports faster training on several benchmarks; this page does not repeat any speed figure.',
    'The size of the score table is not the only memory cost of a long prompt. The cache of keys and values also grows with length, but in a straight line. The table is the part that grows with the square.',
  ],
  takeaways: [
    'The score table has n by n entries per head, so doubling the prompt makes it four times bigger.',
    'Storing it whole is what makes long prompts run out of memory, long before the arithmetic is the problem.',
    'Computing attention in tiles gives the same exact answer while the extra memory grows only in a straight line with n.',
    'The fix changes where data is kept and moved, not what is computed.',
  ],
  lessons: ['serving/inference-optimisation', 'foundations/inside-a-transformer', 'serving/kv-cache-and-memory'],
  sources: [
    { label: 'FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness (Dao et al., 2022)', url: 'https://arxiv.org/abs/2205.14135' },
  ],
  updated: '2026-11-06',
  predict: {
    question: 'Attention scores every token against every other token. If you double the length of the prompt, what happens to the size of the table of scores?',
    options: [
      'It doubles, because there are twice as many tokens.',
      'It becomes four times bigger.',
      'It grows only slightly, because most scores are close to zero after the softmax.',
    ],
    answer: 1,
    why: 'The table has n by n entries, so doubling n gives four times as many. With 32 heads and 16-bit scores (example), 8,192 tokens need 4 GiB and 16,384 tokens need 16 GiB, and every score is still stored even when it is small.',
  },
};
