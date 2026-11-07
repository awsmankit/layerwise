import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-metadata-filters',
  title: 'What if search ignores who the user is and which version they use?',
  blurb: 'In a toy shared help index, rank the same question with and without metadata filters and count the other customers\' pages and old versions that slip into the top 5.',
  area: 'retrieval',
  level: 'intermediate',
  minutes: 4,
  predict: {
    question: 'One search index holds the help pages of three companies and three product versions. What do you think happens if the search ignores who is asking and which version they run?',
    options: [
      'It finds the same pages as before, just a little slower.',
      'Pages from other companies and other versions show up in the top results.',
      'It returns nothing, because it cannot tell who is asking.',
    ],
    answer: 1,
    why: 'Similar wording scores well whoever wrote it. For Acme on version 3, the top 5 holds 2 pages from other companies and 2 for other versions, and only 1 of 5 is safe to use.',
  },
  why: [
    'A search index ranks by how close a page is to the question. It does not know who is asking. If many customers share one index, a page from another customer that is worded almost the same scores almost the same. Old versions of a page do too, because the old and the new text are nearly identical.',
    'Metadata fixes this. Each page carries labels such as the customer it belongs to, the product version and the date. A metadata filter keeps only the pages whose labels match the asker, before ranking. In this toy store, 2 of 18 pages are left for Acme on version 3, so there is nothing else that can leak. Without the filter, the model may quote another customer\'s private page, or give steps for a version the user does not run.',
    'Real systems do this on the server side, from the logged-in user, never from the model\'s own say-so. Many vector databases support a metadata filter on a query, and some also let you split an index into separate partitions per customer (Pinecone calls them namespaces). The toy here shows the pattern: filter first, then rank. It is a defensive design rule for any shared index, not a statement about one product.',
  ],
  takeaways: [
    'A search ranks by closeness to the question, not by who is allowed to see the page. Without a filter, another customer\'s page can win.',
    'Filter on metadata (customer, version, date) before ranking, using values taken from the signed-in user, not from the prompt.',
    'Old versions look almost the same as new ones, so they rank high too. A version or date filter stops answers for the wrong release.',
    'Filtering also shrinks the search: in the toy store 2 of 18 pages are searched instead of 18.',
  ],
  lessons: ['rag-agents/rag-from-scratch', 'systems/rag-service-architecture', 'evals/llm-security'],
  sources: [
    { label: 'Pinecone docs: indexing overview (namespaces, multitenancy and metadata filtering)', url: 'https://docs.pinecone.io/guides/index-data/indexing-overview' },
  ],
  updated: '2026-11-06',
};

