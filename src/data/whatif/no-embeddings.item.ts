import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-embeddings',
  title: 'What if we do not use embeddings?',
  blurb: 'Ask a help centre five differently worded questions and watch keyword search miss the answers that meaning search finds.',
  area: 'retrieval',
  level: 'basic',
  minutes: 3,
  why: [
    'People rarely type the words a document uses. Someone who writes "get my cash back" is asking about the page titled "Refund policy", but the two share no words. Search that only matches words, such as classic keyword search, sees nothing in common and returns nothing.',
    'An embedding is a list of numbers that a model produces for a piece of text, built so that texts with similar meaning get similar lists. Search then compares lists instead of words, and "cash back" lands near "refund". The page uses a tiny hand-built toy with five numbers per word to show the idea. Real embedding models learn their numbers from huge amounts of text and use hundreds or thousands of them.',
    'Embeddings are not magic. They can rank a close but wrong page first, and they are weak at exact things such as part numbers, names or error codes, where keyword search is better. That is why many real systems run both and merge the results (hybrid search), then rank the merged list.',
  ],
  takeaways: [
    'Keyword search finds documents that share your exact words. Reworded questions, synonyms and plurals can slip through.',
    'An embedding turns text into numbers so that similar meaning means nearby numbers, and search becomes a nearest-neighbour question.',
    'Keyword search is still good for exact strings such as codes and names, so many systems combine both.',
  ],
  lessons: ['rag-agents/rag-from-scratch', 'rag-agents/vector-search-and-retrieval-metrics', 'llm/prompting-vs-rag-vs-fine-tuning'],
  sources: [
    { label: 'Efficient Estimation of Word Representations in Vector Space (Mikolov et al., 2013)', url: 'https://arxiv.org/abs/1301.3781' },
    { label: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks (Lewis et al., 2020)', url: 'https://arxiv.org/abs/2005.11401' },
  ],
  updated: '2026-11-06',
};
