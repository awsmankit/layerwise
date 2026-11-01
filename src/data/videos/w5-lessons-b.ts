import type { LessonVideos } from './types';

/**
 * Videos for the lessons in the wave 5 "lessons-b" batch. Keys are "<track>/<slug>".
 * Titles and creators checked on 2026-11-01 (YouTube oEmbed, or the watch page where embedding is disabled).
 */
export const videosW5LessonsB: LessonVideos = {
  'start/ai-and-careers': [
    { creator: 'Association for Computing Machinery (ACM)', title: 'Andrew Ng on Building a Career in Machine Learning', url: 'https://www.youtube.com/watch?v=4kiHsIaK9_w', minutes: 60 },
  ],
  'responsible/ai-and-work': [
    { creator: 'Stanford Digital Economy Lab', title: 'David Autor: Does automation replace experts or augment expertise? The answer is YES.', url: 'https://www.youtube.com/watch?v=uV3Lttj85gA', minutes: 59 },
  ],
  'skills/reading-an-ai-paper': [
    { creator: 'Stanford Online', title: 'Stanford CS230: Deep Learning | Autumn 2018 | Lecture 8 - Career Advice / Reading Research Papers', url: 'https://www.youtube.com/watch?v=733m6qBH-jI', minutes: 65 },
    { creator: 'Yannic Kilcher', title: 'Attention Is All You Need', url: 'https://www.youtube.com/watch?v=iDulhoQ2pro', minutes: 27 },
  ],
};
