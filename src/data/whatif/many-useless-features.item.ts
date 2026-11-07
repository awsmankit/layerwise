import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'many-useless-features',
  title: 'What if we add hundreds of features that mean nothing?',
  blurb: 'Add 0 to 500 columns of random numbers to a tiny training set and watch a flexible model fall from 97 percent to 67 percent while a simple regularised one holds at 97.',
  area: 'ml',
  level: 'intermediate',
  minutes: 5,
  why: [
    'A feature is one column of information about each example. It feels safe to add more: surely extra information cannot hurt. But a column that means nothing is not neutral. In a small training set, random columns still show chance patterns, and a flexible model cannot tell chance from signal.',
    'The demo has only 30 training rows. Two columns separate the classes; the rest are random numbers. The flexible model copies the label of the closest training row, and "closest" is measured over every column. With no useless columns it scores 97 percent on new rows. With 500 of them, the random columns swamp the two real ones in every distance and it falls to 67 percent, close to a coin flip. A linear model with an L1 (lasso) penalty keeps 97 percent, because the penalty drives the weights of columns that do not help to exactly zero. This is related to what is often called the curse of dimensionality: as columns multiply, a fixed number of rows covers the space more and more thinly.',
    'Real teams handle this by selecting features, by regularising, by getting more rows, and by checking on held-out data. scikit-learn\'s feature selection tools include removing near-constant columns, univariate tests, and L1-based selection, and its guide warns that L1 methods need enough samples to recover the right columns. The data here is a toy with a strong signal, so the exact percentages describe this example only.',
  ],
  takeaways: [
    'More columns is not free: columns that mean nothing add noise, and small training sets cannot tell it from signal.',
    'Models that compare examples by distance, like nearest neighbour, are hit hardest because every column counts equally.',
    'Regularisation, especially an L1 penalty, can switch useless columns off by giving them zero weight.',
    'Always judge a model on held-out rows. The training score would not show this damage.',
  ],
  lessons: ['ml/overfitting-and-bias-variance', 'ml/getting-data-ready', 'ml/linear-and-logistic-regression'],
  sources: [
    { label: 'scikit-learn: Feature selection (removing irrelevant features, L1-based selection, limits with few samples)', url: 'https://scikit-learn.org/stable/modules/feature_selection.html' },
  ],
  updated: '2026-11-06',
  predict: {
    question: 'A model learns from 30 examples where 2 columns really matter. We add 500 more columns of pure random numbers and let a flexible model copy the label of the closest example. What do you think happens to its score on new data?',
    options: [
      'It gets much worse, because the random columns swamp the two real ones when it decides which example is closest.',
      'It stays about the same, because random numbers have no pattern for the model to learn.',
      'It gets a little better, because the model now has more information to work with.',
    ],
    answer: 0,
    why: 'The flexible model falls from 97 percent with no useless columns to 67 percent with 500, close to a coin flip. A regularised linear model stays at 97 percent.',
  },
};
