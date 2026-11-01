import type { LessonVideos } from './types';

/** Videos for the lessons in the wave 4 "start-a" batch. Keys are "<track>/<slug>". */
export const videosW4StartA: LessonVideos = {
  'start/a-short-history-of-ai': [
    { creator: 'CrashCourse', title: 'What Is Artificial Intelligence? Crash Course AI #1', url: 'https://www.youtube.com/watch?v=a0_lo_GDcFw', minutes: 12, easy: true },
    { creator: 'CrashCourse', title: 'Machine Learning & Artificial Intelligence: Crash Course Computer Science #34', url: 'https://www.youtube.com/watch?v=z-EtmaFJieY', minutes: 12 },
  ],
  'start/ai-around-you': [
    { creator: 'CodeAI', title: 'How AI Works', url: 'https://www.youtube.com/watch?v=Ok-xpKjKp2g', minutes: 2, easy: true },
    { creator: 'CrashCourse', title: 'Robotics: Crash Course AI #11', url: 'https://www.youtube.com/watch?v=_U21fT8VLp0', minutes: 10 },
  ],
};
