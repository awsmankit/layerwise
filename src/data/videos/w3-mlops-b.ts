import type { LessonVideos } from './types';

/** Videos for the lessons in the wave 3 "mlops-b" batch. Keys are "<track>/<slug>". */
export const videosW3MlopsB: LessonVideos = {
  'systems/batch-vs-online-inference-and-feature-stores': [
    { creator: 'Hasgeek TV', title: 'Feast: feature store for Machine Learning', url: 'https://www.youtube.com/watch?v=DaNv-Wf1MBA', minutes: 27 },
    { creator: 'Optimized AI Conference', title: 'Real Time ML: Challenges and Solutions - Chip Huyen', url: 'https://www.youtube.com/watch?v=kbxF3fT0YAI', minutes: 31 },
  ],
  'systems/testing-and-deploying-ml-models': [
    { creator: "Lenny's Podcast", title: 'The ultimate guide to A/B testing | Ronny Kohavi (Airbnb, Microsoft, Amazon)', url: 'https://www.youtube.com/watch?v=hEzpiDuYFoE', minutes: 83 },
    { creator: 'Jesper Dramsch – Non-hype Machine Learning', title: 'How to Test your Machine Learning models - Goku Mohandas', url: 'https://www.youtube.com/watch?v=hhMUE0_vAs4', minutes: 18 },
  ],
};
