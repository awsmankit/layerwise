import type { LessonVideos } from './types';

/** Videos for the lessons in the wave 2 "docs" batch. Keys are "<track>/<slug>". Titles and creators copied from YouTube's oEmbed on 2026-11-01. */
export const videosW2Docs: LessonVideos = {
  'rag-agents/reading-real-documents': [
    { creator: 'AI Engineer', title: 'Building the Document Context Layer for AI Agents — Jerry Liu, LlamaIndex', url: 'https://www.youtube.com/watch?v=RQi7x-navxU', minutes: 21 },
    { creator: 'Zeta Alpha', title: 'ColPali: Document Retrieval with Vision-Language Models only (with Manuel Faysse)', url: 'https://www.youtube.com/watch?v=5zbwT4j_9KY', minutes: 35 },
    { creator: 'Alejandro AO', title: 'Multimodal RAG: Chat with PDFs (Images & Tables) [2025]', url: 'https://www.youtube.com/watch?v=uLrReyH5cu0', minutes: 71 },
  ],
};
