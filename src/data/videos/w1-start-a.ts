import type { LessonVideos } from './types';

/** Videos for the lessons in the "start-a" batch. Keys are "<track>/<slug>". */
export const videosW1StartA: LessonVideos = {
  'start/three-ways-machines-learn': [
    { creator: 'CodeAI', title: 'What is Machine Learning?', url: 'https://www.youtube.com/watch?v=KHbwOetbmbs', minutes: 3, easy: true },
    { creator: 'CrashCourse', title: 'Unsupervised Learning: Crash Course AI #6', url: 'https://www.youtube.com/watch?v=JnnaDNNb380', minutes: 13, easy: true },
    { creator: 'CrashCourse', title: 'Reinforcement Learning: Crash Course AI #9', url: 'https://www.youtube.com/watch?v=nIgIv4IfJ6s', minutes: 11, easy: true },
  ],
  'start/computers-that-decide-and-plan': [
    { creator: 'CrashCourse', title: 'Symbolic AI: Crash Course AI #10', url: 'https://www.youtube.com/watch?v=WHCo4m2VOws', minutes: 13 },
    { creator: 'CrashCourse', title: 'AI Playing Games: Crash Course AI #12', url: 'https://www.youtube.com/watch?v=nw7zmdBLQ6U', minutes: 12 },
  ],
};
