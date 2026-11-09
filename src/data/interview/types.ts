/**
 * Interview questions. The pages teach: a reader opens a question and reads an answer. Where a written
 * answer exists (src/data/interview/answers/) it is shown; otherwise `strong`, `followUps` and `redFlags`
 * are shown as "what a good answer covers". They were written as evaluator notes and are also the source
 * material for the written answers.
 */

export const roles = {
  'ai-eng': 'AI / LLM application engineer',
  'agentic-eng': 'Agentic AI engineer',
  'ml-eng': 'ML engineer (models and data)',
  research: 'Applied scientist / research engineer',
  'data-scientist': 'Data scientist / analyst',
  'ml-platform': 'ML platform / infrastructure engineer',
  'data-eng': 'Data engineer for AI',
  'edge-ml': 'Edge and embedded ML engineer',
  'ai-test': 'AI test and evaluation engineer',
  'ai-security': 'AI security engineer',
  'responsible-ai': 'Responsible AI and governance lead',
  fde: 'Forward deployed engineer',
  'solutions-architect': 'AI solutions architect / pre-sales engineer',
  'ai-pm': 'AI product manager',
  'ai-lead': 'AI engineering lead / manager',
  'sw-ai-tools': 'Software engineer using AI tools',
} as const;
export type Role = keyof typeof roles;

/** The same roles in groups, so a long list stays easy to scan in a dropdown. */
export const roleGroups: { label: string; roles: Role[] }[] = [
  { label: 'Building models and apps', roles: ['ai-eng', 'agentic-eng', 'ml-eng', 'research', 'data-scientist'] },
  { label: 'Data, platform and devices', roles: ['ml-platform', 'data-eng', 'edge-ml'] },
  { label: 'Quality, safety and risk', roles: ['ai-test', 'ai-security', 'responsible-ai'] },
  { label: 'Customers, product and teams', roles: ['fde', 'solutions-architect', 'ai-pm', 'ai-lead', 'sw-ai-tools'] },
];

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
