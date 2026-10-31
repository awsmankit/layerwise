import type { LessonVideos } from './types';

/** Videos for the lessons in the "resp-b" batch. Keys are "<track>/<slug>". */
export const videosW1RespB: LessonVideos = {
  'responsible/ai-and-your-private-life': [
    { creator: 'Common Sense Education', title: 'Personally Identifiable Information (PII)', url: 'https://www.youtube.com/watch?v=yZj5nmLYiW4', minutes: 2, easy: true },
  ],
  'responsible/ai-and-school': [
    { creator: 'Vox', title: 'AI can do your homework. Now what?', url: 'https://www.youtube.com/watch?v=bEJ0_TVXh-I', minutes: 17 },
  ],
  'start/what-is-an-ai-agent': [
    { creator: 'Jeff Su', title: 'AI Agents, Clearly Explained', url: 'https://www.youtube.com/watch?v=FwOTs4UxQS4', minutes: 10 },
  ],
};
