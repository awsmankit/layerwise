import type { LessonVideos } from './types';

/** Videos for the lessons in the "dl-b" batch. Keys are "<track>/<slug>". Titles, creators and lengths checked 2026-11-01. */
export const videosW1DlB: LessonVideos = {
  'deep-learning/how-computers-see': [
    {
      creator: 'Computerphile',
      title: 'CNN: Convolutional Neural Networks Explained - Computerphile',
      url: 'https://www.youtube.com/watch?v=py5byOOHZM8',
      minutes: 14,
      easy: true,
    },
    {
      creator: 'StatQuest with Josh Starmer',
      title: 'Neural Networks Part 8: Image Classification with Convolutional Neural Networks (CNNs)',
      url: 'https://www.youtube.com/watch?v=HGwBXDKFk9I',
      minutes: 15,
    },
    {
      creator: 'Welch Labs',
      title: 'The most cited paper of the century is a brilliant hack',
      url: 'https://www.youtube.com/watch?v=QgH9sr7G13Q',
      minutes: 35,
    },
  ],
  'deep-learning/diffusion-models': [
    {
      creator: 'Computerphile',
      title: 'How AI Image Generators Work (Stable Diffusion / Dall-E) - Computerphile',
      url: 'https://www.youtube.com/watch?v=1CIpzeNxIhU',
      minutes: 18,
      easy: true,
    },
    {
      creator: '3Blue1Brown',
      title: 'But how do AI images and videos actually work? | Guest video by Welch Labs',
      url: 'https://www.youtube.com/watch?v=iv-5mZ_9CPY',
      minutes: 37,
    },
  ],
};
