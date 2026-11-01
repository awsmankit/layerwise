import type { LessonVideos } from './types';

/** Videos for the lessons in the wave 3 "mlops-a" batch. Keys are "<track>/<slug>". */
export const videosW3MlopsA: LessonVideos = {
  'systems/from-notebook-to-production': [
    { creator: 'codebasics', title: 'What is ML Ops?', url: 'https://www.youtube.com/watch?v=e1rl1DYfPy4', minutes: 18 },
    { creator: 'Stanford MLSys Seminars', title: 'Stanford MLSys Seminar Episode 5: Chip Huyen', url: 'https://www.youtube.com/watch?v=c_AUuTuPA5k', minutes: 67 },
    { creator: 'PAPIs.io', title: 'Machine Learning, Technical Debt, and You - D. Sculley (Google)', url: 'https://www.youtube.com/watch?v=V18AsBIHlWs', minutes: 28 },
  ],
  'systems/data-pipelines-and-data-quality': [
    { creator: 'DeepLearningAI', title: 'A Chat with Andrew on MLOps: From Model-centric to Data-centric AI', url: 'https://www.youtube.com/watch?v=06-AZXmwHjo', minutes: 60 },
    { creator: 'Introduction to Data-Centric AI', title: 'Lecture 2: Label Errors', url: 'https://www.youtube.com/watch?v=AzU-G1Vww3c', minutes: 73 },
  ],
};
