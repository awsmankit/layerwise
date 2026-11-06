import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-normalisation',
  title: 'What if there is no normalisation?',
  blurb: 'Build a real random network layer by layer and watch the numbers inside it blow up or fade away unless something keeps them in check.',
  area: 'training',
  level: 'intermediate',
  minutes: 4,
  why: [
    'Every layer of a network multiplies its input by a grid of weights. If the weights are a little too big, each layer makes the numbers a little bigger, and after many layers they are enormous. If the weights are a little too small, the numbers shrink toward zero. The drift is multiplied in at every layer, so it grows exponentially with depth. The same happens to the gradients (the learning signals) travelling backward.',
    'Careful starting weights can keep the size steady at the start, which is what the slider value 1.00 shows. But training changes the weights all the time, and the tuning does not last. Without a fix, deep networks need tiny learning rates and still fail often, and very large numbers can overflow the 16-bit number formats that GPUs use for speed (their largest finite value is 65,504).',
    'Normalisation layers fix this by rescaling the numbers at every layer to a fixed size. Batch normalisation (Ioffe and Szegedy, 2015) does this using statistics across a mini-batch of examples. Layer normalisation (Ba, Kiros and Hinton, 2016) uses the numbers of one example, so it does not depend on batch size, and it is what transformers use. Either way the bars on this page stay level whatever the starting weights.',
  ],
  takeaways: [
    'Layers multiply their input, so a small error in scale compounds at every layer.',
    'Starting weights that are only 20% too big can make the numbers hundreds of times larger after 24 layers.',
    'Normalisation resets the scale at each layer, so depth no longer makes the numbers drift.',
    'Normalised networks tolerate bigger learning rates and sloppier starting weights.',
  ],
  lessons: ['deep-learning/training-deep-networks', 'deep-learning/modern-llm-architecture', 'deep-learning/backprop-from-scratch'],
  sources: [
    { label: 'Batch Normalization (Ioffe and Szegedy, 2015)', url: 'https://arxiv.org/abs/1502.03167' },
    { label: 'Layer Normalization (Ba, Kiros and Hinton, 2016)', url: 'https://arxiv.org/abs/1607.06450' },
  ],
  updated: '2026-11-06',
};
