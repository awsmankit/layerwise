import type { WhatIf } from './types';

export const item: WhatIf = {
  slug: 'no-rag',
  title: 'What if the model has no retrieval at all?',
  blurb: 'A toy model answers private and recent questions from memory alone, then again with a search over a small document store.',
  area: 'retrieval',
  level: 'basic',
  minutes: 3,
  why: [
    'A language model learns from text up to a cutoff date and keeps what it learned in its numbers. It cannot know what happened after the cutoff, and it never saw your private documents, such as a company handbook or an order status.',
    'Retrieval-augmented generation, or RAG, adds a search step. Before the model answers, the question is used to search a store of documents, and the best passages are pasted into the prompt. The model then answers from text that is in front of it instead of from memory. The original RAG paper (Lewis et al., 2020) combined a language model with a retriever over Wikipedia and reported more factual answers than a model using its memory alone.',
    'The model on this page is a toy, not any real model. It knows a few made-up facts up to an invented cutoff, and when it has nothing it guesses the most common answer it saw. Real models vary: some refuse, some guess, and some have other tools. The point that carries over is the gap: memory alone cannot be right about facts it never saw, and retrieval is how you hand them over. Retrieval is not needed for every question, as the stable public fact shows.',
  ],
  takeaways: [
    'A model on its own only knows what was in its training data, up to a cutoff. Private and recent facts are not in there.',
    'RAG searches your documents first and gives the best passages to the model, so it answers from them.',
    'Retrieval adds a moving part that can fail (the wrong passage, or none). Use it for facts the model cannot know, and keep stable general knowledge simple.',
  ],
  lessons: ['rag-agents/rag-from-scratch', 'llm/prompting-vs-rag-vs-fine-tuning', 'llm/long-context-or-rag'],
  sources: [
    { label: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks (Lewis et al., 2020)', url: 'https://arxiv.org/abs/2005.11401' },
  ],
  updated: '2026-11-06',
};
