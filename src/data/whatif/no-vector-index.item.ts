import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-vector-index',
  title: 'What if there is no vector index?',
  blurb: 'Grow a collection from a hundred vectors to a billion and compare checking every one with jumping through an index.',
  area: 'retrieval',
  level: 'advanced',
  minutes: 4,
  why: [
    'Vector search finds the stored vectors closest to a query vector. The simple way, brute force, compares the query with every stored vector. It is exact and needs no extra structure, and for a few thousand vectors it is the right choice. But the work grows in a straight line with the collection: ten times more vectors, ten times more time.',
    'A vector index trades a little exactness for speed. Graph indexes such as HNSW (Malkov and Yashunin, 2016) keep links between nearby vectors and search by hopping from a rough starting point toward the query, checking only a small neighbourhood. The number of checks grows roughly with the logarithm of the collection size, so a billion vectors costs only a few times what a million does.',
    'The numbers on this page come from stated example rates for one CPU core: 768-number vectors, 20 GB per second for a sequential scan, 0.5 microseconds for each random check, and an index that makes about 400 times log base 2 of the size checks. Real speeds depend on hardware, index settings, filters and data, and the index may miss some true neighbours, so treat the shape as the lesson, not the milliseconds. An index also costs memory for its links and time to build.',
  ],
  takeaways: [
    'Brute force is exact and simple, and its time grows in a straight line with the number of vectors.',
    'An approximate index checks a small share of the collection, so its time grows very slowly. The price is approximate answers, extra memory and a build step.',
    'For small collections a plain scan is as fast or faster, so an index only pays once the collection is large (about 18,000 vectors with the example rates).',
  ],
  lessons: ['rag-agents/vector-search-and-retrieval-metrics', 'rag-agents/rag-from-scratch', 'llm/long-context-or-rag'],
  sources: [
    { label: 'Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs (Malkov and Yashunin)', url: 'https://arxiv.org/abs/1603.09320' },
  ],
  updated: '2026-11-06',
};
