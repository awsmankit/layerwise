import type { LessonVideos } from './types';

/** Videos for the lessons in the "resp-a" batch. Keys are "<track>/<slug>". */
export const videosW1RespA: LessonVideos = {
  'responsible/when-examples-are-unfair': [
    { creator: 'CrashCourse', title: 'Algorithmic Bias and Fairness: Crash Course AI #18', url: 'https://www.youtube.com/watch?v=gV0_raKR2UQ', minutes: 11, easy: true },
    { creator: 'TED', title: "How I'm fighting bias in algorithms | Joy Buolamwini", url: 'https://www.youtube.com/watch?v=UG_X_7g63rY', minutes: 9, easy: true },
  ],
  'responsible/real-or-fake': [
    { creator: 'CrashCourse', title: 'Check Yourself with Lateral Reading: Crash Course Navigating Digital Information #3', url: 'https://www.youtube.com/watch?v=GoQG6Tin-1E', minutes: 14, easy: true },
    { creator: 'CrashCourse', title: 'Evaluating Photos & Videos: Crash Course Navigating Digital Information #7', url: 'https://www.youtube.com/watch?v=p7uvqb8fcdA', minutes: 13, easy: true },
  ],
};
