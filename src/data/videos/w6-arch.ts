import type { LessonVideos } from './types';

/**
 * Videos for the wave 6 "choosing an agent architecture" lesson. Keys are "<track>/<slug>".
 * Titles are exactly as YouTube's oEmbed endpoint returned them on 6 November 2026; minutes are rounded from the watch page.
 */
export const videosW6Arch: LessonVideos = {
  'rag-agents/choosing-an-agent-architecture': [
    { creator: 'AI Engineer', title: 'How We Build Effective Agents: Barry Zhang, Anthropic', url: 'https://www.youtube.com/watch?v=D7_ipDqhtwk', minutes: 15 },
    { creator: 'Sequoia Capital', title: 'When to Build Your Own Agent Harness | Harrison Chase, LangChain', url: 'https://www.youtube.com/watch?v=HI2q3ci3Iuc', minutes: 24 },
  ],
};
