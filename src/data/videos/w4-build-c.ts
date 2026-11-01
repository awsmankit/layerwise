import type { LessonVideos } from './types';

/**
 * Videos for the lessons in the wave 4 "build-c" batch. Keys are "<track>/<slug>". Each was checked against
 * YouTube's oEmbed endpoint on 2026-11-01; title and creator are copied from it, minutes rounded from the
 * watch page. Views at that date: Computerphile 614k, Simon Willison 23k, Denys on Data 25k. Metadata was
 * verified; the videos themselves were not watched end to end.
 */
export const videosW4BuildC: LessonVideos = {
  'rag-agents/text-to-sql-and-data-agents': [
    { creator: 'Denys on Data', title: 'LLM for data analytics: text-to-sql 3 architecture patterns', url: 'https://www.youtube.com/watch?v=vdD7KQx7gzs', minutes: 7 },
  ],
  'rag-agents/computer-use-and-browser-agents': [
    { creator: 'Computerphile', title: "Generative AI's Greatest Flaw - Computerphile", url: 'https://www.youtube.com/watch?v=rAEqP9VEhe8', minutes: 12 },
    { creator: 'Simon Willison', title: 'Prompt Injection, explained', url: 'https://www.youtube.com/watch?v=FgxwCaL6UTA', minutes: 12 },
  ],
};
