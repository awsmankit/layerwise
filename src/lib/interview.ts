import type { ILevel, Kind, Question, Role } from '../data/interview/types';

/** Small deterministic PRNG, so the same seed always gives the same set. */
export function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], seed: string): T[] {
  const r = rng(seed);
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const LEVEL_ORDER: ILevel[] = ['junior', 'mid', 'senior'];

/** Questions suitable for a level: that level, plus the one below it. */
export function suitable(q: Question, role: Role | 'any', level: ILevel | 'any'): boolean {
  if (role !== 'any' && !q.roles.includes(role)) return false;
  if (level === 'any') return true;
  const want = LEVEL_ORDER.indexOf(level);
  const have = LEVEL_ORDER.indexOf(q.level);
  return have === want || have === want - 1;
}

/**
 * Build an interview that fits a time box: at most one design question,
 * at most one behavioural, then a mix of the rest, preferring the target
 * level. Leaves 5 minutes for the candidate's own questions.
 */
export function buildSet(all: Question[], role: Role | 'any', level: ILevel | 'any', minutes: number, seed: string): Question[] {
  const first = pick(all, role, level, minutes, seed, []);
  const budget = Math.max(10, minutes - 5);
  // a role with few questions at this level: top up from other roles at the same level
  if (role !== 'any' && totalMinutes(first) < budget * 0.6) return pick(all, 'any', level, minutes, seed, first);
  return first;
}

function pick(all: Question[], role: Role | 'any', level: ILevel | 'any', minutes: number, seed: string, start: Question[]): Question[] {
  const pool = shuffle(all.filter((q) => suitable(q, role, level)), seed);
  const atLevel = (q: Question) => (level === 'any' || q.level === level ? 0 : 1);
  pool.sort((a, b) => atLevel(a) - atLevel(b));

  const budget = Math.max(10, minutes - 5);
  const chosen: Question[] = [...start];
  let used = totalMinutes(start);
  const kindCount: Partial<Record<Kind, number>> = {};
  for (const q of start) kindCount[q.kind] = (kindCount[q.kind] ?? 0) + 1;
  const caps: Partial<Record<Kind, number>> = { design: 1, behavioural: 1, coding: 1 };

  // a design question anchors senior interviews, but only when it still
  // leaves at least 20 minutes for a mix of other questions
  const MIN_REST = 20;
  if ((level === 'senior' || level === 'any') && !(kindCount.design ?? 0)) {
    const d = pool.find((q) => q.kind === 'design' && q.minutes + MIN_REST <= budget);
    if (d) {
      chosen.push(d);
      used += d.minutes;
      kindCount.design = 1;
    }
  }
  for (const q of pool) {
    if (chosen.includes(q)) continue;
    if (used + q.minutes > budget) continue;
    if (q.kind === 'design' && q.minutes + MIN_REST > budget) continue;
    const cap = caps[q.kind];
    if (cap !== undefined && (kindCount[q.kind] ?? 0) >= cap) continue;
    // avoid more than two questions on the same first topic
    const t = q.topics[0];
    if (chosen.filter((c) => c.topics[0] === t).length >= 2) continue;
    chosen.push(q);
    used += q.minutes;
    kindCount[q.kind] = (kindCount[q.kind] ?? 0) + 1;
  }
  return chosen;
}

export function totalMinutes(qs: Question[]): number {
  return qs.reduce((n, q) => n + q.minutes, 0);
}

/**
 * A suggested score on the shared 1 to 4 rubric from what was covered.
 * The interviewer (or candidate) can always override it.
 */
export function suggestScore(covered: number, total: number, followUpsGood: number, harmfulFlag: boolean): 1 | 2 | 3 | 4 {
  if (harmfulFlag) return 1;
  const share = total > 0 ? covered / total : 0;
  if (share >= 0.85 && followUpsGood >= 2) return 4;
  if (share >= 0.6 && followUpsGood >= 1) return 3;
  if (share >= 0.6) return 3;
  if (share >= 0.3) return 2;
  return 1;
}

export type ScoreRow = { id: string; prompt: string; score: number | null; covered: string[]; missed: string[]; flags: string[]; notes: string };

export function scorecardMarkdown(title: string, rows: ScoreRow[]): string {
  const scored = rows.filter((r) => r.score !== null);
  const avg = scored.length ? scored.reduce((n, r) => n + (r.score ?? 0), 0) / scored.length : null;
  const lines = [
    `# ${title}`,
    '',
    `Average score: ${avg === null ? 'not scored' : avg.toFixed(1)} on a 1 to 4 scale (${scored.length} of ${rows.length} questions scored)`,
    '',
  ];
  rows.forEach((r, i) => {
    lines.push(`## ${i + 1}. ${r.prompt}`, '', `Score: ${r.score ?? 'not scored'}`, '');
    if (r.covered.length) lines.push('Covered:', ...r.covered.map((c) => `- ${c}`), '');
    if (r.missed.length) lines.push('Not covered:', ...r.missed.map((c) => `- ${c}`), '');
    if (r.flags.length) lines.push('Red flags seen:', ...r.flags.map((c) => `- ${c}`), '');
    if (r.notes.trim()) lines.push('Notes:', '', r.notes.trim(), '');
  });
  return lines.join('\n');
}
