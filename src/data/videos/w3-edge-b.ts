import type { LessonVideos } from './types';

/** Videos for the lessons in the wave 3 "edge-b" batch. Keys are "<track>/<slug>". */
export const videosW3EdgeB: LessonVideos = {
  'edge/real-time-on-a-budget': [
    { creator: 'ADC - Audio Developer Conference', title: 'Fabian Renn-Giles & Dave Rowland - Real-time 101 - part I: Investigating the real-time problem space', url: 'https://www.youtube.com/watch?v=Q0vrQFyAdWI', minutes: 56 },
    { creator: 'EDGE AI FOUNDATION', title: 'tinyML Talks Vijay Janapa Reddi: tinyMLPerf: Deep Learning Benchmarks for embedded devices', url: 'https://www.youtube.com/watch?v=uX6UW4qmmPc', minutes: 66 },
  ],
  'edge/tinyml-wake-word-detector': [
    { creator: 'EDGE AI FOUNDATION', title: 'tinyML Talks - Pete Warden: Getting started with TinyML', url: 'https://www.youtube.com/watch?v=soOM1F70Boc', minutes: 65 },
    { creator: 'HACKADAY', title: 'Remoticon 2020 // TinyML: Using Machine Learning on Microcontrollers to Recognize Speech', url: 'https://www.youtube.com/watch?v=iO7_qr9s3lw', minutes: 119 },
  ],
};
