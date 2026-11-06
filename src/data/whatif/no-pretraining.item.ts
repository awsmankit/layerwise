import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-pretraining',
  title: 'What if we train from scratch instead of starting from a pretrained model?',
  blurb: 'A toy transfer-learning world: learn a new task from a few labelled examples, starting from random weights or from features learned on a bigger related task.',
  area: 'training',
  level: 'intermediate',
  minutes: 5,
  why: [
    'Pretraining means first training a model on a big, general task, then reusing what it learned for your own task. A model trained from scratch has to work out everything from your examples alone. A pretrained one already knows which directions in the data matter and which to ignore, so it needs far fewer labelled examples.',
    'The page is a toy, not a real language or vision model. In this made-up world only 3 hidden factors decide the labels, while 5 other factors shake the numbers around a lot and mean nothing. With very few labels a fresh network cannot tell the two kinds apart and partly fits the nuisance. The pretrained features already ignore it, because they learned from 600 examples of related tasks. Give the scratch network more labels and it catches up, which is why the gap shrinks on the right of the bar chart.',
    'Real systems work the same way at a much larger scale. Yosinski and colleagues found that features from early layers of an image network are general, becoming more task specific toward the output, and that transferred features can beat random ones even when the tasks differ. Language models are pretrained on huge text collections and then fine-tuned or prompted for specific jobs. Training from scratch is still right when you have a lot of data and a very different domain.',
  ],
  takeaways: [
    'Pretraining turns a big related dataset into reusable features.',
    'The fewer labelled examples you have, the more a pretrained start helps.',
    'With plenty of labelled data the gap closes, and training from scratch can be the right call.',
    'The more different the new task is from the pretraining task, the smaller the benefit.',
  ],
  lessons: ['deep-learning/self-supervised-and-transfer-learning', 'llm/fine-tuning-in-practice', 'foundations/training-pipeline'],
  sources: [
    { label: 'How transferable are features in deep neural networks? (Yosinski et al., 2014)', url: 'https://arxiv.org/abs/1411.1792' },
  ],
  updated: '2026-11-06',
};
