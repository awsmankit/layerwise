import type { WhatIf, Area } from './types';
import { areas } from './types';

export * from './types';

/** Every experiment, discovered from the files named `*.item.ts` in this folder. Adding one is adding a file. */
const files = import.meta.glob<{ item: WhatIf }>('./*.item.ts', { eager: true });
const rank = { basic: 0, intermediate: 1, advanced: 2 } as const;

export const whatifs: WhatIf[] = Object.values(files)
  .map((m) => m.item)
  .sort((a, b) => rank[a.level] - rank[b.level] || a.title.localeCompare(b.title));

export const whatifBySlug = (slug: string) => whatifs.find((w) => w.slug === slug);

export const whatifsByArea = (): { area: Area; label: string; items: WhatIf[] }[] =>
  (Object.keys(areas) as Area[])
    .map((a) => ({ area: a, label: areas[a], items: whatifs.filter((w) => w.area === a) }))
    .filter((g) => g.items.length > 0);
