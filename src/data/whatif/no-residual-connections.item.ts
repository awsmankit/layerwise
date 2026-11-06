import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-residual-connections',
  title: 'What if deep networks have no skip connections?',
  blurb: 'Send an error signal backward through a deep stack, with and without skip connections, and see how much of it reaches the first layers.',
  area: 'training',
  level: 'intermediate',
  minutes: 4,
  why: [
    'A deep network learns by sending the error backward, layer by layer. At each layer the signal (the gradient) is multiplied by that layer\'s slope. Many common layers have slopes below 1, and the sigmoid used here has a slope of at most 0.25. Multiply many small numbers together and the signal fades toward nothing, so the early layers get almost no instructions and barely change.',
    'A skip (or residual) connection adds a layer\'s input straight to its output: new = old + small change. When the error travels backward it now has a direct path of size 1 around every layer, so it cannot fade the way it did before. The bars on this page are measured on a real random stack of 32-unit layers, not typed in.',
    'He et al. (2015) introduced residual networks and trained them up to 152 layers on ImageNet, and analysed networks of 100 and 1,000 layers on CIFAR-10. Modern transformers use a skip around every attention and feed-forward block. Newer activations and normalisation also help, so the fading here is the sigmoid worst case, but the direct path is still what lets very deep stacks train at all.',
  ],
  takeaways: [
    'The error signal is multiplied by every layer it passes. Small factors compound into almost nothing.',
    'A skip connection gives the signal a direct route of size 1 to every layer.',
    'This is why transformers, which stack dozens of layers, put a skip around every block.',
    'Each skip block learns a small correction to its input, which is easier than learning the whole thing.',
  ],
  lessons: ['deep-learning/backprop-from-scratch', 'deep-learning/training-deep-networks', 'deep-learning/modern-llm-architecture'],
  sources: [
    { label: 'Deep Residual Learning for Image Recognition (He et al., 2015)', url: 'https://arxiv.org/abs/1512.03385' },
  ],
  updated: '2026-11-06',
};
