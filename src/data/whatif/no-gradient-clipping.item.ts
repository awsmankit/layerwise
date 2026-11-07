import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-gradient-clipping',
  title: 'What if one huge gradient is allowed through?',
  blurb: 'Train a tiny recurrent network with and without gradient clipping: one long sequence gives a huge gradient, the weight is thrown over a cliff and the loss explodes, unless the gradient is capped.',
  area: 'training',
  level: 'intermediate',
  minutes: 5,
  why: [
    'A gradient says which way to move each weight and how steeply the loss slopes there. The size of each step is the learning rate times the gradient. Usually that is fine. But in some places the loss surface has a cliff: a point where the slope suddenly becomes enormous. A recurrent network (one that reuses the same weight at every step of a sequence) is a classic case. Its gradient gets multiplied by the weight once per step of the sequence, so for a weight a little above 1 on a long sequence it grows very fast. This is called the exploding gradient problem.',
    'Without a guard, one such gradient throws the weight far away. On this page the weight is about to settle near 1 when a long sequence arrives. Its gradient is about seven times the usual size, the weight jumps over the cliff edge at 1, and the very next gradient is more than a hundred times the usual. The weight is thrown to about minus 3 and the loss overflows. All the earlier progress is lost, and in a real run the loss would show up as a spike or as NaN.',
    'Gradient clipping by norm is the standard guard. If the length (norm) of the gradient is above a threshold, rescale it so its length equals the threshold, keeping its direction. Pascanu and colleagues proposed exactly this for exploding gradients in recurrent networks. The threshold matters. Too tight and training crawls. Too loose, as in the last slider setting here, and the big step still gets through. In practice people pick a threshold from the typical gradient size, and watch how often clipping triggers. The network on this page is a one-weight toy.',
  ],
  takeaways: [
    'A gradient can be huge at a cliff in the loss surface, and one huge step can undo a whole training run.',
    'Clipping by norm caps the length of the gradient and keeps its direction, so no step is bigger than the rate times the threshold.',
    'The threshold is a dial: too tight is slow, too loose lets the big step through.',
    'If the loss spikes or turns into NaN, check the gradient norm and consider clipping.',
  ],
  lessons: ['deep-learning/rnns-and-lstms', 'deep-learning/training-deep-networks', 'deep-learning/backprop-from-scratch'],
  sources: [
    { label: 'On the difficulty of training Recurrent Neural Networks (Pascanu, Mikolov and Bengio, 2012)', url: 'https://arxiv.org/abs/1211.5063' },
  ],
  updated: '2026-11-06',
  predict: {
    question: 'A tiny recurrent network is training smoothly. Then one long sequence arrives and its gradient is about seven times bigger than usual. If we let it through unchanged, what do you think happens?',
    options: [
      'Nothing much: the weight moves a bit more for that one step, then training carries on as before.',
      'The weight jumps over a cliff in the loss surface, the next gradient is even bigger, and the loss explodes within a step or two.',
      'The optimiser averages the big gradient with the earlier ones, so its effect is mostly cancelled.',
    ],
    answer: 1,
    why: 'The gradient of 9.9 at step 8 moves the weight from 0.98 to 1.28, past the cliff at 1. The next gradient is 140, the weight is thrown to minus 2.9, and the loss is past a trillion after step 9. With clipping at 1 the same run is trained by step 13.',
  },
};
