import type { LessonVideos } from './types';

/** Videos for the lessons in the wave 4 "resp-c" batch. Keys are "<track>/<slug>". */
export const videosW4RespC: LessonVideos = {
  'responsible/energy-and-water-of-ai': [
    { creator: 'TED', title: 'We’re Doing AI All Wrong. Here’s How to Get It Right | Sasha Luccioni  | TED', url: 'https://www.youtube.com/watch?v=Bl-vPf_IAoA', minutes: 11, easy: true },
    { creator: 'TED', title: 'AI Is Dangerous, but Not for the Reasons You Think | Sasha Luccioni | TED', url: 'https://www.youtube.com/watch?v=eXdVDhOGqoE', minutes: 10, easy: true },
  ],
  'responsible/medical-and-regulated-ai': [
    { creator: 'MIT OpenCourseWare', title: '24. Robustness to Dataset Shift', url: 'https://www.youtube.com/watch?v=MdUnh4PaGKw', minutes: 75 },
  ],
};
