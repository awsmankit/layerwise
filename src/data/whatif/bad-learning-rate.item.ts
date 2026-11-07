import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'bad-learning-rate',
  title: 'What if the learning rate is too high or too low?',
  blurb: 'Slide the step size of gradient descent on a real loss surface and watch it crawl, glide, zigzag or blow up, with the steps to reach the goal counted.',
  area: 'training',
  level: 'basic',
  minutes: 3,
  why: [
    'Training a network means lowering a number called the loss by taking many small steps downhill. At each step the computer works out which way is downhill (the gradient) and moves a little that way. The learning rate is how big "a little" is.',
    'If it is too small, every step is safe but tiny, and training needs hundreds or thousands of steps to get where a better rate gets in a few dozen. If it is too big, a step jumps past the bottom of the valley and lands higher on the other side. The next step jumps back even further, and the loss grows instead of falling. On the bowl on this page the rule is exact: it converges only below 2 divided by the steepness of the steepest direction.',
    'Real networks have millions of directions with very different steepness, so one number has to suit all of them, and the best value changes during training. That is why practitioners treat the learning rate as the first setting to tune. Common remedies are a warm-up at the start, a schedule that lowers the rate over time, and optimisers such as Adam that scale the step for each weight. The bowl here is a toy; real loss surfaces are bumpier.',
  ],
  takeaways: [
    'The learning rate is the size of each step downhill. Too small wastes time, too large overshoots.',
    'On a stretched valley the steepest direction sets the limit: above 2 divided by its steepness, every step makes things worse.',
    'The fastest rate can still zigzag. A slightly smaller one is often smoother.',
    'If the loss goes up or turns into NaN, lower the learning rate first.',
  ],
  lessons: ['deep-learning/training-deep-networks', 'foundations/how-models-learn', 'deep-learning/backprop-from-scratch'],
  sources: [
    { label: 'Cyclical Learning Rates for Training Neural Networks (Smith, 2015)', url: 'https://arxiv.org/abs/1506.01186' },
  ],
  updated: '2026-11-06',
};
