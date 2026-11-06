import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-positional-encoding',
  title: 'What if the model has no positional encoding?',
  blurb: 'Feed "dog bites man" and "man bites dog" to a tiny attention layer with and without position, and see when the two become the same.',
  area: 'llm',
  level: 'intermediate',
  minutes: 4,
  why: [
    'Attention compares words with each other, but nothing in that comparison says where a word stands. A transformer reads all its words at once, with no left-to-right pass like the older recurrent models. So the original transformer adds a position signal to every word before the first layer. It used sine and cosine waves of different frequencies for this. Newer models often use other schemes, such as rotary position embeddings, which rotate the query and key vectors by an angle that depends on position.',
    'Remove that signal and the layer works on a bag of words. Shuffle the sentence and each word still gets exactly the same output, because it sees the same set of other words with the same scores. "Dog bites man" and "man bites dog" become the same input. The grids in the demo are identical, cell for cell, and the output bars are zero.',
    'The demo is a toy with no trained weights: 8-number word vectors made from a hash of each word, and the sine and cosine position pattern from the original paper. Real models learn far richer vectors, but the argument holds for them too.',
  ],
  takeaways: [
    'Plain attention only sees which words are there, not where they are.',
    'Without position, reordering a sentence changes nothing the model sees.',
    'Position is added to the word vectors (sine and cosine, learned, or rotary) so that order can affect the scores.',
    'Word order carries meaning: who did what to whom.',
  ],
  lessons: ['foundations/inside-a-transformer', 'foundations/attention-intuition', 'foundations/tokens-and-embeddings'],
  sources: [
    { label: 'Attention Is All You Need (Vaswani et al., 2017), section 3.5 Positional Encoding', url: 'https://arxiv.org/abs/1706.03762' },
    { label: 'RoFormer: Enhanced Transformer with Rotary Position Embedding (Su et al., 2021)', url: 'https://arxiv.org/abs/2104.09864' },
  ],
  updated: '2026-11-06',
};
