/**
 * The daily share card: one picture and caption per day, chosen by the date alone, so the same day always gives the
 * same card and a week can be planned ahead. Nothing here touches the network or the page; the picture is drawn in the
 * browser (see components/ui/DailyCard.tsx).
 */

export type CardKind = 'guess' | 'term' | 'whatif' | 'remember' | 'interview';

export type GuessItem = { slug: string; title: string; question: string; options: [string, string, string]; answer: 0 | 1 | 2; why: string };
export type TermItem = { id: string; term: string; short: string; lesson: string };
export type WhatIfItem = { slug: string; title: string; blurb: string; takeaway: string };
export type RememberItem = { path: string; lesson: string; takeaway: string };
export type InterviewItem = { id: string; prompt: string; role: string; level: string };

export type Pools = {
  guess: GuessItem[];
  term: TermItem[];
  whatif: WhatIfItem[];
  remember: RememberItem[];
  interview: InterviewItem[];
};

export type Card = {
  /** Days since 2026-01-01 (local calendar days). */
  dayIndex: number;
  kind: CardKind;
  /** Small label on the picture, e.g. "Guess first". */
  label: string;
  /** The main text on the picture. */
  title: string;
  /** Supporting text under the title (may be empty). */
  body: string;
  /** Answer choices for a guess card, already lettered "A) ...". */
  options: string[];
  /** Small line at the bottom, e.g. the lesson it comes from. */
  footer: string;
  /** Site path the card points to, e.g. /whatif/kv-cache/. */
  path: string;
  /** Post text ready to paste. */
  caption: string;
  /** Text for a first comment (guess cards: the answer). Empty for other kinds. */
  firstComment: string;
  /** Description of the picture for the alt-text field. */
  alt: string;
};

export const KIND_LABEL: Record<CardKind, string> = {
  guess: 'Guess first',
  term: 'Term of the day',
  whatif: 'What if…?',
  remember: 'Remember this',
  interview: 'Interview question',
};

/** The weekly rhythm: two guess cards and two terms because they are the most shareable. */
export const CYCLE: CardKind[] = ['guess', 'term', 'whatif', 'remember', 'interview', 'guess', 'term'];

const EPOCH = Date.UTC(2026, 0, 1);

/** Day index for a calendar date given as year, month (1 to 12) and day. */
export function dayIndexOf(y: number, m: number, d: number): number {
  return Math.round((Date.UTC(y, m - 1, d) - EPOCH) / 86400000);
}

/** ISO date (YYYY-MM-DD) for a day index. */
export function isoOf(dayIndex: number): string {
  return new Date(EPOCH + dayIndex * 86400000).toISOString().slice(0, 10);
}

export function dayIndexFromIso(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return dayIndexOf(y, m, d);
}

/** A small stable hash, so a pool is shuffled the same way every time. */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Order a pool by a hash of each id, so neighbouring items are not related and the order never changes. */
export function shuffled<T>(items: T[], idOf: (t: T) => string): T[] {
  return [...items].sort((a, b) => hash(idOf(a)) - hash(idOf(b)) || idOf(a).localeCompare(idOf(b)));
}

/** Which kind a day shows, and which occurrence of that kind it is (0, 1, 2, ...). */
export function slotFor(dayIndex: number): { kind: CardKind; occurrence: number } {
  const week = Math.floor(dayIndex / CYCLE.length);
  const w = ((dayIndex % CYCLE.length) + CYCLE.length) % CYCLE.length;
  const kind = CYCLE[w];
  const perWeek = CYCLE.filter((k) => k === kind).length;
  const before = CYCLE.slice(0, w).filter((k) => k === kind).length;
  return { kind, occurrence: week * perWeek + before };
}

/** Cut text at a word boundary with an ellipsis so it fits the picture. */
export function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const at = cut.lastIndexOf(' ');
  return (at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[ ,;:.\-]+$/, '') + '…';
}

const TAGS: Record<CardKind, string> = {
  guess: '#AI #LearnAI #MachineLearning',
  term: '#AI #LearnAI #AIGlossary',
  whatif: '#AI #LearnAI #MachineLearning',
  remember: '#AI #LearnAI #MachineLearning',
  interview: '#AI #AIInterview #MachineLearning',
};

const LETTERS = ['A', 'B', 'C'];

/** Item number n of a pool, wrapping round and also working for days before the start date. */
const at = <T,>(pool: T[], n: number): T => pool[((n % pool.length) + pool.length) % pool.length];

/** Pick the card for a day. `siteUrl` is the full address of the site, with no trailing slash. Returns null if a pool is empty. */
export function cardForDay(dayIndex: number, pools: Pools, siteUrl: string): Card | null {
  const { kind, occurrence } = slotFor(dayIndex);
  const url = (path: string) => `${siteUrl}${path}`;
  const iso = isoOf(dayIndex);
  const base = { dayIndex, kind, label: KIND_LABEL[kind] };

  if (kind === 'guess') {
    const pool = shuffled(pools.guess, (g) => g.slug);
    if (!pool.length) return null;
    const g = at(pool, occurrence);
    const path = `/whatif/${g.slug}/`;
    const options = g.options.map((o, i) => `${LETTERS[i]}) ${clip(o, 90)}`);
    return {
      ...base,
      title: clip(g.question, 190),
      body: '',
      options,
      footer: 'Try it yourself on Layerwise',
      path,
      caption: `Guess first 👇\n\n${g.question}\n\n${options.join('\n')}\n\nAnswer in the first comment. Then flip the switch and see it for yourself, with the numbers worked out: ${url(path)}\n\n${TAGS.guess}`,
      firstComment: `Answer: ${LETTERS[g.answer]}) ${g.options[g.answer]}\n\n${g.why}\n\nTry it: ${url(path)}`,
      alt: `A card titled Guess first. The question: ${g.question} Options: ${g.options.map((o, i) => `${LETTERS[i]}, ${o}`).join('. ')}.`,
    };
  }
  if (kind === 'term') {
    const pool = shuffled(pools.term, (t) => t.id);
    if (!pool.length) return null;
    const t = at(pool, occurrence);
    return {
      ...base,
      title: t.term,
      body: clip(t.short, 230),
      options: [],
      footer: 'AI terms in plain words',
      path: t.lesson,
      caption: `AI term of the day: ${t.term}\n\n${t.short}\n\nMore, with a lesson and a quiz: ${url(t.lesson)}\n\n${TAGS.term}`,
      firstComment: '',
      alt: `A card titled Term of the day. ${t.term}: ${t.short}`,
    };
  }
  if (kind === 'whatif') {
    const pool = shuffled(pools.whatif, (w) => w.slug);
    if (!pool.length) return null;
    const w = at(pool, occurrence);
    const path = `/whatif/${w.slug}/`;
    return {
      ...base,
      title: w.title,
      body: clip(w.takeaway, 200),
      options: [],
      footer: 'An interactive experiment',
      path,
      caption: `${w.title}\n\n${w.blurb}\n\nThe short version: ${w.takeaway}\n\nTry it, it asks you to guess first: ${url(path)}\n\n${TAGS.whatif}`,
      firstComment: '',
      alt: `A card titled What if. ${w.title} ${w.takeaway}`,
    };
  }
  if (kind === 'remember') {
    const pool = shuffled(pools.remember, (r) => r.path);
    if (!pool.length) return null;
    const r = at(pool, occurrence);
    return {
      ...base,
      title: clip(r.takeaway, 230),
      body: '',
      options: [],
      footer: `From the lesson: ${clip(r.lesson, 60)}`,
      path: r.path,
      caption: `One thing to remember from "${r.lesson}":\n\n${r.takeaway}\n\nThe whole lesson, with a quiz: ${url(r.path)}\n\n${TAGS.remember}`,
      firstComment: '',
      alt: `A card titled Remember this. ${r.takeaway} From the lesson ${r.lesson}.`,
    };
  }
  const pool = shuffled(pools.interview, (q) => q.id);
  if (!pool.length) return null;
  const q = at(pool, occurrence);
  const path = `/interview/q/${q.id}/`;
  return {
    ...base,
    title: clip(q.prompt, 270),
    body: '',
    options: [],
    footer: `${q.role}, ${q.level}`,
    path,
    caption: `Interview question (${q.role}, ${q.level}):\n\n${q.prompt}\n\nWhat a strong answer covers, the follow-ups and the red flags: ${url(path)}\n\n${TAGS.interview}`,
    firstComment: '',
    alt: `A card titled Interview question for a ${q.role}. ${q.prompt}`,
  };
}

/** Shrink the font until the text fits the box. `measure` returns the width in pixels of a line at a font size. */
export function fitText(
  text: string,
  maxWidth: number,
  maxHeight: number,
  sizes: { max: number; min: number; step?: number; lineHeight?: number },
  measure: (line: string, size: number) => number,
): { lines: string[]; size: number; lineHeight: number; fits: boolean } {
  const step = sizes.step ?? 2;
  const lh = sizes.lineHeight ?? 1.2;
  const wrap = (size: number) => {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (cur && measure(next, size) > maxWidth) {
        lines.push(cur);
        cur = w;
      } else cur = next;
    }
    if (cur) lines.push(cur);
    return lines;
  };
  for (let size = sizes.max; size >= sizes.min; size -= step) {
    const lines = wrap(size);
    if (lines.length * size * lh <= maxHeight) return { lines, size, lineHeight: size * lh, fits: true };
  }
  return { lines: wrap(sizes.min), size: sizes.min, lineHeight: sizes.min * lh, fits: false };
}
