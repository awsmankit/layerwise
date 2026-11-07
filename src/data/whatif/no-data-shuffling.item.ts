import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-data-shuffling',
  title: 'What if training data is fed in a fixed order, never shuffled?',
  blurb: 'Train a tiny classifier on the same points twice, once in class order and once shuffled, and watch the loss lurch and the model lean toward the last class it saw.',
  area: 'training',
  level: 'basic',
  minutes: 4,
  why: [
    'Training works in small batches. After each batch the model nudges its weights to do better on the examples it just saw. If every batch looks like a fair sample of all the data, each nudge points roughly the right way. Shuffling the data before every pass (an epoch) is how we make that true.',
    'Without shuffling, the order of the data matters. On this page the points are sorted: six batches of only class A, then six of only B, then six of only C. While it sees only A, the cheapest way to lower the loss is to label everything A. Then B arrives and pulls it back, then C. Each pass ends on C, so the model keeps leaning toward the class it saw last, and the loss measured on all the points lurches instead of falling smoothly. This is a toy; networks with many layers can forget even more, because later batches overwrite what earlier ones taught.',
    'Real training pipelines shuffle by default or by one setting (PyTorch data loaders have a shuffle option for exactly this). Very large runs often shuffle once into a fixed random order or mix several data sources, so no batch is all one topic. Sorting is sometimes done on purpose, for example to group similar lengths together, but then the groups themselves are shuffled.',
  ],
  takeaways: [
    'Each step only sees one batch, so a batch of one class pulls the model toward that class.',
    'Fed in class order, the model ends every pass biased toward the class it saw last and its loss lurches.',
    'Both runs saw exactly the same points the same number of times. Only the order changed.',
    'Shuffle every epoch so each batch is a fair sample of the whole data.',
  ],
  lessons: ['deep-learning/training-deep-networks', 'foundations/how-models-learn', 'ml/getting-data-ready'],
  sources: [
    { label: 'PyTorch documentation: torch.utils.data (DataLoader and its shuffle option)', url: 'https://docs.pytorch.org/docs/stable/data.html' },
  ],
  updated: '2026-11-06',
  predict: {
    question: 'We train a tiny classifier on three groups of points, but feed all of group A first, then all of B, then all of C, and repeat. A second run uses the same points shuffled. What do you think happens to the first one?',
    options: [
      'Nothing much: it sees every point the same number of times, so the order cannot matter.',
      'Its loss lurches, and at the end of every pass it leans toward the group it saw last.',
      'It learns group A perfectly and never learns B or C, because A came first.',
    ],
    answer: 1,
    why: 'At the default rate the fixed-order run ends with a loss of 0.85 against 0.50 for the shuffled run, and it labels 51% of all points C, the group it saw last, where a fair model says 33%.',
  },
};
