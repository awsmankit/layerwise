import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-time-aware-split',
  title: 'What if we shuffle time-ordered data before splitting?',
  blurb: 'Split a made-up monthly series two ways, at random and by time, and watch the shuffled test look about 2.7 times better than the future really is.',
  area: 'ml',
  level: 'intermediate',
  minutes: 4,
  why: [
    'We hold back a test set to learn how a model will do on data it has not seen. For things that happen in order, such as sales, sensor readings or prices, "not seen" has a special meaning: in real use the model only ever knows the past and must guess the future. If we shuffle the rows before splitting, many test rows sit between training rows. The model can see what happened just before and just after, so it is filling in gaps, not forecasting.',
    'In the demo the data is a made-up monthly number with a steady climb, a yearly cycle and a little noise. The model copies the average of the two nearest training months. Split at random, 24 of 24 test months have training months after them and the average miss is 2.7. Split by time, training on the first 72 months and testing on the last 24, the same model misses by 7.5, about 2.7 times more. The shuffled score was never wrong arithmetic. It answered an easier question than the one we care about.',
    'The fix is to split in time order: train on the past, test on the future. scikit-learn\'s TimeSeriesSplit does this with several folds, each one training on everything before its test block, so every fold looks forward only. Real work adds more care: leave a gap between training and test when features look back over a window, and watch for the same mistake in scaling or feature building. One caution: a model that continues the trend, such as a simple regression on time plus the season, would suffer much less from the shuffle. The point is that the shuffled score cannot tell you which kind of model you have.',
  ],
  takeaways: [
    'If the model will predict the future, test it on a future it has not seen: train on the past, test on what comes after.',
    'A shuffled split lets the model peek at both sides of every test point, so it rewards copying neighbours.',
    'The more the data trends or changes over time, the bigger the gap between the shuffled and the honest score.',
    'Expanding-window folds, as in TimeSeriesSplit, give several honest tests instead of one.',
  ],
  lessons: ['ml/time-series-forecasting', 'foundations/classical-ml-essentials', 'evals/building-an-eval-dataset'],
  sources: [
    { label: 'scikit-learn: TimeSeriesSplit (splits time-ordered data; the training sets grow, each test block comes after them)', url: 'https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html' },
  ],
  updated: '2026-11-06',
  predict: {
    question: 'We have 8 years of monthly numbers and want to forecast next year. We shuffle all the months, train on 75 percent and test on the other 25 percent. What do you think the test score will show?',
    options: [
      'About the same as a fair test, because shuffling only mixes up the order of the rows.',
      'Much better than reality, because each test month sits between training months and the model has seen what came after it.',
      'Worse than reality, because the training months are out of order and confuse the model.',
    ],
    answer: 1,
    why: 'Shuffled, 24 of 24 test months have training months after them and the average miss is 2.7. Split by time the same model misses by 7.5, about 2.7 times more.',
  },
};
