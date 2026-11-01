import type { LessonVideos } from './types';

/** Videos for the lessons in the wave 4 "resp-a" batch. Keys are "<track>/<slug>". */
export const videosW4RespA: LessonVideos = {
  'responsible/why-did-it-say-that': [
    { creator: 'A Data Odyssey', title: 'SHAP values for beginners | What they mean and their applications', url: 'https://www.youtube.com/watch?v=MQ6fFDwjuco', minutes: 7 },
    { creator: 'KIE', title: 'Shapley Additive Explanations (SHAP)', url: 'https://www.youtube.com/watch?v=VB9uV-x0gtg', minutes: 12 },
    { creator: 'International Association for Safe & Ethical AI', title: 'An Introduction to Mechanistic Interpretability – Neel Nanda | IASEAI 2025', url: 'https://www.youtube.com/watch?v=0704iLc55Fs', minutes: 25 },
  ],
  'responsible/running-ai-governance': [
    { creator: 'IBM Technology', title: 'Mastering AI Risk: NIST’s Risk Management Framework Explained', url: 'https://www.youtube.com/watch?v=0oeD2Wf25wY', minutes: 9 },
    { creator: 'Hugging Face', title: 'Machine Learning Experts - Margaret Mitchell', url: 'https://www.youtube.com/watch?v=FpIxYGyJBbs', minutes: 50 },
  ],
};
