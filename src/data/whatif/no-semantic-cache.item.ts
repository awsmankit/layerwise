import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-semantic-cache',
  title: 'What if every repeated question goes to the model again?',
  blurb: 'Send 60 near-duplicate questions through no cache, an exact-match cache and a similarity cache, and see the hits, the savings and the wrong answers a loose threshold causes.',
  area: 'serving',
  level: 'intermediate',
  minutes: 5,
  why: [
    'Many real questions are asked again and again: how do I reset my password, when are you open. Without a cache, every one of them goes to the model, which costs money for every token and takes a couple of seconds, even when the answer is the same as it was a minute ago.',
    'An exact-match cache stores the answer under the exact text of the question. It is safe, because the same words really do mean the same question, but it only helps when someone repeats themselves word for word. A semantic (similarity) cache turns each question into a vector of numbers called an embedding, and reuses a stored answer when a new question is close enough to an old one. This catches rephrasings, so it saves much more.',
    'The risk is the threshold, the line for how close is close enough. Set it too loose and look-alike questions share answers: cancelling an order and tracking an order, or the weather in two different cities. The user gets a confident, wrong answer and nobody sees an error. On this page, similarity is plain word overlap on a made-up question bank, a crude stand-in for an embedding, so the exact numbers are a toy. The shape is real: a looser threshold buys more hits and more wrong answers together.',
    'One paper reports that caching query embeddings in Redis cut calls to the language model by up to 68.8%, with over 97% of the hits judged accurate. Another argues that one fixed threshold for every question gives no guarantee about the error rate, and proposes learning a threshold per cached question. Real systems also expire old answers, skip the cache for personal or fast-changing questions, and log hits so wrong ones can be found.',
  ],
  takeaways: [
    'Without a cache, every repeat costs a full model call and a full wait.',
    'An exact-match cache is safe but only catches word-for-word repeats. A similarity cache catches rephrasings.',
    'The similarity threshold trades hits against wrong answers: loosen it and both grow.',
    'A wrong cache hit looks like a normal answer, so measure it on real questions before trusting a threshold.',
  ],
  lessons: ['cost/semantic-caching-and-batch-apis', 'cost/cost-levers', 'serving/life-of-a-request'],
  sources: [
    { label: 'GPT Semantic Cache: Reducing LLM Costs and Latency via Semantic Embedding Caching (Regmi and Pun, arXiv 2411.05276)', url: 'https://arxiv.org/abs/2411.05276' },
    { label: 'vCache: Verified Semantic Prompt Caching (Schroeder et al., arXiv 2502.03771)', url: 'https://arxiv.org/abs/2502.03771' },
  ],
  updated: '2026-11-07',
  predict: {
    question: 'A similarity cache reuses a stored answer when a new question looks close enough to an old one. What do you think happens when we loosen it so that even loosely similar questions count?',
    options: [
      'More questions are answered from the cache, and the extra answers are all fine.',
      'More questions are answered from the cache, but some of them get the answer to a different question.',
      'Fewer questions are answered from the cache, because it gets confused.',
    ],
    answer: 1,
    why: 'On the toy stream, a threshold of 0.30 answers 82% of the 60 questions from the cache but 8 of them are wrong. At 0.70 it answers 55% and none are wrong.',
  },
};
