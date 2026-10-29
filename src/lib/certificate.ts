import { paths, pathIds, type PathId } from '../data/paths';
import { readStore, writeStore, KEYS } from './store';

/**
 * Path completion certificates. Pure helpers, kept apart from the React islands so they
 * can be tested. A path is complete when every lesson step in it is in the done list;
 * games do not count, because nothing reliably says a game was finished.
 */

export type QuizBest = Record<string, { score: number; total: number }>;
/** When each path was first seen complete in this browser, as YYYY-MM-DD. */
export type CertDates = Partial<Record<PathId, string>>;

export type Completion = {
  done: number;
  total: number;
  complete: boolean;
  /** Lesson keys still to do, in path order. */
  remaining: string[];
};

export const isPathId = (id: string): id is PathId => (pathIds as string[]).includes(id);

/** The lesson keys of a path in order, without games and without repeats. */
export function pathLessons(pathId: PathId): string[] {
  const keys = paths[pathId].steps.flatMap((s) => (s.kind === 'lesson' ? [s.key] : []));
  return [...new Set(keys)];
}

export function pathCompletion(pathId: PathId, doneKeys: readonly string[]): Completion {
  const lessons = pathLessons(pathId);
  const done = new Set(doneKeys);
  const remaining = lessons.filter((k) => !done.has(k));
  return { done: lessons.length - remaining.length, total: lessons.length, complete: lessons.length > 0 && remaining.length === 0, remaining };
}

/**
 * The average best quiz score over the given lessons, as a whole percentage, counting
 * only lessons whose quiz was taken. Null when none was.
 */
export function averageQuizScore(lessonKeys: readonly string[], quiz: QuizBest): number | null {
  const ratios = lessonKeys.map((k) => quiz[k]).filter((q) => q && q.total > 0).map((q) => Math.min(1, Math.max(0, q.score / q.total)));
  if (ratios.length === 0) return null;
  return Math.round((ratios.reduce((a, b) => a + b, 0) / ratios.length) * 100);
}

/** The path named in a URL's hash or query: "#newcomer", "?path=newcomer" or "?newcomer". */
export function pathFromUrl(hash: string, search: string): PathId | null {
  const h = decodeURIComponent(hash.replace(/^#/, '')).trim();
  if (isPathId(h)) return h;
  const q = new URLSearchParams(search);
  const p = q.get('path') ?? q.get('p');
  if (p && isPathId(p)) return p;
  for (const k of q.keys()) if (isPathId(k)) return k;
  return null;
}

/** YYYY-MM-DD in the learner's own time zone. */
export function isoDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "29 October 2026" for a YYYY-MM-DD day. */
export function formatDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  if (!y || !m || !d) return day;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/**
 * Adds today's date for every path that is complete and has no date yet. The first date
 * is kept, so redoing a lesson later does not move it. Returns the same object when
 * nothing changed.
 */
export function withCompletionDates(dates: CertDates, doneKeys: readonly string[], today: string): CertDates {
  let out = dates;
  for (const id of pathIds) {
    if (out[id] || !pathCompletion(id, doneKeys).complete) continue;
    out = { ...out, [id]: today };
  }
  return out;
}

/** Records completion dates in the browser. Called whenever the done list changes. */
export function stampCompletions(doneKeys: readonly string[]): void {
  const dates = readStore<CertDates>(KEYS.certs, {});
  const next = withCompletionDates(dates && typeof dates === 'object' ? dates : {}, doneKeys, isoDay(new Date()));
  if (next !== dates) writeStore(KEYS.certs, next);
}

/** A learner's name, tidied: no runs of spaces, at most 60 characters. */
export const cleanName = (name: string) => name.replace(/\s+/g, ' ').trimStart().slice(0, 60);

/**
 * Greedy word wrap. `measure` gives a string's width in the same units as `maxWidth`.
 * A single word wider than the line gets a line of its own.
 */
export function wrapText(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const tryLine = line ? `${line} ${word}` : word;
    if (line && measure(tryLine) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = tryLine;
  }
  if (line) lines.push(line);
  return lines;
}
