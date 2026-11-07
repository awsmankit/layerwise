import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'mixture-of-experts',
  title: 'What if every expert runs for every token?',
  blurb: 'Send a sentence through a mixture-of-experts layer with and without routing and watch the work per word grow.',
  area: 'llm',
  level: 'advanced',
  minutes: 4,
  why: [
    'In a mixture-of-experts (MoE) model, the feed-forward part of each layer is replaced by several copies, called experts, plus a small router. For each token the router scores the experts, picks the best few and mixes their outputs. The rest sit idle for that token. Mixtral 8x7B has 8 experts per layer and uses 2 per token. The Switch Transformer paper describes the same idea as a sparsely activated model: very many parameters, but roughly constant compute per example.',
    'Make every expert run for every token and the saving disappears. For the example shape on this page, which follows the Mixtral paper, each token would use all 46.7 billion weights instead of 12.9 billion. That is about 3.6 times the work per token. The model does not store fewer weights either way: the whole 46.7 billion must stay in memory because the next token may need a different expert.',
    'This is why MoE exists: a model can have the capacity of a large one at the per-token cost of a small one. The trade is real: all the experts must be kept in memory, and the router adds a small cost of its own. The router scores in the animation are made up, and the page does not measure answer quality.',
  ],
  takeaways: [
    'A router sends each token to a few experts. The others do nothing for that token.',
    'Total weights and active weights are different numbers: in the example, 46.7 B stored but 12.9 B used per token.',
    'Running every expert multiplies the work per token (about 3.6 times here) without storing anything less.',
    'All experts still have to sit in memory, so MoE saves compute, not memory.',
  ],
  lessons: ['deep-learning/modern-llm-architecture', 'infra/reading-a-gpu-spec-sheet', 'serving/inference-optimisation'],
  sources: [
    { label: 'Mixtral of Experts (Jiang et al., 2024): 8 experts per layer, 2 per token, 47B parameters with 13B active', url: 'https://arxiv.org/abs/2401.04088' },
    { label: 'Switch Transformers (Fedus et al., 2021): sparse activation with constant compute per example', url: 'https://arxiv.org/abs/2101.03961' },
  ],
  updated: '2026-11-06',
};
