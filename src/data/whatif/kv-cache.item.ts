import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'kv-cache',
  title: 'What if there is no KV cache?',
  blurb: 'Watch a model write a reply with and without its key-value cache, and see why the work grows with the square of the length.',
  area: 'llm',
  level: 'intermediate',
  minutes: 4,
  why: [
    'To pick the next token, a transformer compares the newest token with every earlier token. For each earlier token it needs two vectors, a key and a value. Those vectors for old tokens never change, because earlier tokens do not change.',
    'The KV cache keeps them. With the cache, each new token costs one new key and value. Without it, the model recomputes the keys and values of the whole conversation at every step, so a reply of n tokens does about n squared over two units of work instead of n.',
    'The cache is not free. It uses memory for every token in the context, for every layer. For the example model on this page that is 128 KiB per token, so a 4,000-token conversation holds about 500 MiB of cache. That memory, not the arithmetic, is often what limits how many people one GPU can serve.',
  ],
  takeaways: [
    'Keys and values of old tokens never change, so a cache can reuse them.',
    'Without a cache, work per reply grows with the square of its length. With one, it grows in a straight line.',
    'The price of the cache is memory per token, per layer, per user. That is why long contexts and many users are hard to serve.',
  ],
  lessons: ['serving/kv-cache-and-memory', 'llm/context-window-and-caching'],
  sources: [
    { label: 'Attention Is All You Need (Vaswani et al., 2017)', url: 'https://arxiv.org/abs/1706.03762' },
  ],
  updated: '2026-11-06',
};
