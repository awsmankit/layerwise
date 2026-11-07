import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'model-collapse',
  title: 'What if models keep training on their own output?',
  blurb: 'In a toy with twelve words, train each generation on samples from the one before and watch the rare words vanish, unless fresh real data is mixed in.',
  area: 'training',
  level: 'intermediate',
  minutes: 5,
  why: [
    'A generative model learns the pattern of its training data and then writes new text or images that follow it. As more of the web is written by such models, the next models may be trained partly on that output. This page is a toy of what can go wrong, with 12 words instead of a language: a few are common ("the"), many are rare ("zither").',
    'Each generation here is trained on a finite sample from the one before. A rare word can easily get no draws in a sample, and then the new model gives it probability zero. It can never be written again, so every later generation is built from a poorer language. Rare words go first on average, and the variety of the output (its entropy) shrinks. The authors of the paper listed below report the same pattern in large language models, variational autoencoders and Gaussian mixture models: training on indiscriminately generated content makes the tails of the original distribution disappear. They call it model collapse.',
    'The sliders show what helps in the toy. A bigger sample loses words more slowly. Mixing real data into every round brings lost words back and holds the number of living words steady. Real systems are far more complicated, so this does not predict how fast any real model would degrade. The paper itself argues that data from real human interactions will become more valuable as generated content spreads.',
  ],
  takeaways: [
    'Learning from a finite sample of your own output loses rare cases first, and a case that is lost stays lost.',
    'The variety of what the model writes shrinks generation after generation.',
    'In the toy, bigger samples slow the loss, and fresh real data in every round holds it back.',
    'This is a toy with 12 words. The paper reports the effect in real model families, but not how fast it happens in practice.',
  ],
  lessons: ['foundations/training-pipeline', 'foundations/how-models-learn', 'ml/getting-data-ready'],
  sources: [
    { label: 'AI models collapse when trained on recursively generated data (Shumailov et al., Nature, 2024)', url: 'https://www.nature.com/articles/s41586-024-07566-y' },
    { label: 'The Curse of Recursion: Training on Generated Data Makes Models Forget (Shumailov et al., arXiv, 2023)', url: 'https://arxiv.org/abs/2305.17493' },
  ],
  updated: '2026-11-06',
  predict: {
    question: 'A model that has learned a language with a few common words and many rare ones writes 50 sample words. The next model learns only from those samples, and so on for 30 generations. What do you think happens to the language?',
    options: [
      'It stays about the same, because each model copies the one before.',
      'Rare words drop out one by one and never come back, so the language gets poorer.',
      'The common words fade and the rare words take over, because rare words are less repeated.',
    ],
    answer: 1,
    why: 'Averaged over 30 runs of this toy, only 2.7 of the 12 words are left after 30 generations. A word that is never drawn has probability zero and cannot return.',
  },
};
