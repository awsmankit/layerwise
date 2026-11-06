/**
 * What if we never run evals before shipping? A small made-up example: a support assistant is changed
 * six times. A test set of 40 cases (5 groups of 8) is run after each change. The pass or fail of every
 * case is computed from a fixed "difficulty" per case and a "skill" per group per release, with a seeded
 * random generator, so the page is the same on the server and in the browser. All numbers are an
 * illustration, not a measurement of any real product.
 */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const groups = [
  { id: 'refund', label: 'Refund rules', important: true },
  { id: 'tone', label: 'Friendly tone', important: false },
  { id: 'order', label: 'Order status', important: false },
  { id: 'faq', label: 'Opening hours and FAQ', important: false },
  { id: 'lang', label: 'Other languages', important: false },
] as const;

export const CASES_PER_GROUP = 8;
export const RELEASES = 6;
/** Release 5 is the change that breaks the important group while polishing the rest. */
export const BREAKING_RELEASE = 5;

/** Chance the assistant handles a case of this group, per release (R1 to R6). Example values. */
const skill: Record<string, number[]> = {
  refund: [0.88, 0.9, 0.9, 0.92, 0.4, 0.4],
  tone: [0.55, 0.6, 0.66, 0.7, 0.88, 0.9],
  order: [0.6, 0.64, 0.7, 0.72, 0.78, 0.8],
  faq: [0.62, 0.66, 0.7, 0.74, 0.8, 0.82],
  lang: [0.45, 0.5, 0.55, 0.6, 0.72, 0.75],
};

export type Case = { id: string; group: string; label: string; difficulty: number };

/** The test set: 40 cases, each with a fixed difficulty between 0 and 1. A case passes when skill beats difficulty. */
export const cases: Case[] = (() => {
  const rnd = mulberry32(1144);
  const out: Case[] = [];
  for (const g of groups) {
    for (let i = 1; i <= CASES_PER_GROUP; i++) {
      out.push({ id: `${g.id}-${i}`, group: g.id, label: `${g.label} ${i}`, difficulty: rnd() });
    }
  }
  return out;
})();

/** Does this case pass in this release (1 to 6)? */
export function passes(c: Case, release: number): boolean {
  return skill[c.group][release - 1] > c.difficulty;
}

export function groupPass(group: string, release: number): number {
  return cases.filter((c) => c.group === group && passes(c, release)).length;
}

export function totalPass(release: number): number {
  return cases.filter((c) => passes(c, release)).length;
}

/** Overall pass rate, 0 to 1. */
export function overallRate(release: number): number {
  return totalPass(release) / cases.length;
}

/** 95% Wilson score interval for k passes out of n cases. */
export function wilson(k: number, n: number, z = 1.96): { lo: number; hi: number } {
  if (n === 0) return { lo: 0, hi: 1 };
  const p = k / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return { lo: Math.max(0, centre - half), hi: Math.min(1, centre + half) };
}

/** Cases whose result changed between the release before and this one. */
export function flips(release: number): { broke: Case[]; fixed: Case[] } {
  if (release <= 1) return { broke: [], fixed: [] };
  const broke: Case[] = [];
  const fixed: Case[] = [];
  for (const c of cases) {
    const a = passes(c, release - 1);
    const b = passes(c, release);
    if (a && !b) broke.push(c);
    if (!a && b) fixed.push(c);
  }
  return { broke, fixed };
}

/** The important group must keep at least this many of its 8 cases passing. */
export const FLOOR = 6;

/** The "ship gate": block a release if an important group falls below the floor or loses more than one case at once. */
export function blocked(release: number, tolerance = 1): boolean {
  return groups.some((g) => {
    if (!g.important) return false;
    const now = groupPass(g.id, release);
    const drop = release <= 1 ? 0 : groupPass(g.id, release - 1) - now;
    return now < FLOOR || drop > tolerance;
  });
}

/** The first release a gate would have blocked, or null. */
export function firstBlocked(): number | null {
  for (let r = 1; r <= RELEASES; r++) if (blocked(r)) return r;
  return null;
}

/** "72.5%" */
export function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

/** Does the overall interval of the new release overlap the old one? If so the average alone cannot show a change. */
export function intervalsOverlap(release: number): boolean {
  if (release <= 1) return true;
  const a = wilson(totalPass(release - 1), cases.length);
  const b = wilson(totalPass(release), cases.length);
  return a.lo <= b.hi && b.lo <= a.hi;
}
