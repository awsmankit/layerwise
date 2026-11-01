import type { LessonVideos } from './types';

/** Videos for the lessons in the wave 5 "lessons-a" batch. Keys are "<track>/<slug>". */
export const videosW5LessonsA: LessonVideos = {
  'start/how-ai-finds-things-in-a-picture': [
    { creator: 'CodeAI', title: 'How Computer Vision Works', url: 'https://www.youtube.com/watch?v=2hXG8v8p0KM', minutes: 6, easy: true },
    { creator: 'CodeAI', title: 'Images, Pixels and RGB', url: 'https://www.youtube.com/watch?v=15aqFQQVBWU', minutes: 6, easy: true },
  ],
  'deep-learning/detection-and-segmentation': [
    { creator: 'DeepLearningAI', title: 'C4W3L06 Intersection Over Union', url: 'https://www.youtube.com/watch?v=ANIzQ5G-XPE', minutes: 4 },
    { creator: 'DeepLearningAI', title: 'C4W3L07 Nonmax Suppression', url: 'https://www.youtube.com/watch?v=VAo84c1hQX8', minutes: 8 },
    { creator: 'Yannic Kilcher', title: 'DETR: End-to-End Object Detection with Transformers (Paper Explained)', url: 'https://www.youtube.com/watch?v=T35ba_VXkMY', minutes: 41 },
  ],
};
