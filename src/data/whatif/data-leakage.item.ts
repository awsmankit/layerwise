import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'data-leakage',
  title: 'What if test data leaks into training?',
  blurb: 'Score the same model two ways, split by row and split by speaker, and watch a near-perfect lab score fall when the speakers are new.',
  area: 'training',
  level: 'intermediate',
  minutes: 4,
  why: [
    'We hold back a test set to learn how the model will do on data it has never seen. That only works if the test data is really unseen. Data leakage means information the model will not have in real use slipped into training, so the score is too good and the real result disappoints.',
    'A common way this happens is a row split. Many datasets have groups of near-copies: several clips from one speaker, several scans from one patient, several photos of one product. Shuffling rows at random puts some of a group in training and some in test. A model that memorises then looks brilliant, because every test clip has a close sibling in training. In the demo, a 1-nearest-neighbour model copies the label of the closest training clip. It scores about 96 percent split by row and about 60 percent on speakers it has never heard, and the gap grows with the number of clips per speaker.',
    'The fix is to split by group, so that every clip of a speaker lands on one side. Tools such as scikit-learn\'s GroupKFold do this. The same rule covers preprocessing: split first, then fit any scaling or feature selection on the training part only. The data on this page is made up for the demo, so the exact scores are about this example, not about any real dataset.',
  ],
  takeaways: [
    'If the test set contains near-copies of training data, the score measures memory, not skill.',
    'Split by the unit you will meet in real use: new speakers, new patients, new days.',
    'With one clip per speaker there is nothing to leak. The more near-copies, the bigger the lie.',
    'Fit scaling and feature selection on training data only, after splitting.',
  ],
  lessons: ['foundations/classical-ml-essentials', 'ml/getting-data-ready', 'evals/building-an-eval-dataset'],
  sources: [
    { label: 'scikit-learn: Common pitfalls and recommended practices (data leakage)', url: 'https://scikit-learn.org/stable/common_pitfalls.html' },
    { label: 'scikit-learn: GroupKFold', url: 'https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.GroupKFold.html' },
  ],
  updated: '2026-11-06',
};
