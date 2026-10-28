import type { Lab } from './types';

/**
 * Every lab, discovered from the files named `*.lab.ts` in this folder, each exporting
 * `lab`. Adding a lab is adding a file; nothing else needs editing. Sorted easiest first.
 */
const files = import.meta.glob<{ lab: Lab }>('./*.lab.ts', { eager: true });
const rank = { basic: 0, intermediate: 1, advanced: 2 } as const;

export const labs: Lab[] = Object.values(files)
  .map((m) => m.lab)
  .sort((a, b) => rank[a.level] - rank[b.level] || a.minutes - b.minutes || a.title.localeCompare(b.title));

export const labById = (id: string) => labs.find((l) => l.id === id);
