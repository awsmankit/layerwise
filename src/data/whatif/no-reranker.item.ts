import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-reranker',
  title: 'What if there is no reranker?',
  blurb: 'The right passage comes back at rank 7 but the model only reads the top 3. Watch a second, slower pass move it to the top.',
  area: 'retrieval',
  level: 'intermediate',
  minutes: 3,
  why: [
    'The first search has to be fast, because it looks at everything. So it scores each passage on its own with a cheap rule, such as the similarity of two lists of numbers. That is good at finding passages about the right topic, but it often cannot tell the passage that answers the question from ten that merely talk about the same subject.',
    'A reranker is a second, slower model that reads the question and one passage together and gives a more careful score. It only looks at the short list from the first pass, say the top 50, so the extra cost stays small. Passage re-ranking with BERT (Nogueira and Cho, 2019) is an early example of using a neural model for this step.',
    'Without it, the model sees whatever the first pass put on top. The prompt has limited room, so only the first few passages go in. If the answer is at rank 7, it never arrives, and the model either says it does not know or guesses. The reranker here is a hand-written toy rule, not a real model, so only the pattern is real: a wide first net, a careful second look, a short list.',
  ],
  takeaways: [
    'The first pass is built for speed over everything, so its ranking is rough. The right passage is often in the list but not at the top.',
    'A reranker re-scores a short list by reading the question and passage together. It is slower per passage, so it only sees the shortlist.',
    'Passages the model never reads cannot help. Where the cut-off falls decides what the answer can be.',
  ],
  lessons: ['rag-agents/vector-search-and-retrieval-metrics', 'rag-agents/chunking-and-retrieval-quality', 'rag-agents/rag-from-scratch'],
  sources: [
    { label: 'Passage Re-ranking with BERT (Nogueira and Cho, 2019)', url: 'https://arxiv.org/abs/1901.04085' },
    { label: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks (Lewis et al., 2020)', url: 'https://arxiv.org/abs/2005.11401' },
  ],
  updated: '2026-11-06',
};
