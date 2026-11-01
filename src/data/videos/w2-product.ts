import type { LessonVideos } from './types';

/** Videos for the lessons in the wave 2 "product" batch. Keys are "<track>/<slug>". */
export const videosW2Product: LessonVideos = {
  'systems/when-not-to-use-an-llm': [
    { creator: 'The MAD Podcast with Matt Turck', title: 'What You MUST Know About AI Engineering | Chip Huyen, Author of “AI Engineering”', url: 'https://www.youtube.com/watch?v=p7F4f42iZ-c', minutes: 73 },
  ],
  'llm/choosing-and-comparing-models': [
    { creator: 'Machine Learning Street Talk', title: 'New Research: LMArena is "rigged"', url: 'https://www.youtube.com/watch?v=9W_OhS38rIE', minutes: 27 },
    { creator: 'CampusX', title: 'Whats is LLM Benchmarking | Benchmark Saturation vs. Contamination | CampusX', url: 'https://www.youtube.com/watch?v=qIiU3lyjrhM', minutes: 51 },
    { creator: "Lenny's Podcast", title: 'Why AI evals are the hottest new skill for product builders | Hamel Husain & Shreya Shankar', url: 'https://www.youtube.com/watch?v=BsWxPI9UM4c', minutes: 107 },
  ],
};
