/**
 * The daily share card: one picture and caption per day, chosen by the date alone, so the same day always gives the
 * same card and a week can be planned ahead. Nothing here touches the network or the page; the picture is drawn in the
 * browser (see components/ui/DailyCard.tsx).
 */

export type CardKind = 'guess' | 'term' | 'whatif' | 'remember' | 'interview';

export type GuessItem = { slug: string; title: string; question: string; options: [string, string, string]; answer: 0 | 1 | 2; why: string };
export type TermItem = { id: string; term: string; short: string; lesson: string; lessonTitle?: string };
export type WhatIfItem = { slug: string; title: string; blurb: string; takeaways: string[] };
export type RememberItem = { path: string; lesson: string; takeaways: string[] };
/** `answer` is present when the question has a written answer: its short answer and up to three points from it. */
export type InterviewItem = { id: string; prompt: string; role: string; level: string; strong: string[]; answer?: { short: string; points: string[] } };

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
  /** Short points that teach something (may be empty). */
  bullets: string[];
  /** A small heading above the bullets, e.g. "A strong answer covers" (may be empty). */
  bulletsHeading: string;
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

/**
 * Up to three short points for a card from a written answer: sentences of the short answer first, then of
 * the explanation, keeping only those that fit on the picture whole (no clipped sentences).
 */
export function answerPoints(a: { short: string; explain: { body: string }[] }, max = 135): string[] {
  const sentences = (s: string) => s.split(/(?<=[.?!])\s+/).map((x) => x.trim());
  const pool = [...sentences(a.short), ...a.explain.flatMap((e) => sentences(e.body))];
  return pool.filter((x) => x.length >= 30 && x.length <= max).slice(0, 3);
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
      bullets: [],
      bulletsHeading: '',
      options,
      footer: 'Answer in the first comment. Try it on Layerwise.',
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
      bullets: [],
      bulletsHeading: '',
      options: [],
      footer: t.lessonTitle ? `Learn more: ${clip(t.lessonTitle, 60)}` : 'AI terms in plain words',
      path: t.lesson,
      caption: `AI term of the day: ${t.term}\n\n${t.short}\n\nLearn more, with a lesson and a quiz: ${url(t.lesson)}\n\n${TAGS.term}`,
      firstComment: '',
      alt: `A card titled Term of the day. ${t.term}: ${t.short}`,
    };
  }
  if (kind === 'whatif') {
    const pool = shuffled(pools.whatif, (w) => w.slug);
    if (!pool.length) return null;
    const w = at(pool, occurrence);
    const path = `/whatif/${w.slug}/`;
    const bullets = w.takeaways.slice(0, 3).map((x) => clip(x, 140));
    return {
      ...base,
      title: w.title,
      body: '',
      bullets,
      bulletsHeading: 'What you will see',
      options: [],
      footer: 'Interactive: guess first, then flip the switch',
      path,
      caption: `${w.title}\n\n${w.blurb}\n\n${bullets.map((b) => `• ${b}`).join('\n')}\n\nTry it, it asks you to guess first: ${url(path)}\n\n${TAGS.whatif}`,
      firstComment: '',
      alt: `A card titled What if. ${w.title} ${w.takeaways.slice(0, 3).join(' ')}`,
    };
  }
  if (kind === 'remember') {
    const pool = shuffled(pools.remember, (r) => r.path);
    if (!pool.length) return null;
    const r = at(pool, occurrence);
    const bullets = r.takeaways.slice(0, 3).map((x) => clip(x, 150));
    return {
      ...base,
      title: clip(r.lesson, 90),
      body: '',
      bullets,
      bulletsHeading: 'The short version',
      options: [],
      footer: 'From a Layerwise lesson, with a quiz',
      path: r.path,
      caption: `${r.lesson}: the short version\n\n${bullets.map((b) => `• ${b}`).join('\n')}\n\nThe whole lesson, with a quiz: ${url(r.path)}\n\n${TAGS.remember}`,
      firstComment: '',
      alt: `A card titled Remember this. ${r.lesson}. ${r.takeaways.slice(0, 3).join(' ')}`,
    };
  }
  const pool = shuffled(pools.interview, (q) => q.id);
  if (!pool.length) return null;
  const q = at(pool, occurrence);
  const path = `/interview/q/${q.id}/`;
  // a question with a written answer shows that answer; the others keep the points a strong answer covers
  const written = q.answer && q.answer.points.length >= 3 ? q.answer : null;
  const bullets = (written ? written.points : q.strong).slice(0, 3).map((x) => clip(x, 135));
  const heading = written ? 'The short answer' : 'A strong answer covers';
  return {
    ...base,
    title: clip(q.prompt, 220),
    body: '',
    bullets,
    bulletsHeading: heading,
    options: [],
    footer: `${q.role}, ${q.level}`,
    path,
    caption: `Interview question (${q.role}, ${q.level}):\n\n${q.prompt}\n\n${heading}:\n${bullets.map((b) => `• ${b}`).join('\n')}\n\n${written ? 'The full answer, with a diagram and a worked example' : 'The full list of points, the follow-ups and the red flags'}: ${url(path)}\n\n${TAGS.interview}`,
    firstComment: '',
    alt: `A card titled Interview question for a ${q.role}. ${q.prompt} ${heading}: ${bullets.join(' ')}`,
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

/**
 * Fit a list of short points under a heading: one font size for all of them, bullets indented, shrinking until
 * every point fits the height. Returns the wrapped lines of each point.
 */
export function fitBullets(
  items: string[],
  maxWidth: number,
  maxHeight: number,
  sizes: { max: number; min: number; step?: number; lineHeight?: number; gap?: number; indent?: number },
  measure: (line: string, size: number) => number,
): { blocks: string[][]; size: number; lineHeight: number; gap: number; indent: number; fits: boolean } {
  const step = sizes.step ?? 2;
  const lhK = sizes.lineHeight ?? 1.3;
  const indent = sizes.indent ?? 40;
  const wrapAt = (text: string, size: number) => {
    const lines: string[] = [];
    let cur = '';
    for (const w of text.split(/\s+/).filter(Boolean)) {
      const next = cur ? `${cur} ${w}` : w;
      if (cur && measure(next, size) > maxWidth - indent) {
        lines.push(cur);
        cur = w;
      } else cur = next;
    }
    if (cur) lines.push(cur);
    return lines;
  };
  const build = (size: number) => {
    const gap = sizes.gap ?? Math.round(size * 0.55);
    const blocks = items.map((t) => wrapAt(t, size));
    const total = blocks.reduce((h, b) => h + b.length * size * lhK, 0) + gap * Math.max(0, blocks.length - 1);
    return { blocks, gap, total };
  };
  for (let size = sizes.max; size >= sizes.min; size -= step) {
    const b = build(size);
    if (b.total <= maxHeight) return { blocks: b.blocks, size, lineHeight: size * lhK, gap: b.gap, indent, fits: true };
  }
  const b = build(sizes.min);
  return { blocks: b.blocks, size: sizes.min, lineHeight: sizes.min * lhK, gap: b.gap, indent, fits: false };
}
