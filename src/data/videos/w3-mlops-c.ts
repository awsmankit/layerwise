import type { LessonVideos } from './types';

/** Videos for the lessons in the wave 3 "mlops-c" batch. Keys are "<track>/<slug>". */
export const videosW3MlopsC: LessonVideos = {
  'systems/monitoring-and-drift': [
    { creator: 'DeepLearningAI', title: 'A Chat with Andrew on MLOps: From Model-centric to Data-centric AI', url: 'https://www.youtube.com/watch?v=06-AZXmwHjo', minutes: 60 },
    { creator: 'DataTalksClub ⬛', title: 'MLOps Zoomcamp 5.1 - Intro to ML monitoring', url: 'https://www.youtube.com/watch?v=SQ0jBwd_3kk', minutes: 12 },
  ],
  'systems/ml-system-design-interviews': [
    { creator: 'The Full Stack', title: 'Chip Huyen on Machine Learning Interviews (Full Stack Deep Learning - November 2019)', url: 'https://www.youtube.com/watch?v=pli1K75PSa8', minutes: 44 },
    { creator: 'Stanford MLSys Seminars', title: 'Stanford MLSys Seminar Episode 5: Chip Huyen', url: 'https://www.youtube.com/watch?v=c_AUuTuPA5k', minutes: 67 },
  ],
};
