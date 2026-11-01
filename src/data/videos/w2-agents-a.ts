import type { LessonVideos } from './types';

/** Videos for the lessons in the wave 2 "agents-a" batch. Keys are "<track>/<slug>". */
export const videosW2AgentsA: LessonVideos = {
  'rag-agents/designing-tools-for-agents': [
    { creator: 'AI Engineer', title: 'How We Build Effective Agents: Barry Zhang, Anthropic', url: 'https://www.youtube.com/watch?v=D7_ipDqhtwk', minutes: 15 },
    { creator: 'AI Engineer', title: 'Building Agents with Model Context Protocol - Full Workshop with Mahesh Murag of Anthropic', url: 'https://www.youtube.com/watch?v=kQmXtrmQ5Zg', minutes: 104 },
  ],
  'rag-agents/agent-memory-and-context-engineering': [
    { creator: 'LangChain', title: 'Context Engineering for Agents', url: 'https://www.youtube.com/watch?v=4GiqzUHD5AA', minutes: 22 },
    { creator: 'Latent Space', title: 'Context Engineering for Agents - Lance Martin, LangChain', url: 'https://www.youtube.com/watch?v=_IlTcWciEC4', minutes: 63 },
  ],
};
