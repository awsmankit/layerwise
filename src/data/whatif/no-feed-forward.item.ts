import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-feed-forward',
  title: 'What if a transformer block has no feed-forward layer?',
  blurb: 'Remove the feed-forward layer from a toy block and see which jobs attention alone can still do and which it cannot.',
  area: 'llm',
  level: 'intermediate',
  minutes: 4,
  why: [
    'A transformer block has two main parts. Attention lets each token gather information from other tokens: each output is a weighted sum of value vectors. The feed-forward layer then works on every token separately and identically, with no information passing between tokens. In the original paper it is two linear steps with a ReLU between them, widening a 512-number token to 2048 inner numbers and back.',
    'So the two parts split the work. Attention does the mixing between tokens. The feed-forward layer does the per-token computation, and the ReLU in it is what makes that computation more than a straight-line recipe. In the toy on this page, copying a neighbour needs only mixing, a rule inside one token needs only the feed-forward layer, and comparing a token with its neighbour needs both. Take the feed-forward layer away and the last two jobs fail even when the readout is the best possible straight line.',
    'The page is a toy with hand-set numbers and a fixed attention pattern. Real attention weights depend on the input and real models stack many blocks, so it shows the division of labour, not a proof about every transformer. Real models keep the feed-forward layer: it is a large part of each block, and it is also where mixture-of-experts models put their experts.',
  ],
  takeaways: [
    'Attention moves information between tokens. The feed-forward layer processes each token on its own.',
    'In the toy, mixing alone solves "copy the neighbour" but cannot apply a rule such as XOR.',
    'A job that needs both, like comparing a token with its neighbour, breaks if either part is missing.',
    'The feed-forward layer is not a side detail: the paper widens each token from 512 to 2048 numbers inside it.',
  ],
  lessons: ['deep-learning/modern-llm-architecture', 'foundations/inside-a-transformer', 'deep-learning/inside-a-neural-network'],
  sources: [
    { label: 'Attention Is All You Need (Vaswani et al., 2017), sections 3.2 and 3.3', url: 'https://arxiv.org/abs/1706.03762' },
  ],
  updated: '2026-11-06',
};
