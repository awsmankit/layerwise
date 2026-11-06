import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-validation-set',
  title: 'What if we never hold out data to check?',
  blurb: 'Fit models of growing size to a few noisy points and see why picking by training error always chooses the one that fails on new data.',
  area: 'training',
  level: 'basic',
  minutes: 4,
  why: [
    'Training error measures how well a model fits the examples it learned from. A bigger model can always fit those examples at least as well as a smaller one, so training error only ever falls. A model with enough freedom can pass through every point, noise included, and score almost zero. That is overfitting: it memorised the examples instead of the pattern.',
    'The fix is to keep some data out of training. A validation set (held-out examples) tells you how the model does on things it has not seen. That error falls at first, then climbs when the model starts fitting the noise, and the lowest point is the model worth keeping. Here the wiggly size-11 model has a training error near zero and a huge error on new points, while a middle size is the best choice.',
    'Real projects usually keep three parts: training data to fit the model, validation data to choose between models and settings, and a test set looked at once at the end so the final number is honest. When data is scarce, cross-validation rotates which part is held out. If you tune against the same data you report on, even the held-out score becomes optimistic.',
  ],
  takeaways: [
    'Training error can only fall as a model grows, so it cannot tell you when to stop.',
    'Error on data the model has not seen falls, then rises: the bottom of that curve is your model.',
    'Keep a validation set for choosing and a separate test set for the final score.',
    'Never evaluate a model on the data it was trained or tuned on and call it its real performance.',
  ],
  lessons: ['ml/overfitting-and-bias-variance', 'foundations/how-models-learn', 'deep-learning/training-deep-networks'],
  sources: [
    { label: 'scikit-learn: Cross-validation, evaluating estimator performance', url: 'https://scikit-learn.org/stable/modules/cross_validation.html' },
  ],
  updated: '2026-11-06',
};
