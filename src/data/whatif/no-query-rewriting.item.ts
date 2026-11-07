import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-query-rewriting',
  title: 'What if we search with the user\'s raw question?',
  blurb: 'In a short chat, follow-ups such as "and how much does it cost?" lose their subject. Compare the raw message with a rewritten standalone question.',
  area: 'retrieval',
  level: 'basic',
  minutes: 3,
  why: [
    'People do not talk to a chatbot in complete, self-contained questions. They say "and how much does it cost?" or "what about the other one?" and expect the assistant to remember what they were discussing. But the search step in a RAG system (retrieval-augmented generation, where a model answers from passages it fetches) usually looks at one piece of text at a time. It does not see the chat.',
    'Searching with the raw follow-up finds whatever matches the few words it contains. In the toy chat on this page, "how much does it cost" matches the price page of every plan equally, so the page for the plan being discussed is one of three tied results. "What about the Lumen one?" is worse: it finds Lumen pages, but not the page that answers the question being asked.',
    'Query rewriting adds a step before search. A language model reads the chat so far and writes one standalone question, such as "How much does the Orbit plan cost?", which search can handle on its own. Ma and colleagues (2023) study this as a "rewrite, retrieve, read" pipeline and train a small rewriter using feedback from the model that reads the results.',
    'The rewriter on this page is a hand-written toy rule that swaps "it" for the plan being discussed. A real rewriter is a model, and it can get things wrong too, for example by guessing the wrong subject. That is why teams log both the raw and the rewritten query.',
  ],
  takeaways: [
    'Retrieval usually sees one query, not the conversation. Follow-ups lose their subject.',
    'A raw follow-up often matches many similar pages equally, so the right one is a coin flip.',
    'Rewriting turns "does it work offline?" into a question that stands alone: "Does the Orbit plan work offline?"',
    'The first message of a chat needs no rewriting. The benefit appears exactly where the chat leans on earlier messages.',
  ],
  lessons: ['rag-agents/query-understanding-for-rag', 'rag-agents/rag-from-scratch', 'rag-agents/agent-memory-and-context-engineering'],
  sources: [
    { label: 'Query Rewriting for Retrieval-Augmented Large Language Models (Ma et al., 2023)', url: 'https://arxiv.org/abs/2305.14283' },
  ],
  updated: '2026-11-06',
};
