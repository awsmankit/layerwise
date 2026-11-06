import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-prompt-caching',
  title: 'What if there is no prompt caching?',
  blurb: 'Send the same long prefix 1,000 times and see how many tokens and dollars a cache saves, and how low a hit rate can fall before it stops paying.',
  area: 'serving',
  level: 'basic',
  minutes: 4,
  why: [
    'Most AI apps start every call with the same long block of text: instructions, rules, examples, maybe a document. A model has no memory between calls, so that block is sent again each time, and the model reads all of it again. You are billed for every one of those input tokens, even though nothing in the block has changed.',
    'Prompt caching lets the provider keep the processed form of that shared start (the prefix) for a short time. A later call that begins with exactly the same prefix reads it from the cache instead of starting over. This is called a cache hit. Hits are billed at a discount and the first token arrives sooner. Cached text has to match from the very start of the prompt, so put the fixed part first and the changing part last.',
    'Caches are not free. A call that misses may pay a surcharge to write the prefix into the cache. With the example prices on this page, a read costs 0.1 times the normal price and a write 1.25 times, so caching only wins when more than about 22 calls in 100 are hits. Providers differ in price, lifetime and minimum prefix size, so check the documentation of yours.',
    'The price and discount shown are examples. The page uses 0.1 and 1.25 because those are the rates one provider documents for most of its models with a 5-minute cache.',
  ],
  takeaways: [
    'Without a cache, a long shared prefix is read and billed in full on every single call.',
    'A cache hit reads the prefix at a discount. With a high hit rate the input bill can fall by three quarters or more.',
    'The cache matches from the start of the prompt, so put fixed text first and changing text last.',
    'Writing the cache costs extra. If few calls hit, caching can cost more than it saves.',
  ],
  lessons: ['llm/context-window-and-caching', 'cost/cost-levers', 'cost/where-the-tokens-go', 'serving/inference-optimisation'],
  sources: [
    { label: 'Prompt caching (Anthropic documentation)', url: 'https://platform.claude.com/docs/en/build-with-claude/prompt-caching' },
  ],
  updated: '2026-11-06',
};
