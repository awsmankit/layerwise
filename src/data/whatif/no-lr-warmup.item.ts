import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-lr-warmup',
  title: 'What if training starts at the full learning rate?',
  blurb: 'Train a tiny three-layer network at the same peak rate with and without a short ramp-up, and watch the full-rate start explode while the ramped start trains.',
  area: 'training',
  level: 'intermediate',
  minutes: 4,
  why: [
    'The learning rate is the size of each step downhill. Warmup means starting with a very small rate and raising it in a straight line to the planned rate over the first few hundred or thousand steps, then carrying on. The original Transformer paper did exactly this: it raised the rate linearly for the first 4000 training steps and then lowered it again.',
    'Why not start at the full rate? At the very start the weights are random and the loss surface can be much steeper than it will be later. On this page the toy network starts so steep that the largest safe rate is 2 divided by 76, about 0.026. A rate of 0.3 is more than ten times that, so the first step overshoots by a huge amount and the loss goes from 24.5 to over 34,000, and then to more than a million by step 2. With a ten-step ramp the early steps are small enough to get out of the steep part, and by the time the rate reaches 0.3 the surface is flat enough to take it.',
    'Real systems do this for more than steepness. Adaptive optimisers such as Adam divide each step by an estimate built from earlier gradients, and at the beginning that estimate rests on very few. The RAdam paper reports that this adaptive rate has a problematically large variance early on and suggests warmup works as a variance reduction technique. This page uses plain gradient descent, so it shows only the steepness side of the story. The network is a toy.',
  ],
  takeaways: [
    'Warmup raises the learning rate gradually over the first steps instead of starting at the planned value.',
    'A rate that is safe in a flat region can be far too big in a steep one, and the start is often the steepest part.',
    'Too short a warmup can still fail. The bigger the peak rate, the longer the ramp it needs.',
    'If a run blows up or turns into NaN in its first steps, try warmup or a lower peak rate.',
  ],
  lessons: ['deep-learning/training-deep-networks', 'foundations/how-models-learn', 'deep-learning/backprop-from-scratch'],
  sources: [
    { label: 'Attention Is All You Need (Vaswani et al., 2017), section 5.3: linear warmup for 4000 steps, then decay', url: 'https://arxiv.org/abs/1706.03762' },
    { label: 'On the Variance of the Adaptive Learning Rate and Beyond (Liu et al., 2019)', url: 'https://arxiv.org/abs/1908.03265' },
  ],
  updated: '2026-11-06',
  predict: {
    question: 'A tiny network starts with big weights, so its loss surface is very steep at the start. We train it at a learning rate of 0.3, once from step 1 and once with a ten-step ramp up to 0.3. What do you think happens to the first run?',
    options: [
      'It is a bit noisier at the start but ends at about the same place.',
      'It overshoots further with every step and the loss explodes within a couple of steps.',
      'It trains faster, because bigger steps cover the distance sooner.',
    ],
    answer: 1,
    why: 'At 0.3 the first step sends the loss from 24.5 to over 34,000, and by step 2 it is past a million. With the ten-step ramp the loss is below 0.001 at step 6.',
  },
};
