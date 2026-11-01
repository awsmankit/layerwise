import type { LessonVideos } from './types';

/** Videos for the lessons in the wave 2 "evals" batch. Keys are "<track>/<slug>". */
export const videosW2Evals: LessonVideos = {
  'evals/building-an-eval-dataset': [
    { creator: 'Hamel Husain', title: 'Error Analysis: The Highest ROI Technique In AI Engineering', url: 'https://www.youtube.com/watch?v=e2i6JbU2R-s', minutes: 12 },
    { creator: "Lenny's Podcast", title: 'Why AI evals are the hottest new skill for product builders | Hamel Husain & Shreya Shankar', url: 'https://www.youtube.com/watch?v=BsWxPI9UM4c', minutes: 107 },
  ],
  'evals/why-models-make-things-up': [
    { creator: 'Andrej Karpathy', title: 'Deep Dive into LLMs like ChatGPT', url: 'https://www.youtube.com/watch?v=7xTGNNLPyMI', minutes: 211 },
  ],
};
