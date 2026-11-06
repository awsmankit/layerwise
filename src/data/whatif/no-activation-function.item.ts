import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-activation-function',
  title: 'What if a neural network has no activation functions?',
  blurb: 'Train a stack of layers on a pattern no straight line can split, with and without a bend between the layers, and watch the plain stack stay stuck.',
  area: 'training',
  level: 'basic',
  minutes: 3,
  why: [
    'A layer of a neural network does simple arithmetic: it multiplies its inputs by a grid of numbers (a matrix) and adds a few more. An activation function is a small bend applied to each result before it goes to the next layer. Common ones are ReLU, which clips negatives to zero, and tanh, which squashes numbers into the range from -1 to 1.',
    'Take the bends away and something surprising happens. A multiplication followed by another multiplication is just one bigger multiplication, so ten layers collapse into one layer with a different grid of numbers. The network can only ever draw a straight line (or flat plane) through its data. On this page the dots in opposite corners share a class, so no straight line can separate them, and the plain stack stays near 50%, whether it has two layers or five.',
    'Put a bend between the layers and the same layers can fold and twist the space, so the boundary curves around the dots. That is why every real network, from a small image classifier to a large language model, has an activation function (or something equivalent, such as the gating in a transformer feed-forward block) between its matrix multiplications.',
  ],
  takeaways: [
    'Without activations, any number of linear layers is the same as one linear layer.',
    'A single straight cut cannot separate dots that sit in opposite corners (the XOR pattern).',
    'The bend between layers is what lets depth add power.',
    'Linear layers still matter. The activation is what makes stacking them worth it.',
  ],
  lessons: ['deep-learning/inside-a-neural-network', 'deep-learning/backprop-from-scratch', 'foundations/how-models-learn'],
  sources: [
    { label: 'Stanford CS231n: Neural Networks Part 1, setting up the architecture', url: 'https://cs231n.github.io/neural-networks-1/' },
  ],
  updated: '2026-11-06',
};
