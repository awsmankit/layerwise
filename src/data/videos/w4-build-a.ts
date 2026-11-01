import type { LessonVideos } from './types';

/**
 * Videos for the lessons in the wave 4 "build-a" batch. Keys are "<track>/<slug>". Each was checked against
 * YouTube's oEmbed endpoint on 2026-11-01; title and creator are copied from it, minutes rounded from the
 * watch page. Views at that date: Jason Liu 231k, Efficient NLP 13k, Remi Louf 11k, Sam Witteveen 24k,
 * freeCodeCamp 1.76M. Metadata was verified; the videos themselves were not watched end to end.
 */
export const videosW4BuildA: LessonVideos = {
  'llm/structured-output-in-depth': [
    { creator: 'AI Engineer', title: 'Pydantic is all you need: Jason Liu', url: 'https://www.youtube.com/watch?v=yj-wSRJwrrc', minutes: 18 },
    { creator: 'Efficient NLP', title: 'Structured Output from LLMs: Grammars, Regex, and State Machines', url: 'https://www.youtube.com/watch?v=xpvFinvqRCA', minutes: 17 },
    { creator: 'AI Engineer', title: 'No more bad outputs with structured generation: Remi Louf', url: 'https://www.youtube.com/watch?v=aNmfvN6S_n4', minutes: 16 },
  ],
  'rag-agents/query-understanding-for-rag': [
    { creator: 'Sam Witteveen', title: 'Advanced RAG 05 - HyDE - Hypothetical Document Embeddings', url: 'https://www.youtube.com/watch?v=v_BnBEubv58', minutes: 12 },
    { creator: 'freeCodeCamp.org', title: 'Learn RAG From Scratch – Python AI Tutorial from a LangChain Engineer', url: 'https://www.youtube.com/watch?v=sVcwVQRHIc8', minutes: 153 },
  ],
};
