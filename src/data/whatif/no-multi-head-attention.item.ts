import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-multi-head-attention',
  title: 'What if attention has only one head?',
  blurb: 'Give attention one head instead of several and see which facts about a word it can no longer pick up at the same time.',
  area: 'llm',
  level: 'intermediate',
  minutes: 3,
  why: [
    'Attention lets each word look at other words and take a weighted mix of what it finds. A single attention head produces one set of weights per word: one way of looking. To understand "ate" in "the tired cat quickly ate the fish" you need several things at once: who ate, what was eaten, how, and in what state.',
    'Multi-head attention runs several heads side by side, each with its own small set of learned numbers, and joins their outputs. The Transformer paper explains the reason in one line: with a single head, averaging inhibits looking at different positions in different ways. So one head must either choose a single pattern or blur several patterns into a flat average, and the demo shows both.',
    'In the paper the base model uses 8 heads, and each head works on 64 numbers (512 divided by 8) instead of one head working on all 512. The paper also notes that many heads appear to behave in ways related to the grammar and meaning of sentences. This page is a toy with hand-set patterns: trained heads are less tidy than "a grammar head" and "a nearby head", and the names are only for teaching.',
  ],
  takeaways: [
    'One head gives one set of weights, so it has to choose how to look.',
    'Several heads can look at grammar, nearby words and meaning at the same time, then their results are joined.',
    'Blending the patterns into one head flattens them: nothing stands out any more.',
    'The heads share the work: the paper splits the same 512 numbers across 8 heads of 64.',
  ],
  lessons: ['deep-learning/modern-llm-architecture', 'foundations/inside-a-transformer', 'llm/parameters-and-hyperparameters'],
  sources: [
    { label: 'Attention Is All You Need (Vaswani et al., 2017), section 3.2.2 on multi-head attention', url: 'https://arxiv.org/abs/1706.03762' },
  ],
  updated: '2026-11-06',
};
