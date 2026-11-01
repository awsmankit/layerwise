import type { LessonVideos } from './types';

/** Videos for the lessons in the wave 3 "applied-b" batch. Keys are "<track>/<slug>". Titles, creators and lengths checked against YouTube on 2026-11-01. */
export const videosW3AppliedB: LessonVideos = {
  'ml/clustering-and-dimensionality-reduction': [
    { creator: 'StatQuest with Josh Starmer', title: 'StatQuest: K-means clustering', url: 'https://www.youtube.com/watch?v=4b5d3muPQmA', minutes: 9 },
    { creator: 'StatQuest with Josh Starmer', title: 'StatQuest: PCA main ideas in only 5 minutes!!!', url: 'https://www.youtube.com/watch?v=HMOI_lkzW08', minutes: 6 },
    { creator: 'StatQuest with Josh Starmer', title: 'StatQuest: t-SNE, Clearly Explained', url: 'https://www.youtube.com/watch?v=NEaUSP4YerM', minutes: 12 },
  ],
  'ml/anomaly-detection': [
    { creator: 'codebasics', title: 'Outlier detection and removal: z score, standard deviation | Feature engineering tutorial python # 3', url: 'https://www.youtube.com/watch?v=KFuEAGR3HS4', minutes: 20 },
    { creator: 'Krish Naik', title: 'Complete Anomaly Detection Tutorials Machine Learning And Its Types With Implementation | Krish Naik', url: 'https://www.youtube.com/watch?v=OS9xRGKfx4E', minutes: 37 },
    { creator: '3Blue1Brown', title: "The medical test paradox, and redesigning Bayes' rule", url: 'https://www.youtube.com/watch?v=lG4VkPoG3ko', minutes: 21 },
  ],
};
