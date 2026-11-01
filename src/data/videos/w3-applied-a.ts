import type { LessonVideos } from './types';

/** Videos for the lessons in the wave 3 "applied-a" batch. Keys are "<track>/<slug>". Titles, creators and lengths checked against YouTube on 2026-11-01. */
export const videosW3AppliedA: LessonVideos = {
  'ml/recommenders-and-ranking': [
    { creator: 'Luis Serrano Academy', title: 'How does Netflix recommend movies? Matrix Factorization', url: 'https://www.youtube.com/watch?v=ZspR5PZemcs', minutes: 33 },
    { creator: 'Art of the Problem', title: 'The Math Behind Recommender Systems', url: 'https://www.youtube.com/watch?v=n3RKsY2H-NE', minutes: 8 },
  ],
  'ml/time-series-forecasting': [
    { creator: 'ritvikmath', title: 'Why Are Time Series Special? : Time Series Talk', url: 'https://www.youtube.com/watch?v=ZoJ2OctrFLA', minutes: 8 },
    { creator: 'ritvikmath', title: 'Time Series Talk : ARIMA Model', url: 'https://www.youtube.com/watch?v=3UmyHed0iYE', minutes: 9 },
    { creator: 'Rob Mulla', title: 'Time Series Forecasting with XGBoost - Use python and machine learning to predict energy consumption', url: 'https://www.youtube.com/watch?v=vV12dGe_Fho', minutes: 23 },
  ],
};
