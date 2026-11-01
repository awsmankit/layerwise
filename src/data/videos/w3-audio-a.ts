import type { LessonVideos } from './types';

/** Videos for the lessons in the wave 3 "audio-a" batch. Keys are "<track>/<slug>". */
export const videosW3AudioA: LessonVideos = {
  'audio/speech-recognition': [
    { creator: 'Stanford University School of Engineering', title: 'Lecture 12: End-to-End Models for Speech Processing', url: 'https://www.youtube.com/watch?v=3MjIkWxXigM', minutes: 76 },
    { creator: 'DataMListic', title: 'Connectionist Temporal Classification (CTC) Explained', url: 'https://www.youtube.com/watch?v=jDPl1QJGLpE', minutes: 20 },
    { creator: 'Aladdin Persson', title: 'Whisper Paper Explained: Robust Speech Recognition via Large-Scale Weak Supervision', url: 'https://www.youtube.com/watch?v=Kh058oMt-08', minutes: 33 },
  ],
  'audio/noise-suppression-and-hearing-devices': [
    { creator: 'W3C', title: 'RNNoise, Neural Speech Enhancement, and the Browser', url: 'https://www.youtube.com/watch?v=nsscrYdrGRE', minutes: 7 },
  ],
};
