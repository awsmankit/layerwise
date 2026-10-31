import type { LessonVideos } from './types';

/** Videos for the lessons in the "skills" batch. Keys are "<track>/<slug>". Titles, creators and lengths checked on 2026-11-01. */
export const videosW1Skills: LessonVideos = {
  'skills/python-first-steps': [
    { creator: 'freeCodeCamp.org', title: 'Learn Python - Full Course for Beginners [Tutorial]', url: 'https://www.youtube.com/watch?v=rfscVS0vtbw', minutes: 267, easy: true },
    { creator: 'Corey Schafer', title: 'Python Tutorial for Beginners 2: Strings - Working with Textual Data', url: 'https://www.youtube.com/watch?v=k9TUPpGqYTo', minutes: 21, easy: true },
  ],
  'skills/your-first-model': [
    { creator: 'StatQuest with Josh Starmer', title: 'Naive Bayes, Clearly Explained!!!', url: 'https://www.youtube.com/watch?v=O2L2Uv9pdDA', minutes: 15 },
    { creator: 'Kaggle', title: 'Intro to Machine Learning Lesson 1: How Models Work | Kaggle', url: 'https://www.youtube.com/watch?v=qsH2ItlSqnU', minutes: 7 },
    { creator: 'freeCodeCamp.org', title: 'Machine Learning for Everybody – Full Course', url: 'https://www.youtube.com/watch?v=i_LwzRVP7bg', minutes: 234 },
  ],
};
