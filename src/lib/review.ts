/**
 * Daily review: a Leitner-style schedule for the quiz questions attached to lessons.
 *
 * Every question has an id, `<track>/<slug>#<index in the lesson's quiz array>`. A question
 * the learner has answered sits in one of six boxes. A right answer moves it up a box, a
 * wrong one drops it back to box 1, and the box sets how many days pass before it is due
 * again (1, 2, 4, 8, 16, 32). A question never answered has no card and counts as new.
 *
 * Everything here is pure. Nothing reads the clock: callers pass the day in as a
 * "YYYY-MM-DD" key (see `dayKey`), so tests and the page agree on what "today" is.
 * Days are the learner's local calendar days.
 */

export const INTERVALS = [1, 2, 4, 8, 16, 32] as const;
export const MAX_BOX = INTERVALS.length;
export const SESSION_SIZE = 5;
/** How many answered days are kept. Plenty for a streak and small enough for a restore link. */
export const MAX_DAYS = 400;

export type Card = { box: number; due: string; lastSeen: string };
export type ReviewState = {
  items: Record<string, Card>;
  /** Days (YYYY-MM-DD, ascending) on which at least one question was answered. */
  days: string[];
  /** True when the learner has switched the streak off. */
  hideStreak?: boolean;
};

export const EMPTY_REVIEW: ReviewState = { items: {}, days: [] };

/* ---------- days ---------- */

const pad = (n: number) => String(n).padStart(2, '0');
const DAY = /^\d{4}-\d{2}-\d{2}$/;
export const isDayKey = (s: unknown): s is string => typeof s === 'string' && DAY.test(s) && !Number.isNaN(dayNumber(s));

/** The local calendar day of a date, as YYYY-MM-DD. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Whole days since 1970-01-01 for a day key (no time zones involved). */
export function dayNumber(k: string): number {
  const [y, m, d] = k.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

function keyOfNumber(n: number): string {
  const t = new Date(n * 86_400_000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export const addDays = (k: string, n: number): string => keyOfNumber(dayNumber(k) + n);
/** Days from a to b (positive when b is later). */
export const daysBetween = (a: string, b: string): number => dayNumber(b) - dayNumber(a);

/* ---------- ids and the pool ---------- */

export type PoolItem = { id: string; key: string; index: number };

export const itemId = (lessonKey: string, index: number) => `${lessonKey}#${index}`;

export function parseId(id: string): { key: string; index: number } | null {
  const at = id.lastIndexOf('#');
  if (at < 1) return null;
  const index = Number(id.slice(at + 1));
  return Number.isInteger(index) && index >= 0 ? { key: id.slice(0, at), index } : null;
}

/**
 * The lessons whose questions may enter the pool, most recently finished first: lessons marked
 * done (the done list grows as lessons are finished, so its end is the newest), then lessons
 * that only have a quiz score.
 */
export function eligibleKeys(done: string[], scored: Record<string, unknown>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const k of [...done].reverse().concat(Object.keys(scored).reverse())) {
    if (!seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}

/** Every question of the given lessons, in lesson order, then question order. `sizes` is the number of questions per lesson. */
export function buildPool(keys: string[], sizes: Record<string, number>): PoolItem[] {
  const pool: PoolItem[] = [];
  for (const key of keys) {
    for (let index = 0; index < (sizes[key] ?? 0); index++) pool.push({ id: itemId(key, index), key, index });
  }
  return pool;
}

/* ---------- scheduling ---------- */

/** The card after an answer. A new question that is answered right starts in box 1. */
export function nextCard(prev: Card | undefined, correct: boolean, today: string): Card {
  const box = correct ? Math.min(MAX_BOX, (prev?.box ?? 0) + 1) : 1;
  return { box, due: addDays(today, INTERVALS[box - 1]), lastSeen: today };
}

/** Add a day to a sorted list of answered days, keeping it sorted, unique and bounded. */
export function withDay(days: string[], today: string): string[] {
  if (days.includes(today)) return days;
  return [...days, today].sort().slice(-MAX_DAYS);
}

export function recordAnswer(state: ReviewState, id: string, correct: boolean, today: string): ReviewState {
  return { ...state, items: { ...state.items, [id]: nextCard(state.items[id], correct, today) }, days: withDay(state.days, today) };
}

export const isDue = (card: Card | undefined, today: string) => !!card && card.due <= today;

export type Counts = {
  /** Answered before and due today or earlier. */
  due: number;
  /** Never answered. */
  fresh: number;
  /** Answered at least once. */
  seen: number;
  total: number;
  /** In the top box. */
  settled: number;
};

export function counts(pool: PoolItem[], state: ReviewState, today: string): Counts {
  let due = 0;
  let fresh = 0;
  let settled = 0;
  for (const p of pool) {
    const c = state.items[p.id];
    if (!c) fresh++;
    else {
      if (isDue(c, today)) due++;
      if (c.box === MAX_BOX) settled++;
    }
  }
  return { due, fresh, seen: pool.length - fresh, total: pool.length, settled };
}

/** How many pooled questions sit in each box (index 0 is box 1). */
export function boxCounts(pool: PoolItem[], state: ReviewState): number[] {
  const out = Array<number>(MAX_BOX).fill(0);
  for (const p of pool) {
    const c = state.items[p.id];
    if (c) out[c.box - 1]++;
  }
  return out;
}

/** The earliest day after today on which an answered question comes due, or null. */
export function nextDueDay(pool: PoolItem[], state: ReviewState, today: string): string | null {
  let best: string | null = null;
  for (const p of pool) {
    const c = state.items[p.id];
    if (c && c.due > today && (best === null || c.due < best)) best = c.due;
  }
  return best;
}

/**
 * Up to `size` questions: due ones first (longest overdue, then lowest box), then new ones. New
 * questions are taken one lesson at a time, newest lesson first, so a session mixes lessons
 * instead of asking all four questions of one lesson in a row.
 */
export function pickSession(pool: PoolItem[], state: ReviewState, today: string, size = SESSION_SIZE): string[] {
  const order = new Map(pool.map((p, i) => [p.id, i]));
  const due = pool
    .filter((p) => isDue(state.items[p.id], today))
    .sort((a, b) => {
      const ca = state.items[a.id];
      const cb = state.items[b.id];
      return ca.due.localeCompare(cb.due) || ca.box - cb.box || order.get(a.id)! - order.get(b.id)!;
    })
    .map((p) => p.id);
  const picked = due.slice(0, size);
  if (picked.length >= size) return picked;

  const byLesson = new Map<string, string[]>();
  for (const p of pool) {
    if (state.items[p.id]) continue;
    const list = byLesson.get(p.key);
    if (list) list.push(p.id);
    else byLesson.set(p.key, [p.id]);
  }
  const queues = [...byLesson.values()];
  for (let round = 0; picked.length < size; round++) {
    let any = false;
    for (const q of queues) {
      if (round < q.length) {
        any = true;
        picked.push(q[round]);
        if (picked.length >= size) break;
      }
    }
    if (!any) break;
  }
  return picked;
}

/** Questions that are not due yet, soonest first. For a learner who is caught up and wants more. */
export function pickAhead(pool: PoolItem[], state: ReviewState, today: string, size = SESSION_SIZE): string[] {
  return pool
    .filter((p) => state.items[p.id] && state.items[p.id].due > today)
    .sort((a, b) => state.items[a.id].due.localeCompare(state.items[b.id].due) || state.items[a.id].box - state.items[b.id].box)
    .slice(0, size)
    .map((p) => p.id);
}

/* ---------- option order ---------- */

function hash(s: string): number {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return h;
}

/** A shuffled order for `n` options, fixed for a given seed. order[k] is the original index shown at position k. */
export function optionOrder(n: number, seed: string): number[] {
  let a = hash(seed);
  const rnd = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/* ---------- streak ---------- */

export type Streak = {
  /** Days practised in the current run. A rest day inside the run is not counted, and does not end it. */
  count: number;
  doneToday: boolean;
  /** A rest day was used inside the run during the last seven days. */
  restUsed: boolean;
};

/**
 * Days with at least one answer, counted back from today. A day off does not break the run as
 * long as it is the only one in any rolling week. Today is still open: with no answer yet it
 * is neither counted nor held against the run.
 */
export function streak(days: string[], today: string): Streak {
  const set = new Set(days);
  const doneToday = set.has(today);
  if (set.size === 0) return { count: 0, doneToday, restUsed: false };
  const first = Math.min(...[...set].map(dayNumber));
  let n = dayNumber(today) - (doneToday ? 0 : 1);
  let count = 0;
  let lastMiss: number | null = null;
  let pending: number | null = null;
  let bridged: number | null = null;
  for (; n >= first; n--) {
    if (set.has(keyOfNumber(n))) {
      count++;
      if (pending !== null && bridged === null) bridged = pending;
      pending = null;
    } else {
      if (lastMiss !== null && lastMiss - n < 7) break;
      lastMiss = n;
      pending = n;
    }
  }
  return { count, doneToday, restUsed: bridged !== null && dayNumber(today) - bridged <= 6 };
}

export type DayDot = { day: string; active: boolean; isToday: boolean };

/** The last `n` days, oldest first, for a row of dots. */
export function lastDays(days: string[], today: string, n = 14): DayDot[] {
  const set = new Set(days);
  return Array.from({ length: n }, (_, i) => {
    const day = addDays(today, i - (n - 1));
    return { day, active: set.has(day), isToday: day === today };
  });
}

/* ---------- stored shape ---------- */

/** Read whatever is in storage as a state, dropping anything malformed. Never throws. */
export function sanitise(raw: unknown): ReviewState {
  const out: ReviewState = { items: {}, days: [] };
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Record<string, unknown>;
  if (r.items && typeof r.items === 'object') {
    for (const [id, c] of Object.entries(r.items as Record<string, unknown>)) {
      const card = c as Partial<Card> | null;
      if (card && Number.isInteger(card.box) && card.box! >= 1 && card.box! <= MAX_BOX && isDayKey(card.due) && isDayKey(card.lastSeen) && parseId(id)) {
        out.items[id] = { box: card.box!, due: card.due, lastSeen: card.lastSeen };
      }
    }
  }
  if (Array.isArray(r.days)) out.days = [...new Set(r.days.filter(isDayKey))].sort().slice(-MAX_DAYS);
  if (typeof r.hideStreak === 'boolean') out.hideStreak = r.hideStreak;
  return out;
}

/**
 * Merge progress from two browsers. For each question the card with the later `lastSeen` wins,
 * and when both were last seen on the same day the higher box wins. Answered days are joined.
 * A choice about hiding the streak is taken from `a` (this browser) unless it has none.
 */
export function mergeReview(a: unknown, b: unknown): ReviewState {
  const x = sanitise(a);
  const y = sanitise(b);
  const items: Record<string, Card> = { ...x.items };
  for (const [id, c] of Object.entries(y.items)) {
    const m = items[id];
    if (!m || c.lastSeen > m.lastSeen || (c.lastSeen === m.lastSeen && c.box > m.box)) items[id] = c;
  }
  const out: ReviewState = { items, days: [...new Set([...x.days, ...y.days])].sort().slice(-MAX_DAYS) };
  const hide = x.hideStreak ?? y.hideStreak;
  if (hide !== undefined) out.hideStreak = hide;
  return out;
}
