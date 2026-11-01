import type { LessonVideos } from './types';

/** Videos for the lessons in the wave 3 "edge-c" batch. Keys are "<track>/<slug>". */
export const videosW3EdgeC: LessonVideos = {
  'edge/small-language-models-on-device': [
    { creator: 'AI Engineer', title: 'From 46% to 90%: Fine-Tuning Tiny LLMs for On-Device Agents — Cormac Brick, Google', url: 'https://www.youtube.com/watch?v=-TiET_K-E_g', minutes: 21 },
    { creator: 'Julia Turc', title: 'How is hardware reshaping LLM design?', url: 'https://www.youtube.com/watch?v=BSzhrZOp2x8', minutes: 23 },
  ],
  'edge/shipping-to-a-fleet': [
    { creator: 'codebasics', title: 'What is Federated Learning?', url: 'https://www.youtube.com/watch?v=VrEQBlEVri0', minutes: 8, easy: true },
    { creator: 'National Institute of Standards and Technology', title: 'What is Differential Privacy?', url: 'https://www.youtube.com/watch?v=-JRURYTfBXQ', minutes: 3, easy: true },
  ],
};
