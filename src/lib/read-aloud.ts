/**
 * Read aloud: pure text extraction and chunking. No DOM and no speech here, so
 * it can be tested in plain node. src/lib/read-aloud-dom.ts turns real page
 * elements into the `ReadNode` shape, and src/lib/read-aloud-player.ts plays
 * the chunks.
 *
 * What is read: headings (announced as sentences), paragraphs, list items,
 * quotes, callouts, and a table's caption. What is skipped: code blocks,
 * diagrams and interactive figures, quizzes, tables, buttons, hidden content,
 * and "Deep" blocks while the page is in essentials mode.
 */

/** A minimal, DOM-free view of a page node. `ref` carries whatever the caller wants back (the element). */
export type ReadNode<T = unknown> = {
  /** Lower-case tag name, or "#text" for a text node. */
  tag: string;
  classes?: readonly string[];
  /** Text of a "#text" node. */
  text?: string;
  /** Hidden from view or from assistive technology (hidden attribute, aria-hidden, display none). */
  hidden?: boolean;
  children?: readonly ReadNode<T>[];
  ref?: T;
};

export type BlockKind = 'heading' | 'text' | 'caption';
export type Block<T = unknown> = { kind: BlockKind; text: string; ref?: T };

export type ReadOptions = {
  /** The page is in essentials mode: "Deep" blocks are hidden and must not be read. */
  essentials: boolean;
};

const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
/** Elements read as one block each. */
const TEXT_BLOCKS = new Set(['p', 'li', 'dt', 'dd', 'figcaption', 'summary']);
/** Never read, never descended into. */
const SKIP_TAGS = new Set([
  'pre', 'code-block', 'svg', 'math', 'canvas', 'script', 'style', 'noscript', 'template', 'button', 'input', 'select',
  'textarea', 'iframe', 'video', 'audio', 'img', 'picture', 'form', 'nav', 'astro-island', 'astro-slot', 'figure',
]);
/** Class names that mark non-prose parts of the lesson. */
const SKIP_CLASSES = new Set(['viz', 'qz', 'lesson-quiz', 'sr-only', 'deep-tag', 'term-tip', 'viz-cap', 'rl-buttons', 'lab', 'runit']);
const CONTAINERS = new Set(['div', 'section', 'article', 'aside', 'blockquote', 'ul', 'ol', 'dl', 'details', 'main', 'span', 'a']);
const INLINE_BLOCK_TAGS = new Set(['strong', 'b']);

export type Verdict = 'heading' | 'text' | 'caption' | 'container' | 'skip';

/** Decide what to do with one element. */
export function classify(node: Pick<ReadNode, 'tag' | 'classes' | 'hidden'>, opts: ReadOptions): Verdict {
  const tag = node.tag.toLowerCase();
  const classes = node.classes ?? [];
  if (node.hidden) return 'skip';
  if (SKIP_TAGS.has(tag)) return 'skip';
  if (classes.some((c) => SKIP_CLASSES.has(c))) return 'skip';
  if (opts.essentials && classes.includes('deep')) return 'skip';
  if (HEADINGS.has(tag)) return 'heading';
  if (tag === 'caption') return 'caption';
  if (tag === 'table') return 'container'; // only its caption is read, see walk()
  if (TEXT_BLOCKS.has(tag)) return 'text';
  if (CONTAINERS.has(tag)) return 'container';
  return 'skip';
}

const ABBREVIATIONS = new Set(['e.g', 'i.e', 'vs', 'mr', 'mrs', 'ms', 'dr', 'fig', 'figs', 'approx', 'cf', 'al', 'etc']);

const SYMBOLS: [RegExp, string][] = [
  [/→|->/g, ' to '],
  [/←|<-/g, ' from '],
  [/≈/g, ' about '],
  [/≤/g, ' at most '],
  [/≥/g, ' at least '],
  [/×/g, ' times '],
  [/·/g, ' '],
  [/…/g, '...'],
  [/&/g, ' and '],
  [/[​-‍﻿­]/g, ''],
];

/** Tidy text for speech: collapse whitespace and say symbols the way a person would. */
export function cleanText(s: string): string {
  let t = s;
  for (const [re, to] of SYMBOLS) t = t.replace(re, to);
  return t.replace(/\s+/g, ' ').trim();
}

/** A heading is announced as its own sentence, so the voice pauses after it. */
export function announceHeading(text: string): string {
  const t = cleanText(text);
  if (!t) return '';
  return /[.!?:]$/.test(t) ? t : t + '.';
}

function isBoundary(text: string, i: number): boolean {
  // text[i] is . ! or ?; extend over closing quotes and brackets
  let j = i;
  while (j + 1 < text.length && /["'”’)\]]/.test(text[j + 1])) j++;
  if (j + 1 >= text.length) return true;
  if (!/\s/.test(text[j + 1])) return false; // 3.5, example.com
  let k = j + 1;
  while (k < text.length && /\s/.test(text[k])) k++;
  if (k >= text.length) return true;
  const next = text[k];
  if (text[i] === '.') {
    const before = text.slice(0, i).match(/([A-Za-z.]+)$/);
    const word = before ? before[1].toLowerCase() : '';
    if (before && /^[A-Z]$/.test(before[1])) return false; // an initial, as in "A. Turing"
    if (ABBREVIATIONS.has(word)) return word === 'etc' ? !/[a-z]/.test(next) : false;
    if (/[a-z]/.test(next)) return false; // a sentence does not start in lower case
  }
  return true;
}

/** Split into sentences. Keeps the full stop with its sentence. */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if ((c === '.' || c === '!' || c === '?') && (text[i + 1] !== c) && isBoundary(text, i)) {
      let end = i + 1;
      while (end < text.length && /["'”’)\]]/.test(text[end])) end++;
      const piece = text.slice(start, end).trim();
      if (piece) out.push(piece);
      start = end;
    }
  }
  const rest = text.slice(start).trim();
  if (rest) out.push(rest);
  return out;
}

/** Break one over-long sentence at commas, semicolons, colons, dashes or, failing that, spaces. */
export function splitLong(sentence: string, max: number): string[] {
  const out: string[] = [];
  let rest = sentence.trim();
  while (rest.length > max) {
    const window = rest.slice(0, max + 1);
    let cut = -1;
    for (const re of [/[;:]\s/g, /,\s/g, /\s[—–-]\s/g, /\s/g]) {
      let m: RegExpExecArray | null;
      let last = -1;
      re.lastIndex = 0;
      while ((m = re.exec(window))) last = m.index + m[0].length;
      if (last > max * 0.4) {
        cut = last;
        break;
      }
    }
    if (cut <= 0) cut = max; // one enormous word: hard cut
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out.filter(Boolean);
}

/** Chunks short enough that Chrome will not cut an utterance off (it stops after roughly 15 seconds). */
export function chunkText(text: string, max = 200): string[] {
  const out: string[] = [];
  for (const s of splitSentences(cleanText(text))) {
    if (s.length <= max) out.push(s);
    else out.push(...splitLong(s, max));
  }
  return out;
}

/* ---------- extraction ---------- */

const INLINE = new Set(['a', 'span', 'strong', 'b', 'em', 'i', 'code', 'sub', 'sup', 'abbr', 'mark', 'kbd', 'small', 'u', 's', 'cite', 'q', 'time', 'dfn', 'var', 'wbr', 'bdi']);

function hasSkipClass(node: Pick<ReadNode, 'classes'>): boolean {
  return (node.classes ?? []).some((c) => SKIP_CLASSES.has(c));
}

/** The words of one block: inline markup is read through, skipped parts are dropped. */
function inlineText<T>(node: ReadNode<T>, opts: ReadOptions): string {
  if (node.tag === '#text') return node.text ?? '';
  if (node.tag === 'br') return ' ';
  if (node.hidden || hasSkipClass(node)) return '';
  // a glossary term is a <button class="term"> inside the sentence: read it as the word it is
  const isTerm = node.tag === 'button' && (node.classes ?? []).includes('term');
  if (!isTerm && !INLINE.has(node.tag) && classify(node, opts) === 'skip') return '';
  let s = '';
  for (const c of node.children ?? []) {
    // nested lists are their own blocks, not part of the parent item
    if (node.tag === 'li' && (c.tag === 'ul' || c.tag === 'ol')) continue;
    s += inlineText(c, opts);
  }
  return s;
}

/**
 * Walk a lesson's prose and return the blocks to read, in order. Each block
 * keeps the `ref` of the node it came from so the caller can highlight it.
 */
export function extractBlocks<T>(root: ReadNode<T>, opts: ReadOptions): Block<T>[] {
  const out: Block<T>[] = [];

  const push = (kind: BlockKind, raw: string, ref: T | undefined) => {
    const text = kind === 'heading' ? announceHeading(raw) : cleanText(raw);
    // nothing speakable (only punctuation or symbols) is dropped
    if (/[A-Za-z0-9À-ɏ]/.test(text)) out.push({ kind, text, ref });
  };

  const walk = (node: ReadNode<T>) => {
    if (node.tag === '#text') return;
    const v = classify(node, opts);
    if (v === 'skip') return;
    if (v === 'heading') return push('heading', inlineText(node, opts), node.ref);
    if (v === 'caption') return push('caption', inlineText(node, opts), node.ref);
    if (v === 'text') {
      push('text', inlineText(node, opts), node.ref);
      // a list item may hold a nested list
      for (const c of node.children ?? []) if (c.tag === 'ul' || c.tag === 'ol') walk(c);
      return;
    }
    // container
    const kids = node.children ?? [];
    if (node.tag === 'table') {
      for (const c of kids) if (c.tag === 'caption') walk(c);
      return;
    }
    const hasBlockChild = kids.some((c) => c.tag !== '#text' && (HEADINGS.has(c.tag) || TEXT_BLOCKS.has(c.tag) || (CONTAINERS.has(c.tag) && c.tag !== 'span' && c.tag !== 'a') || c.tag === 'table'));
    if (!hasBlockChild && node.tag !== 'ul' && node.tag !== 'ol' && node.tag !== 'dl') {
      // a plain container of text, such as <div>Some words</div>
      if (node !== root) return push('text', inlineText(node, opts), node.ref);
    }
    for (const c of kids) {
      if (c.tag === '#text') continue;
      // a callout's bold title is its own block
      if (INLINE_BLOCK_TAGS.has(c.tag) && (node.classes ?? []).includes('callout')) {
        push('text', inlineText(c, opts), c.ref);
        continue;
      }
      walk(c);
    }
  };

  walk(root);
  return out;
}

/* ---------- plan: blocks cut into speakable chunks ---------- */

export type Chunk = { block: number; text: string };
export type Plan = {
  chunks: Chunk[];
  /** Index into `chunks` where each block starts; -1 for a block with nothing speakable. */
  starts: number[];
  blocks: number;
};

export function buildPlan(blocks: readonly Pick<Block, 'text'>[], max = 200): Plan {
  const chunks: Chunk[] = [];
  const starts: number[] = [];
  blocks.forEach((b, i) => {
    const parts = chunkText(b.text, max);
    starts.push(parts.length ? chunks.length : -1);
    for (const text of parts) chunks.push({ block: i, text });
  });
  return { chunks, starts, blocks: blocks.length };
}

/** First chunk of the nearest block at or after `block` that has something to say; -1 at the end. */
export function chunkAtBlock(plan: Plan, block: number): number {
  for (let i = Math.max(0, block); i < plan.starts.length; i++) if (plan.starts[i] >= 0) return plan.starts[i];
  return -1;
}

/** Start of the previous block that has something to say; stays on the first block if there is none. */
export function chunkBeforeBlock(plan: Plan, block: number): number {
  for (let i = block - 1; i >= 0; i--) if (plan.starts[i] >= 0) return plan.starts[i];
  return chunkAtBlock(plan, 0);
}

/* ---------- voices ---------- */

export type VoiceLike = { name: string; lang: string; voiceURI: string; localService?: boolean; default?: boolean };

/**
 * The voices to offer: English ones if the device has any (the lessons are in
 * English), otherwise all of them. On-device voices come first, then by name.
 * Duplicates (the same URI) are dropped.
 */
export function pickVoices<V extends VoiceLike>(voices: readonly V[]): V[] {
  const seen = new Set<string>();
  const unique = voices.filter((v) => (seen.has(v.voiceURI) ? false : (seen.add(v.voiceURI), true)));
  const english = unique.filter((v) => /^en([-_]|$)/i.test(v.lang));
  const pool = english.length ? english : unique;
  return [...pool].sort((a, b) => Number(!!b.localService) - Number(!!a.localService) || a.name.localeCompare(b.name));
}

/** The voice to use: the saved one if it still exists, else British English (the site's spelling), else the device's default. */
export function chooseVoice<V extends VoiceLike>(offered: readonly V[], savedURI: string): V | undefined {
  if (savedURI) {
    const found = offered.find((v) => v.voiceURI === savedURI);
    if (found) return found;
  }
  return offered.find((v) => /^en[-_]GB$/i.test(v.lang)) ?? offered.find((v) => v.default) ?? offered[0];
}

export function voiceLabel(v: VoiceLike): string {
  return `${v.name} (${v.lang.replace('_', '-')})`;
}
