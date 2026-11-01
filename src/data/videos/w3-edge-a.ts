import type { LessonVideos } from './types';

/** Videos for the lessons in the wave 3 "edge-a" batch. Keys are "<track>/<slug>". */
export const videosW3EdgeA: LessonVideos = {
  'edge/inside-a-small-device': [
    { creator: 'Lex Fridman', title: 'Efficient Computing for Deep Learning, Robotics, and AI (Vivienne Sze) | MIT Deep Learning Series', url: 'https://www.youtube.com/watch?v=WbLQqPw_n88', minutes: 79 },
    { creator: 'EDGE AI FOUNDATION', title: 'tinyML Talks - Pete Warden: Getting started with TinyML', url: 'https://www.youtube.com/watch?v=soOM1F70Boc', minutes: 65 },
  ],
  'edge/from-pytorch-to-the-chip': [
    { creator: 'Harvard CS249R: Intro to TinyML', title: '"TVM: An End to End Deep Learning Compiler Stack" by Thiery Moreau (OctoML)', url: 'https://www.youtube.com/watch?v=JmWWAnHBDx0', minutes: 61 },
  ],
};
