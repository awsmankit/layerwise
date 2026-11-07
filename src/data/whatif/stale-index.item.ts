import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'stale-index',
  title: 'What if the search index is never refreshed?',
  blurb: 'Pages change, the index keeps its old copy. Slide the days forward and watch more of the questions get answered from outdated pages.',
  area: 'retrieval',
  level: 'basic',
  minutes: 4,
  why: [
    'A search index is a copy of your documents, made at one moment and arranged so lookups are fast. The documents themselves keep living: prices change, policies are rewritten, people leave. Until the index is rebuilt, search only knows the version it copied.',
    'That is the quiet part of the problem. An outdated copy does not return an error. It returns a fluent, confident answer from the old page, and the model that writes the reply has no way to know the page changed. In the simulation on this page, an index built once on day 0 and never rebuilt is answering about 4 in 10 questions from an outdated page by the end of 60 days. The numbers come from made-up pages, so only the pattern is real.',
    'What goes stale depends on what the page is about. A price list or an opening-hours page changes every few days. A page about history may never change. Real systems therefore rebuild on a schedule that matches how fast their content moves, update only the pages that changed instead of rebuilding everything, or add a date to each page so the answer can say how old its source is. Faster rebuilds cost more compute, so the interval is a trade.',
    'The upside of keeping knowledge in an index is that it can be updated without retraining the model. The original RAG paper (Lewis et al., 2020) swapped a 2016 index for a 2018 one: the model answered about 70 percent of questions about world leaders correctly when the index matched the year, and only 4 percent when it used the 2016 index to answer about the 2018 leaders.',
  ],
  takeaways: [
    'An index is a snapshot. Anything that changes after the snapshot is wrong in search until the next rebuild.',
    'Stale answers look fine. Nothing fails loudly, so you have to measure freshness on purpose.',
    'How often to rebuild depends on how fast the content moves and what a wrong answer costs. Frequent change needs frequent rebuilds or incremental updates.',
    'Showing the age or date of the source next to an answer lets the reader judge for themselves.',
  ],
  lessons: ['rag-agents/rag-from-scratch', 'llm/prompting-vs-rag-vs-fine-tuning', 'llm/long-context-or-rag'],
  sources: [
    { label: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks (Lewis et al., 2020), section on index hot-swapping', url: 'https://arxiv.org/abs/2005.11401' },
  ],
  updated: '2026-11-06',
};
