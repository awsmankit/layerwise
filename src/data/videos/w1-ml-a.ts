import type { LessonVideos } from './types';

/** Videos for the lessons in the "ml-a" batch. Keys are "<track>/<slug>". Titles and creators copied from YouTube's oEmbed on 2026-11-01. */
export const videosW1MlA: LessonVideos = {
  'ml/linear-and-logistic-regression': [
    { creator: 'StatQuest with Josh Starmer', title: 'Linear Regression, Clearly Explained!!!', url: 'https://www.youtube.com/watch?v=nk2CQITm_eo', minutes: 27 },
    { creator: 'StatQuest with Josh Starmer', title: 'StatQuest: Logistic Regression', url: 'https://www.youtube.com/watch?v=yIYKR4sgzI8', minutes: 9 },
  ],
  'ml/decision-trees-and-random-forests': [
    { creator: 'StatQuest with Josh Starmer', title: 'Decision and Classification Trees, Clearly Explained!!!', url: 'https://www.youtube.com/watch?v=_L39rN6gz7Y', minutes: 18 },
    { creator: 'StatQuest with Josh Starmer', title: 'StatQuest: Random Forests Part 1 - Building, Using and Evaluating', url: 'https://www.youtube.com/watch?v=J4Wdy0Wc_xQ', minutes: 10 },
  ],
  'ml/gradient-boosting': [
    { creator: 'StatQuest with Josh Starmer', title: 'Gradient Boost Part 1 (of 4): Regression Main Ideas', url: 'https://www.youtube.com/watch?v=3CC4N4z3GJc', minutes: 16 },
    { creator: 'StatQuest with Josh Starmer', title: 'XGBoost Part 1 (of 4): Regression', url: 'https://www.youtube.com/watch?v=OtD8wVaFm6E', minutes: 26 },
  ],
};
