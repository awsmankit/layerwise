/**
 * The daily share card: one picture and caption per day, chosen by the date alone, so the same day always gives the
 * same card and a week can be planned ahead. Nothing here touches the network or the page; the picture is drawn in the
 * browser (see components/ui/ShareCard.tsx).
 *
 * Two rules shape every card. It never repeats an item soon (experiments, which feed two kinds of card, share one
 * sequence). And it shows the start of something, not all of it, so the reader has a reason to open the site.
 */

import { trackById } from '../data/tracks';

export type CardKind = 'guess' | 'term' | 'whatif' | 'remember' | 'interview';

export type GuessItem = { slug: string; track?: string; title: string; question: string; options: [string, string, string]; answer: 0 | 1 | 2; why: string };
/** `more` is up to two points from the lesson the term links to, so the card teaches more than the definition. */
export type TermItem = { id: string; track?: string; term: string; short: string; lesson: string; lessonTitle?: string; more?: string[] };
export type WhatIfItem = { slug: string; track?: string; title: string; blurb: string; takeaways: string[] };
export type RememberItem = { path: string; track?: string; lesson: string; takeaways: string[] };
/** `answer` is present when the question has a written answer: its short answer and up to three points from it. */
export type InterviewItem = { id: string; track?: string; prompt: string; role: string; level: string; strong: string[]; answer?: { short: string; points: string[] } };

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
  /** A line after the points saying what else is waiting on the site, e.g. "+1 more point and a quiz". May be empty. */
  more: string;
  /** Small line at the bottom, e.g. the lesson it comes from. */
  footer: string;
  /** Track id, for the picture's icon. */
  track: string;
  /** Track title, e.g. "Responsible AI". */
  topic: string;
  /** Site path the card points to, e.g. /whatif/kv-cache/. */
  path: string;
  /** Post text ready to paste. */
  caption: string;
  /** Sentence starters the poster can finish in their own words (shown beside the caption, not on the picture). */
  angle: string[];
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

/**
 * The weekly rhythm. Guess and What if cards both come from the experiments, so together they get two days a week:
 * with 87 experiments that is about ten months before any experiment comes round again.
 */
export const CYCLE: CardKind[] = ['guess', 'term', 'remember', 'interview', 'whatif', 'term', 'remember'];

/** Kinds that draw on the same material share one sequence, so an item never comes back as a different kind of card. */
export const SOURCE: Record<CardKind, 'experiment' | 'term' | 'remember' | 'interview'> = {
  guess: 'experiment',
  whatif: 'experiment',
  term: 'term',
  remember: 'remember',
  interview: 'interview',
};

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

/** Which kind a day shows, and which item of its source sequence it takes (0, 1, 2, ...). */
export function slotFor(dayIndex: number): { kind: CardKind; occurrence: number } {
  const week = Math.floor(dayIndex / CYCLE.length);
  const w = ((dayIndex % CYCLE.length) + CYCLE.length) % CYCLE.length;
  const kind = CYCLE[w];
  const same = (k: CardKind) => SOURCE[k] === SOURCE[kind];
  const perWeek = CYCLE.filter(same).length;
  const before = CYCLE.slice(0, w).filter(same).length;
  return { kind, occurrence: week * perWeek + before };
}

/** The first sentence of a text. */
export function firstSentence(text: string): string {
  const m = text.trim().match(/^.*?[.?!](?=\s|$)/);
  return m ? m[0] : text.trim();
}

/** The track a site path belongs to, e.g. /learn/llm/x/ gives "llm". */
const trackOfPath = (path: string) => path.match(/^\/learn\/([^/]+)\//)?.[1];
const plural = (n: number, one: string) => `${n} more ${one}${n === 1 ? '' : 's'}`;

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

/** The closing question of each caption, to invite replies. */
const ASK: Record<CardKind, string> = {
  guess: 'What would you pick? Tell me in the comments.',
  term: 'Had you met this one before? Tell me where.',
  whatif: 'What do you think happens? Guess before you try it.',
  remember: 'Which of these would you add?',
  interview: 'How would you answer this? Share your take below.',
};

/** Sentence starters for the poster's own words. `___` marks the blank to fill in. */
export const ANGLE: Record<CardKind, string[]> = {
  guess: ['I guessed ___ at first, because ___.', 'The part that surprised me was ___.', 'If you build with AI, this matters because ___.'],
  term: ['Where I first met this term: ___.', 'For a friend new to AI, in one sentence: ___.', 'A mix-up I see people make with this: ___.'],
  whatif: ['I expected ___, and what happened was ___.', 'The number that surprised me was ___.', 'Where this shows up in real products: ___.'],
  remember: ['The one point I will use this week: ___.', 'What I wish I had known before learning this: ___.', 'A question this raised for me: ___.'],
  interview: ['In my own words, I would answer: ___.', 'A follow-up an interviewer might ask: ___.', 'A mistake I made on this topic: ___.'],
};

const LETTERS = ['A', 'B', 'C'];

/** Days within which the same lesson or item is not shown again, whichever kind of card it is on. */
export const SPACING = 30;

/** The item each source shows, and the key that must not come back within SPACING days (usually a lesson path). */
const sourceCache = new WeakMap<Pools, ReturnType<typeof makeSources>>();
const sources = (pools: Pools) => {
  let s = sourceCache.get(pools);
  if (!s) sourceCache.set(pools, (s = makeSources(pools)));
  return s;
};
const makeSources = (pools: Pools) => ({
  experiment: { pool: shuffled(pools.whatif, (w) => w.slug), key: (w: WhatIfItem) => `/whatif/${w.slug}/` },
  term: { pool: shuffled(pools.term, (t) => t.id), key: (t: TermItem) => t.lesson },
  remember: { pool: shuffled(pools.remember, (r) => r.path), key: (r: RememberItem) => r.path },
  interview: { pool: shuffled(pools.interview, (q) => q.id), key: (q: InterviewItem) => `/interview/q/${q.id}/` },
});

type Plan = { days: number[]; keys: string[]; pending: Record<string, number[]> };
const plans = new WeakMap<Pools, Plan>();

/**
 * Which item of its source pool a day shows. Days are planned in order from 1 January 2026: each day takes the next
 * item of its source that is not yet used in this round and whose lesson was not shown in the last SPACING days. A
 * pool is used up completely before any item comes round again. The plan depends on the pools alone, so it is the
 * same in every browser. Days before the start fall back to a plain rotation.
 */
export function itemIndexFor(dayIndex: number, pools: Pools): number {
  const { kind, occurrence } = slotFor(dayIndex);
  const src = sources(pools)[SOURCE[kind]];
  const n = src.pool.length;
  if (!n) return -1;
  if (dayIndex < 0) return ((occurrence % n) + n) % n;
  let plan = plans.get(pools);
  if (!plan) {
    plan = { days: [], keys: [], pending: {} };
    plans.set(pools, plan);
  }
  const all = sources(pools);
  for (let d = plan.days.length; d <= dayIndex; d++) {
    const s = SOURCE[slotFor(d).kind];
    const { pool, key } = all[s] as { pool: unknown[]; key: (x: unknown) => string };
    if (!plan.pending[s]?.length) plan.pending[s] = pool.map((_, i) => i);
    const pending = plan.pending[s];
    const recent = new Set(plan.keys.slice(Math.max(0, d - SPACING), d));
    let at = pending.findIndex((i) => !recent.has(key(pool[i])));
    if (at < 0) at = 0;
    const [chosen] = pending.splice(at, 1);
    plan.days.push(chosen);
    plan.keys.push(key(pool[chosen]));
  }
  return plan.days[dayIndex];
}

/** Pick the card for a day. `siteUrl` is the full address of the site, with no trailing slash. Returns null if a pool is empty. */
export function cardForDay(dayIndex: number, pools: Pools, siteUrl: string): Card | null {
  let kind = slotFor(dayIndex).kind;
  const url = (path: string) => `${siteUrl}${path}`;
  const card = (c: Omit<Card, 'dayIndex' | 'kind' | 'label' | 'angle' | 'topic'>): Card => ({
    dayIndex,
    kind,
    label: KIND_LABEL[kind],
    angle: ANGLE[kind],
    ...c,
    topic: trackById(c.track)?.title ?? 'AI',
  });

  if (kind === 'guess' || kind === 'whatif') {
    // one sequence of experiments for both kinds, so an experiment is never shown twice in a row of cards
    const pool = sources(pools).experiment.pool;
    if (!pool.length) return null;
    const w = pool[itemIndexFor(dayIndex, pools)];
    const g = pools.guess.find((x) => x.slug === w.slug);
    if (kind === 'guess' && !g) kind = 'whatif';
    const path = `/whatif/${w.slug}/`;
    const track = w.track ?? g?.track ?? 'foundations';
    if (kind === 'guess' && g) {
      const options = g.options.map((o, i) => `${LETTERS[i]}) ${clip(o, 90)}`);
      return card({
        title: clip(g.question, 190),
        body: '',
        bullets: [],
        bulletsHeading: '',
        options,
        more: '',
        footer: 'Answer in the first comment. Try it on Layerwise.',
        track,
        path,
        caption: `Guess first 👇\n\n${g.question}\n\n${options.join('\n')}\n\nAnswer in the first comment. Then flip the switch and see it for yourself, with the numbers worked out: ${url(path)}\n\n${ASK.guess}\n\n${TAGS.guess}`,
        firstComment: `Answer: ${LETTERS[g.answer]}) ${g.options[g.answer]}\n\n${firstSentence(g.why)}\n\nThe numbers worked out, and a switch to try it yourself: ${url(path)}`,
        alt: `A card titled Guess first, about ${trackById(track)?.title ?? 'AI'}. The question: ${g.question} Options: ${g.options.map((o, i) => `${LETTERS[i]}, ${o}`).join('. ')}.`,
      });
    }
    // a What if card shows the question and one thing you will see; the rest is in the experiment
    const shown = w.takeaways.slice(0, 1).map((x) => clip(x, 150));
    const hidden = Math.max(0, w.takeaways.length - shown.length);
    return card({
      title: w.title,
      body: clip(w.blurb, 200),
      bullets: shown,
      bulletsHeading: 'One thing you will see',
      options: [],
      more: hidden ? `+ ${plural(hidden, 'thing')} to see when you try it` : '',
      footer: 'Interactive: guess first, then flip the switch',
      track,
      path,
      caption: `${w.title}\n\n${w.blurb}\n\nOne thing you will see:\n• ${shown[0] ?? ''}\n\n${hidden ? `There are ${plural(hidden, 'thing')} to see. ` : ''}Guess first, then flip the switch yourself: ${url(path)}\n\n${ASK.whatif}\n\n${TAGS.whatif}`,
      firstComment: '',
      alt: `A card titled What if, about ${trackById(track)?.title ?? 'AI'}. ${w.title} ${w.blurb} One thing you will see: ${shown.join(' ')}`,
    });
  }
  if (kind === 'term') {
    const pool = sources(pools).term.pool;
    if (!pool.length) return null;
    const t = pool[itemIndexFor(dayIndex, pools)];
    const more = (t.more ?? []).slice(0, 1).map((x) => clip(x, 140));
    const track = t.track ?? trackOfPath(t.lesson) ?? 'start';
    return card({
      title: t.term,
      body: clip(t.short, 230),
      bullets: more,
      bulletsHeading: more.length ? 'Worth knowing' : '',
      options: [],
      more: 'The whole lesson, with a quiz, on Layerwise',
      footer: t.lessonTitle ? `Learn more: ${clip(t.lessonTitle, 60)}` : 'AI terms in plain words',
      track,
      path: t.lesson,
      caption: `AI term of the day: ${t.term}\n\n${t.short}${more.length ? `\n\nWorth knowing:\n${more.map((b) => `• ${b}`).join('\n')}` : ''}\n\nThe rest of the lesson, with a quiz: ${url(t.lesson)}\n\n${ASK.term}\n\n${TAGS.term}`,
      firstComment: '',
      alt: `A card titled Term of the day, about ${trackById(track)?.title ?? 'AI'}. ${t.term}: ${t.short}${more.length ? ` Worth knowing: ${more.join(' ')}` : ''}`,
    });
  }
  if (kind === 'remember') {
    const pool = sources(pools).remember.pool;
    if (!pool.length) return null;
    const r = pool[itemIndexFor(dayIndex, pools)];
    // two of the points on the card; the last one waits in the lesson
    const shown = r.takeaways.slice(0, 2).map((x) => clip(x, 150));
    const hidden = Math.max(0, r.takeaways.length - shown.length);
    const track = r.track ?? trackOfPath(r.path) ?? 'start';
    return card({
      title: clip(r.lesson, 90),
      body: '',
      bullets: shown,
      bulletsHeading: 'The short version',
      options: [],
      more: hidden ? `+ ${plural(hidden, 'point')} and a quiz in the lesson` : '+ a quiz in the lesson',
      footer: 'From a Layerwise lesson',
      track,
      path: r.path,
      caption: `${r.lesson}: the short version\n\n${shown.map((b) => `• ${b}`).join('\n')}\n\n${hidden ? `The ${hidden === 1 ? 'last point is' : `other ${hidden} points are`} the one most people miss. ` : ''}Read it, and take the quiz: ${url(r.path)}\n\n${ASK.remember}\n\n${TAGS.remember}`,
      firstComment: '',
      alt: `A card titled Remember this, about ${trackById(track)?.title ?? 'AI'}. ${r.lesson}. ${shown.join(' ')}`,
    });
  }
  const pool = sources(pools).interview.pool;
  if (!pool.length) return null;
  const q = pool[itemIndexFor(dayIndex, pools)];
  const path = `/interview/q/${q.id}/`;
  // a question with a written answer shows where that answer starts; the others show the first point a strong answer covers
  const written = q.answer && q.answer.points.length >= 1 ? q.answer : null;
  const shown = (written ? written.points : q.strong).slice(0, 1).map((x) => clip(x, 135));
  const heading = 'Where a strong answer starts';
  const track = q.track ?? 'llm';
  return card({
    title: clip(q.prompt, 220),
    body: '',
    bullets: shown,
    bulletsHeading: heading,
    options: [],
    more: written ? '+ the full answer, a diagram and a worked example' : '+ the other points, follow-ups and red flags',
    footer: `${q.role}, ${q.level}`,
    track,
    path,
    caption: `Interview question (${q.role}, ${q.level}):\n\n${q.prompt}\n\n${heading}:\n${shown.map((b) => `• ${b}`).join('\n')}\n\n${written ? 'The rest of the answer, with a diagram and a worked example' : 'The other points, the follow-ups and the red flags'}: ${url(path)}\n\n${ASK.interview}\n\n${TAGS.interview}`,
    firstComment: '',
    alt: `A card titled Interview question for a ${q.role}, about ${trackById(track)?.title ?? 'AI'}. ${q.prompt} ${heading}: ${shown.join(' ')}`,
  });
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
