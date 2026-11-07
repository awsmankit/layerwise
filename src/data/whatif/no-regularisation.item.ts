import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-regularisation',
  title: 'What if there is no regularisation?',
  blurb: 'Fit the same noisy points with and without weight decay: the curve wiggles through every dot, its weights explode and its error on new points jumps.',
  area: 'training',
  level: 'intermediate',
  minutes: 4,
  why: [
    'A model with plenty of freedom can bend itself to pass through every training example, including the random noise in them. That is overfitting: the training error is perfect, but the curve between and beyond the points is a wild guess, so the error on new data is bad.',
    'Regularisation limits that freedom. The most common kind, L2 or weight decay, adds a penalty to the loss for large weights: loss plus lambda times the sum of squared weights. Big weights are what it takes to make a curve swing sharply, so the penalty smooths the curve. The slider on this page sets lambda: none lets the weights explode, a middle value gives a smooth fit, and too much flattens the curve until it underfits.',
    'Real systems rarely tune this blindly. They hold out a validation set, try several strengths, and keep the one with the lowest validation error, as the page does here. Other forms of regularisation do the same job in other ways: dropout, early stopping, data augmentation, and simply having more data. The data on this page is a made-up toy.',
  ],
  takeaways: [
    'With no regularisation a flexible model can fit the noise: perfect on training data, poor on new data.',
    'Overfitting shows up as huge weights and a curve that swings between the training points.',
    'Weight decay penalises large weights, trading a little training error for much better error on unseen data.',
    'The strength is a dial: too little overfits, too much underfits. Pick it on validation data.',
  ],
  lessons: ['ml/overfitting-and-bias-variance', 'deep-learning/training-deep-networks', 'foundations/how-models-learn'],
  sources: [
    { label: 'scikit-learn: Ridge regression (L2 penalty on the size of the coefficients)', url: 'https://scikit-learn.org/stable/modules/linear_model.html#ridge-regression-and-classification' },
    { label: 'Decoupled Weight Decay Regularization (Loshchilov and Hutter, 2017)', url: 'https://arxiv.org/abs/1711.05101' },
  ],
  updated: '2026-11-06',
};
