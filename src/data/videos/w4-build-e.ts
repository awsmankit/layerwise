import type { LessonVideos } from './types';

/** Videos for the lessons in the wave 4 "build-e" batch. Keys are "<track>/<slug>". */
export const videosW4BuildE: LessonVideos = {
  'evals/guardrails-in-practice': [
    { creator: 'Computerphile', title: "Generative AI's Greatest Flaw - Computerphile", url: 'https://www.youtube.com/watch?v=rAEqP9VEhe8', minutes: 12, easy: true },
    { creator: 'Simon Willison', title: 'Prompt Injection, explained', url: 'https://www.youtube.com/watch?v=FgxwCaL6UTA', minutes: 12 },
  ],
  'evals/observability-for-llm-apps': [
    { creator: 'ByteMonk', title: 'Distributed Tracing in Microservices | System Design', url: 'https://www.youtube.com/watch?v=XYvQHjWJJTE', minutes: 7 },
    { creator: 'Hamel Husain', title: 'Error Analysis: The Highest ROI Technique In AI Engineering', url: 'https://www.youtube.com/watch?v=e2i6JbU2R-s', minutes: 12 },
  ],
};
