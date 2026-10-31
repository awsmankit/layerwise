import type { LessonVideos } from './types';

/** Videos for the lessons in the "audio" batch. Keys are "<track>/<slug>". */
export const videosW1Audio: LessonVideos = {
  'audio/how-a-computer-hears': [
    { creator: 'Technology Connections', title: 'Sound By Numbers: The Rise of Digital Sound', url: 'https://www.youtube.com/watch?v=Gd_mhBf_FJA', minutes: 14, easy: true },
    { creator: 'Computerphile', title: 'How Digital Audio Works - Computerphile', url: 'https://www.youtube.com/watch?v=1RIA9U5oXro', minutes: 12 },
  ],
  'audio/spectrograms-and-the-mel-scale': [
    { creator: '3Blue1Brown', title: 'But what is the Fourier Transform?  A visual introduction.', url: 'https://www.youtube.com/watch?v=spUNpyF58BY', minutes: 20 },
    { creator: 'Valerio Velardo - The Sound of AI', title: 'Mel Spectrograms Explained Easily', url: 'https://www.youtube.com/watch?v=9GHCiiDLHQ4', minutes: 31 },
  ],
};
