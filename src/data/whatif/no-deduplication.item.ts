import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-deduplication',
  title: 'What if the training data is not deduplicated?',
  blurb: 'Train a toy model on a pile of text with repeats: it parrots the repeated line, and its validation score looks better than it should because test lines leaked into training.',
  area: 'training',
  level: 'intermediate',
  minutes: 4,
  why: [
    'Text collected from the web is full of repeats: the same licence footer on thousands of pages, the same article posted on many sites, the same page scraped twice. If you leave them in, two things go wrong.',
    'First, the model learns the repeated text far better than anything else, because it sees it so often. When it writes freely, the repeated text comes back out in proportion. The paper "Deduplicating Training Data Makes Language Models Better" (Lee et al., 2021) reports that over 1% of the unprompted output of models trained on common datasets was copied verbatim from the training data, and that one 61-word sentence appeared over 60,000 times in the C4 dataset. Training on deduplicated data, it found, made models emit memorised text ten times less often.',
    'Second, the validation set is made by splitting the same pile. If a line is in the pile twice, one copy can land in training and the other in validation, and the model is then "tested" on something it has already seen. The paper reports that such train-test overlap affected over 4% of the validation set of standard datasets. The score looks better than the model deserves. Real pipelines remove exact and near-duplicate text before splitting. The collection and the model on this page are toys, and the numbers shown come from them, not from the paper.',
  ],
  takeaways: [
    'Repeats in training data get memorised, and the model repeats them back when it writes on its own.',
    'If duplicates are split across training and validation, the validation score is inflated: memory looks like skill.',
    'Deduplicate before splitting, then check how much of the validation set also appears in training.',
    'Near-duplicates (same text with small changes) need fuzzier matching than exact repeats; this toy removes only exact ones.',
  ],
  lessons: ['ml/getting-data-ready', 'foundations/training-pipeline', 'deep-learning/self-supervised-and-transfer-learning'],
  sources: [
    { label: 'Deduplicating Training Data Makes Language Models Better (Lee et al., 2021)', url: 'https://arxiv.org/abs/2107.06499' },
  ],
  updated: '2026-11-06',
};
