import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-tokenizer',
  title: 'What if there is no tokenizer and the model reads single characters?',
  blurb: 'Cut the same sentence into characters, toy subwords and words, and watch the attention table and the context window fill up.',
  area: 'llm',
  level: 'intermediate',
  minutes: 4,
  why: [
    'A tokenizer cuts text into pieces called tokens before the model sees it. Common words become one token, rarer words become a few pieces, and anything unknown can fall back to smaller parts. Subword methods such as byte-pair encoding were introduced so a model with a fixed vocabulary could still read rare and new words as sequences of smaller units.',
    'Skip the tokenizer and the model reads characters or bytes. Nothing is ever unknown, but the sequence gets several times longer. In a transformer every token looks at every earlier token, so the number of pairs grows with the square of the length. The attention table in the demo is that table: the character version is far bigger than the subword one for the very same sentence. The context window also fills up faster, because it is counted in tokens.',
    'The numbers on this page come from a toy split with a small hand-made vocabulary, so real counts differ. Models that read bytes do exist. The ByT5 authors show that a standard transformer can process byte sequences, report them as competitive with token-level models, and note that byte or character sequences are longer than token sequences. They also report them as more robust to noise and better at tasks that depend on spelling. Most large language models still use a tokenizer to keep sequences short.',
  ],
  takeaways: [
    'The same text becomes a much longer sequence when read as characters.',
    'Attention work grows with the square of the sequence length, so a 4 times longer text costs about 16 times more.',
    'A fixed context window holds less text when each token is one character.',
    'Subwords are a compromise: short sequences, and rare words can still be built from smaller pieces.',
  ],
  lessons: ['deep-learning/build-a-tokenizer', 'foundations/tokens-and-embeddings', 'llm/context-window-and-caching'],
  sources: [
    { label: 'Neural Machine Translation of Rare Words with Subword Units (Sennrich et al., 2015)', url: 'https://arxiv.org/abs/1508.07909' },
    { label: 'ByT5: Towards a token-free future with pre-trained byte-to-byte models (Xue et al., 2021)', url: 'https://arxiv.org/abs/2105.13626' },
  ],
  updated: '2026-11-06',
};
