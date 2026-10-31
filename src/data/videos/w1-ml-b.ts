import type { LessonVideos } from './types';

/** Videos for the lessons in the "ml-b" batch. Keys are "<track>/<slug>". Titles, creators and lengths checked against YouTube on 2026-11-01. */
export const videosW1MlB: LessonVideos = {
  'ml/getting-data-ready': [
    { creator: 'StatQuest with Josh Starmer', title: 'One-Hot, Label, Target and K-Fold Target Encoding, Clearly Explained!!!', url: 'https://www.youtube.com/watch?v=589nCGeWG1w', minutes: 15 },
    { creator: 'Krish Naik', title: 'What is Data Leakage In Machine Learning?', url: 'https://www.youtube.com/watch?v=n9jz7G68pVg', minutes: 11 },
  ],
  'ml/overfitting-and-bias-variance': [
    { creator: 'StatQuest with Josh Starmer', title: 'Machine Learning Fundamentals: Bias and Variance', url: 'https://www.youtube.com/watch?v=EuBBz3bI-aA', minutes: 7 },
    { creator: 'StatQuest with Josh Starmer', title: 'Machine Learning Fundamentals: Cross Validation', url: 'https://www.youtube.com/watch?v=fSytzGwwBVw', minutes: 6 },
    { creator: 'StatQuest with Josh Starmer', title: 'Regularization Part 1: Ridge (L2) Regression', url: 'https://www.youtube.com/watch?v=Q81RR3yKn30', minutes: 20 },
  ],
  'ml/is-the-difference-real': [
    { creator: 'StatQuest with Josh Starmer', title: 'Bootstrapping Main Ideas!!!', url: 'https://www.youtube.com/watch?v=Xz0x-8-cgaQ', minutes: 9 },
    { creator: 'StatQuest with Josh Starmer', title: 'p-values: What they are and how to interpret them', url: 'https://www.youtube.com/watch?v=vemZtEM63GY', minutes: 11 },
    { creator: '3Blue1Brown', title: "The medical test paradox, and redesigning Bayes' rule", url: 'https://www.youtube.com/watch?v=lG4VkPoG3ko', minutes: 21 },
  ],
};
