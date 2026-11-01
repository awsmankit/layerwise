import type { LessonVideos } from './types';

/**
 * Videos for the lessons in the wave 4 "misc" batch. Keys are "<track>/<slug>". Each was checked against
 * YouTube's oEmbed endpoint on 2026-11-01; title and creator are copied from it, minutes rounded from the
 * watch page. Views at that date: AI Engineer (Together AI) talk 12.3k and LiveKit latency video 2.05M
 * (a vendor channel, kept because it is the clearest short walk-through of voice-agent latency found);
 * IBM Technology prompt caching 125k and Hugging Face prompt caching 26k. No video of 100k+ views that
 * covers semantic caching or batch APIs from a non-vendor channel was found, so those topics have none.
 */
export const videosW4Misc: LessonVideos = {
  'audio/voice-agents': [
    { creator: 'AI Engineer', title: 'Engineering voice agents: Latency, quality, and scale — Rishabh Bhargava, Together AI', url: 'https://www.youtube.com/watch?v=N7b1PJc7SFc', minutes: 25 },
    { creator: 'LiveKit', title: 'Reduce the Latency of your Voice Agent', url: 'https://www.youtube.com/watch?v=jnedfk5PL2A', minutes: 13 },
  ],
  'cost/semantic-caching-and-batch-apis': [
    { creator: 'IBM Technology', title: 'What is Prompt Caching? Optimize LLM Latency with AI Transformers', url: 'https://www.youtube.com/watch?v=u57EnkQaUTY', minutes: 9 },
    { creator: 'Hugging Face', title: 'Prompt Caching Explained: Stop Overpaying for AI Agents', url: 'https://www.youtube.com/watch?v=SkM4k4SKvCM', minutes: 17 },
  ],
};
