import type { LessonVideos } from './types';

/** Videos for the lessons in the wave 4 "resp-b" batch. Keys are "<track>/<slug>". */
export const videosW4RespB: LessonVideos = {
  'responsible/human-oversight-and-when-ai-should-not-decide': [
    { creator: 'IHI Open School', title: 'What Are the Dangers of Alert Fatigue?', url: 'https://www.youtube.com/watch?v=juitFz2eJHc', minutes: 4 },
  ],
  'responsible/where-the-data-comes-from': [
    { creator: 'Common Sense Education', title: 'Creativity, Copyright, and Fair Use', url: 'https://www.youtube.com/watch?v=xvZHNwBHirQ', minutes: 5, easy: true },
    { creator: 'U of G Library', title: 'What are Creative Commons Licenses?', url: 'https://www.youtube.com/watch?v=srVPLrmlBJY', minutes: 2, easy: true },
  ],
};
