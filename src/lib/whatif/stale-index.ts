/**
 * What if the search index is never refreshed? A SIMULATION with made-up numbers, not a measurement of any real system.
 * 120 documents sit in a search index. Each one changes now and then (some every few days, some almost never), at days
 * drawn by a seeded random generator. The index is rebuilt every R days (day 0, R, 2R, ...), or never after day 0.
 * A document is "outdated" on a day when it has changed since the index last copied it. Popular documents are asked
 * about far more often, so the share of questions answered from an outdated version is weighted by popularity.
 * Every figure on the page comes from these functions.
 */

export const DOC_COUNT = 120;
export const DAYS = 60;

/** Small seeded generator (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How often a kind of document changes: the chance that it changes on any one day (an example assumption). */
export const KINDS = [
  { id: 'fast', label: 'changes often (prices, stock, opening hours)', perDay: 1 / 6, share: 0.15 },
  { id: 'medium', label: 'changes now and then (policies, how-to pages)', perDay: 1 / 30, share: 0.35 },
  { id: 'slow', label: 'rarely changes (history, background)', perDay: 1 / 400, share: 0.5 },
] as const;

export type Doc = {
  id: number;
  kind: (typeof KINDS)[number]['id'];
  /** Share of all questions that ask about this document. Sums to 1. */
  weight: number;
  /** Days (1 to DAYS - 1), during the day, on which the document changes. */
  changes: number[];
};

/** Build the documents. Popular ones are spread across the kinds at random. */
export function makeDocs(seed = 7, count = DOC_COUNT, days = DAYS): Doc[] {
  const r = rng(seed);
  const kinds: Doc['kind'][] = [];
  for (const k of KINDS) for (let i = 0; i < Math.round(k.share * count); i++) kinds.push(k.id);
  while (kinds.length < count) kinds.push('slow');
  // shuffle (Fisher-Yates) so popularity is not tied to the kind
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }
  const raw = kinds.map((_, i) => 1 / (i + 1));
  const total = raw.reduce((s, x) => s + x, 0);
  return kinds.map((kind, i) => {
    const p = KINDS.find((k) => k.id === kind)!.perDay;
    const changes: number[] = [];
    for (let d = 1; d < days; d++) if (r() < p) changes.push(d);
    return { id: i, kind, weight: raw[i] / total, changes };
  });
}

export const DOCS: Doc[] = makeDocs();

/** The day the index was last rebuilt, on or before `day`. Infinity (or 0) means it was never rebuilt after day 0. */
export function lastRefresh(day: number, every: number): number {
  if (!isFinite(every) || every <= 0) return 0;
  return Math.floor(day / every) * every;
}

/**
 * Is the document's copy in the index out of date on this day? The rebuild runs at midnight and changes happen during
 * the day, so a change on day c is missed by every rebuild up to and including day c, and caught by the next one.
 */
export function isOutdated(doc: { changes: number[] }, day: number, every: number): boolean {
  const last = lastRefresh(day, every);
  return doc.changes.some((c) => c >= last && c <= day);
}

export function outdatedCount(day: number, every: number, docs: Doc[] = DOCS): number {
  return docs.filter((d) => isOutdated(d, day, every)).length;
}

/** Share of questions on this day answered from an outdated copy (0 to 1), weighted by how often each document is asked about. */
export function staleShare(day: number, every: number, docs: Doc[] = DOCS): number {
  return docs.reduce((s, d) => s + (isOutdated(d, day, every) ? d.weight : 0), 0);
}

/** Share for every day 0 .. days-1. */
export function dailyShares(every: number, docs: Doc[] = DOCS, days = DAYS): number[] {
  return Array.from({ length: days }, (_, d) => staleShare(d, every, docs));
}

/** Average share of outdated answers over the whole period. */
export function overallShare(every: number, docs: Doc[] = DOCS, days = DAYS): number {
  const s = dailyShares(every, docs, days);
  return s.reduce((a, b) => a + b, 0) / s.length;
}

/** The refresh intervals offered by the slider, in days. */
export const INTERVALS = [1, 2, 3, 5, 7, 10, 14, 20, 30] as const;

/** Rebuilding costs work: a full rebuild copies every document. Rebuilds per period for a given interval. */
export function rebuilds(every: number, days = DAYS): number {
  return isFinite(every) && every > 0 ? Math.floor((days - 1) / every) + 1 : 1;
}

/* ---------- one example document, in words ---------- */

export const EXAMPLE = {
  title: 'Returns policy page',
  versions: [
    { from: 0, text: 'You can return items within 30 days.' },
    { from: 12, text: 'You can return items within 14 days.' },
    { from: 33, text: 'Returns are only accepted within 14 days, and sale items cannot be returned.' },
  ],
};

/** The version of the page that is true on a day. */
export function truthOn(day: number): { from: number; text: string } {
  let v = EXAMPLE.versions[0];
  for (const x of EXAMPLE.versions) if (x.from <= day) v = x;
  return v;
}

/** The version a question gets on a day: whatever the index copied at its last midnight rebuild (day 0 is the first copy). */
export function indexedOn(day: number, every: number): { from: number; text: string } {
  const last = lastRefresh(day, every);
  return truthOn(Math.max(0, last - 1));
}

export function exampleOutdated(day: number, every: number): boolean {
  return indexedOn(day, every).from !== truthOn(day).from;
}

/** Days since the copy in the index was made. */
export function indexAge(day: number, every: number): number {
  return day - lastRefresh(day, every);
}

/**
 * The same share worked out from a formula instead of one random draw. A document that changes with chance p on any day
 * is outdated `a` days after a rebuild with chance 1 - (1 - p)^(a + 1). Average that over the days of the period.
 */
export function expectedShare(every: number, docs: Doc[] = DOCS, days = DAYS): number {
  let total = 0;
  for (const d of docs) {
    const p = KINDS.find((k) => k.id === d.kind)!.perDay;
    let sum = 0;
    for (let day = 0; day < days; day++) sum += 1 - Math.pow(1 - p, indexAge(day, every) + 1);
    total += d.weight * (sum / days);
  }
  return total;
}
