import type { LessonVideos } from './types';

/**
 * Videos for the lessons in the wave 2 "agents-b" batch. Keys are "<track>/<slug>". Each was checked
 * against YouTube's oEmbed endpoint on 2026-11-01; title and creator are copied from it and minutes are
 * rounded from the watch page. Views at that date: Andrew Ng at Sequoia 417k, Context Engineering for
 * Agents 205k, Karpathy at Y Combinator 2.62M, Simon Willison at the Pragmatic Summit 43k (kept for its
 * subject, although under 100k views).
 */
export const videosW2AgentsB: LessonVideos = {
  'rag-agents/multi-agent-systems': [
    { creator: 'Sequoia Capital', title: "What's next for AI agentic workflows ft. Andrew Ng of AI Fund", url: 'https://www.youtube.com/watch?v=sal78ACtGTc', minutes: 14 },
    { creator: 'LangChain', title: 'Context Engineering for Agents', url: 'https://www.youtube.com/watch?v=4GiqzUHD5AA', minutes: 22 },
  ],
  'llm/ai-assisted-software-development': [
    { creator: 'Y Combinator', title: 'Andrej Karpathy: Software Is Changing (Again)', url: 'https://www.youtube.com/watch?v=LCEmiRjPEtQ', minutes: 40 },
    { creator: 'The Pragmatic Engineer', title: 'Simon Willison: Engineering practices that make coding agents work - The Pragmatic Summit', url: 'https://www.youtube.com/watch?v=owmJyKVu5f8', minutes: 28 },
  ],
};
