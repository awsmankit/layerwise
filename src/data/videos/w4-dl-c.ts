import type { LessonVideos } from './types';

/**
 * Videos for the lessons in the wave 4 "dl-c" batch. Keys are "<track>/<slug>". Each was checked against
 * YouTube's oEmbed endpoint on 2026-11-01; title and creator are copied from it, minutes rounded from the
 * watch page. Views at that date: AI Coffee Break SSM 99k, Yannic Kilcher Mamba 179k, Umar Jamil Mamba 68k
 * (below the usual 100k, kept because it is the one that derives the scan and the convolution form),
 * CrashCourse RL 276k, StatQuest RL 118k, Mutual Information RL 228k.
 */
export const videosW4DlC: LessonVideos = {
  'deep-learning/state-space-models-and-mamba': [
    { creator: 'AI Coffee Break with Letitia', title: 'MAMBA and State Space Models explained | SSM explained', url: 'https://www.youtube.com/watch?v=vrF3MtGwD0Y', minutes: 22 },
    { creator: 'Yannic Kilcher', title: 'Mamba: Linear-Time Sequence Modeling with Selective State Spaces (Paper Explained)', url: 'https://www.youtube.com/watch?v=9dSkvxS2EB0', minutes: 41 },
    { creator: 'Umar Jamil', title: 'Mamba and S4 Explained: Architecture, Parallel Scan, Kernel Fusion, Recurrent, Convolution, Math', url: 'https://www.youtube.com/watch?v=8Q_tqwpTpVU', minutes: 74 },
  ],
  'deep-learning/reinforcement-learning-from-scratch': [
    { creator: 'CrashCourse', title: 'Reinforcement Learning: Crash Course AI #9', url: 'https://www.youtube.com/watch?v=nIgIv4IfJ6s', minutes: 11, easy: true },
    { creator: 'StatQuest with Josh Starmer', title: 'Reinforcement Learning: Essential Concepts', url: 'https://www.youtube.com/watch?v=Z-T0iJEXiwM', minutes: 18 },
    { creator: 'Mutual Information', title: 'Reinforcement Learning, by the Book', url: 'https://www.youtube.com/watch?v=NFo9v_yKQXA', minutes: 18 },
  ],
};
