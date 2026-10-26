/**
 * Interview questions. One shape serves both sides of the table: a candidate
 * practises against `strong` and `followUps`; an interviewer scores against
 * the same points, watches for `redFlags`, and uses the shared rubric.
 */

export const roles = {
  'ai-eng': 'AI / LLM application engineer',
  'ml-platform': 'ML platform / infrastructure engineer',
  'ml-eng': 'ML engineer (models and data)',
} as const;
export type Role = keyof typeof roles;

export const ilevels = {
  junior: 'Junior',
  mid: 'Mid-level',
  senior: 'Senior',
} as const;
export type ILevel = keyof typeof ilevels;

export const kinds = {
  concept: 'Explain a concept',
  estimation: 'Estimation',
  debugging: 'Debugging',
  design: 'System design',
  coding: 'Coding',
  behavioural: 'Behavioural',
} as const;
export type Kind = keyof typeof kinds;

export type FollowUp = { q: string; lookFor: string };

export type Question = {
  /** Stable, kebab-case. Used in URLs and saved progress. */
  id: string;
  prompt: string;
  roles: Role[];
  level: ILevel;
  kind: Kind;
  /** Short topic tags for filtering, lower case. */
  topics: string[];
  minutes: number;
  /** What a strong answer covers: 4 to 8 checkable points. */
  strong: string[];
  /** Asked in order, each harder than the last. */
  followUps: FollowUp[];
  /** Signs of a weak or risky answer. */
  redFlags: string[];
  /** Lesson keys "<track>/<slug>" to study. */
  lessons: string[];
  /** Optional game to practise on. */
  game?: { label: string; href: string };
};

/** The same four-point scale for every question, so scores mean the same thing across interviewers. */
export const rubric = [
  { score: 1, label: 'Not yet', meaning: 'Misses most strong points, or says something wrong that would cause harm in production.' },
  { score: 2, label: 'Partial', meaning: 'Covers some points with prompting. Explanation is shaky or memorised rather than understood.' },
  { score: 3, label: 'Solid', meaning: 'Covers most strong points unprompted and handles the first follow-up well.' },
  { score: 4, label: 'Strong', meaning: 'Covers the strong points, handles the harder follow-ups, names trade-offs and how they would measure them.' },
] as const;
