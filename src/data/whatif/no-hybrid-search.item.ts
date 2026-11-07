import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-hybrid-search',
  title: 'What if search uses only vectors, with no keyword matching?',
  blurb: 'Search twelve toy support pages by an error code, a part number and a rare name, and watch vector search blur them while keyword search nails them.',
  area: 'retrieval',
  level: 'intermediate',
  minutes: 4,
  why: [
    'Vector search turns text into lists of numbers that capture meaning, so "my money was refused" can find a page about a declined payment even though they share no words. That is its strength. Its weakness is the opposite case: an error code, a part number or a rare surname has no meaning to capture. To a vector model, E-4012 and E-4021 look like the same kind of thing, so the pages for different codes land almost on top of each other.',
    'Keyword search (the classic scoring method is called BM25) is the reverse. It counts exact words and gives rare words a lot of weight, so an exact code finds exactly its page. But it returns nothing when the question and the page use different words. The BEIR benchmark paper (Thakur et al., 2021) calls BM25 a robust baseline for exactly this reason: it is hard to beat on many kinds of text without extra cost.',
    'Hybrid search runs both and merges the two ranked lists. Reciprocal rank fusion (RRF) does the merge using only ranks: a page scores 1 divided by (k plus its rank) in each list that holds it, and the scores are added. Ranks need no conversion between a BM25 score and a similarity, and a page that both lists like rises to the top. Cormack, Clarke and Büttcher fixed k at 60 in their 2009 paper, and 60 is still a common default.',
    'The pages and the vector table on this screen are a toy that is built to show the pattern. Real embeddings are not as blind to codes as this, but they are weaker at exact identifiers than at meaning, which is why many production search systems combine both.',
  ],
  takeaways: [
    'Vectors match meaning and miss exact strings such as codes, part numbers and rare names. Keywords do the opposite.',
    'Fusing the two ranked lists with RRF lets each cover the other\'s blind spot, with no need to compare their raw scores.',
    'RRF uses only ranks: score = sum of 1 / (k + rank). A small k favours the very top ranks, a large k flattens the scores.',
    'Test with both kinds of question, exact identifiers and loosely worded ones. One kind alone will flatter either search.',
  ],
  lessons: ['rag-agents/vector-search-and-retrieval-metrics', 'rag-agents/chunking-and-retrieval-quality', 'rag-agents/rag-from-scratch'],
  sources: [
    { label: 'Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods (Cormack, Clarke and Büttcher, SIGIR 2009)', url: 'https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf' },
    { label: 'BEIR: A Heterogeneous Benchmark for Zero-shot Evaluation of Information Retrieval Models (Thakur et al., 2021)', url: 'https://arxiv.org/abs/2104.08663' },
  ],
  updated: '2026-11-06',
};
