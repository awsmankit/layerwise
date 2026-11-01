import type { LessonVideos } from './types';

/** Videos for the lessons in the wave 4 "skills" batch. Keys are "<track>/<slug>". Titles, creators and lengths checked on 2026-11-01. */
export const videosW4Skills: LessonVideos = {
  'skills/maths-without-fear': [
    { creator: '3Blue1Brown', title: 'Vectors | Chapter 1, Essence of linear algebra', url: 'https://www.youtube.com/watch?v=fNk_zzaMoSs', minutes: 10, easy: true },
    { creator: '3Blue1Brown', title: 'The essence of calculus', url: 'https://www.youtube.com/watch?v=WUvTyaaNkzM', minutes: 17, easy: true },
    { creator: '3Blue1Brown', title: 'Bayes theorem, the geometry of changing beliefs', url: 'https://www.youtube.com/watch?v=HZGCoVF3YvM', minutes: 15 },
  ],
  'skills/your-toolkit-notebooks-colab-and-git': [
    { creator: 'Corey Schafer', title: 'Jupyter Notebook Tutorial: Introduction, Setup, and Walkthrough', url: 'https://www.youtube.com/watch?v=HW29067qVWk', minutes: 30, easy: true },
    { creator: 'freeCodeCamp.org', title: 'Command Line Basics for Beginners - Full Course', url: 'https://www.youtube.com/watch?v=mABpAI-pCw0', minutes: 45, easy: true },
    { creator: 'Corey Schafer', title: 'Git Tutorial for Beginners: Command-Line Fundamentals', url: 'https://www.youtube.com/watch?v=HVsySz-h9r4', minutes: 31 },
  ],
};
