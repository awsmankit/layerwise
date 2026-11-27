import type { CategoryId } from '../categories';

/**
 * A quick question: the short, direct kind asked in almost every interview round ("What is a KV cache?"),
 * with a plain answer a beginner can follow. They sit at the top of each category page, before the longer
 * scenario and design questions, so a reader goes from the idea to the real-world case.
 */
export type QuickQuestion = {
  /** Stable, kebab-case, unique across all quick questions. */
  id: string;
  category: CategoryId;
  /** The question as an interviewer asks it. Short, ends with "?". */
  q: string;
  /** Two to four plain sentences: what it is, and why it matters or why it works that way. */
  answer: string;
  /** One concrete example, analogy or small calculation, labelled as an example where it uses made-up numbers. */
  example: string;
  /** The follow-up an interviewer usually asks next, and its short answer. */
  next?: { q: string; a: string };
  /** Lesson key "<track>/<slug>" that explains it fully. */
  lesson: string;
  /** Optional id of a full interview question (a scenario or design) to try next. */
  scenario?: string;
};
