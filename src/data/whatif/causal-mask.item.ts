import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'causal-mask',
  title: 'What if the model can see the words that come after?',
  blurb: 'Switch off the triangular mask in a toy next-word task and watch the model score 100% by peeking, then fail when the next word is not written yet.',
  area: 'llm',
  level: 'intermediate',
  minutes: 4,
  why: [
    'A language model that writes text learns one job: guess the next word from the words before it. Inside a transformer, attention lets each word read other words. In a decoder, which is the part that writes, each word is only allowed to read itself and the words to its left. A triangular mask enforces this: before the scores are turned into shares, every cell to the right of the diagonal is set to minus infinity, so its share becomes exactly zero.',
    'Take the mask away during training and the task changes. The word that is asked "what comes next?" can now read the answer in the next column. The easiest pattern to learn is "copy the next word", and it scores 100% on the practice text. In the toy on this page that is 5 of 5, against 3 of 5 for the masked word-pair table. But when the model really writes, the next word does not exist yet. The copy rule has nothing to copy and scores 0 of 5. The high score was a leak, not skill.',
    'The Transformer paper (Vaswani et al., 2017) builds the mask into the decoder for this reason. It says the decoder self-attention is modified "to prevent positions from attending to subsequent positions", and that this masking, with the outputs offset by one position, ensures predictions for position i depend only on known outputs at earlier positions. The encoder in the same paper has no such mask, because an encoder reads a whole input that already exists. Masks are also why one training pass can check every position at once: all the next-word questions are answered together without any of them seeing its own answer.',
  ],
  takeaways: [
    'The causal mask hides every word to the right, so each guess uses only what a real writer would have.',
    'Without it, a model can score 100% in training by copying the answer, and learn nothing useful for writing.',
    'A suspiciously perfect training score is a warning sign of a leak, not a success.',
    'Encoders that read a finished text do not need the mask. Decoders that write one word at a time do.',
  ],
  lessons: ['foundations/inside-a-transformer', 'foundations/attention-intuition', 'deep-learning/encoders-decoders-and-objectives'],
  sources: [
    { label: 'Attention Is All You Need (Vaswani et al., 2017), sections 3.1 and 3.2.3', url: 'https://arxiv.org/abs/1706.03762' },
  ],
  updated: '2026-11-06',
  predict: {
    question: 'We train a next-word predictor but let every word read the whole sentence, including the words after it. What do you think happens?',
    options: [
      'It trains a little better and writes a little better, because it has more information.',
      'It scores almost perfectly in training, then fails when it has to write live.',
      'Nothing changes much: the later words are just extra noise it learns to ignore.',
    ],
    answer: 1,
    why: 'The answer is sitting in the next column, so copying it scores 5 of 5 (100%) in practice. Live, the next word is not there yet and the same model gets 0 of 5, while the masked model gets 3 of 5 (60%) in both.',
  },
};
