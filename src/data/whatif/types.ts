/**
 * A "What if?" experiment: take one part of an AI system away (or change it) and watch what breaks.
 * Each one is a file `<slug>.item.ts` in this folder exporting `item`, plus a demo component at
 * src/components/whatif/<slug>.tsx (default export). The logic behind the numbers lives in
 * src/lib/whatif/<slug>.ts with a test, so the figures on screen are computed, never typed in.
 */

export const areas = {
  llm: 'Inside a language model',
  retrieval: 'Search and RAG',
  training: 'Training',
  serving: 'Serving and cost',
  agents: 'Agents and safety',
  edge: 'Devices and audio',
} as const;
export type Area = keyof typeof areas;

export type WhatIf = {
  /** kebab-case, equal to the file name and the demo component's file name. */
  slug: string;
  /** The question, e.g. "What if there is no KV cache?" */
  title: string;
  /** One plain sentence: what you will see. */
  blurb: string;
  area: Area;
  level: 'basic' | 'intermediate' | 'advanced';
  minutes: number;
  /** Two to four short paragraphs: what the part does, what happens without it, and why real systems keep it. Plain words. */
  why: string[];
  /** Three or four lines to remember. */
  takeaways: string[];
  /** Lesson keys "<track>/<slug>" that teach the part properly. */
  lessons: string[];
  /** Official or primary sources, verified. */
  sources: { label: string; url: string }[];
  /** ISO date the facts and example figures were checked. */
  updated: string;
};
