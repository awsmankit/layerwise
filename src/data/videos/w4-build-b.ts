import type { LessonVideos } from './types';

/**
 * Videos for the lessons in the wave 4 "build-b" batch. Keys are "<track>/<slug>". Each was checked against
 * YouTube's oEmbed endpoint on 2026-11-01; title and creator are copied from it, minutes rounded from the
 * watch page. Views at that date: Kamradt needle test 25.6k, LangChain multi-fact test 19.3k, AI Engineer
 * Eifrem GraphRAG talk 293.8k, Alex Chao upload of Microsoft's Jonathan Larson GraphRAG talk 158.5k.
 * The long-context videos are below the 100k-view preference; I found no better well-known educator video.
 */
export const videosW4BuildB: LessonVideos = {
  'llm/long-context-or-rag': [
    { creator: 'Greg Kamradt', title: 'Needle In A Haystack (GPT-4 128K)', url: 'https://www.youtube.com/watch?v=KwRRuiCCdmc', minutes: 8 },
    { creator: 'LangChain', title: 'Is RAG Really Dead? Testing Multi Fact Retrieval & Reasoning in GPT4-128k', url: 'https://www.youtube.com/watch?v=UlmyyYQGhzc', minutes: 23 },
  ],
  'rag-agents/graphrag-and-knowledge-graphs': [
    { creator: 'AI Engineer', title: 'GraphRAG: The Marriage of Knowledge Graphs and RAG: Emil Eifrem', url: 'https://www.youtube.com/watch?v=knDDGYHnnSI', minutes: 19 },
    { creator: 'Alex Chao', title: 'GraphRAG: LLM-Derived Knowledge Graphs for RAG', url: 'https://www.youtube.com/watch?v=r09tJfON6kE', minutes: 16 },
  ],
};
