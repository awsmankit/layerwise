import type { Label, Row } from './spam-data';

/**
 * The same counting classifier the lesson builds in Python, written in TypeScript so the
 * interactive can show each word's vote. spam-nb.test.ts checks that both give the same scores.
 */
export type Model = { words: Record<Label, Map<string, number>>; messages: Record<Label, number> };

/** Lowercase, split on spaces, trim . , ! ? : ; from both ends of each piece, drop empty pieces. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((p) => p.replace(/^[.,!?:;]+|[.,!?:;]+$/g, ''))
    .filter((p) => p !== '');
}

export function train(examples: readonly Row[]): Model {
  const m: Model = { words: { spam: new Map(), ham: new Map() }, messages: { spam: 0, ham: 0 } };
  for (const [text, label] of examples) {
    m.messages[label] += 1;
    for (const w of tokenize(text)) m.words[label].set(w, (m.words[label].get(w) ?? 0) + 1);
  }
  return m;
}

const total = (c: Map<string, number>) => [...c.values()].reduce((a, b) => a + b, 0);
export const vocabularySize = (m: Model) => new Set([...m.words.spam.keys(), ...m.words.ham.keys()]).size;
const isKnown = (m: Model, w: string) => m.words.spam.has(w) || m.words.ham.has(w);

/** Chance of seeing `word` in a message of this label, with 1 added to every count so nothing is ever zero. */
export function wordChance(m: Model, word: string, label: Label): number {
  return ((m.words[label].get(word) ?? 0) + 1) / (total(m.words[label]) + vocabularySize(m));
}

/** Log of how common the label is, plus the log chance of every word the model has seen before. */
export function logScore(m: Model, text: string, label: Label): number {
  let s = Math.log(m.messages[label] / (m.messages.spam + m.messages.ham));
  for (const w of tokenize(text)) if (isKnown(m, w)) s += Math.log(wordChance(m, w, label));
  return s;
}

export function predict(m: Model, text: string): Label {
  return logScore(m, text, 'spam') > logScore(m, text, 'ham') ? 'spam' : 'ham';
}

export function accuracy(m: Model, rows: readonly Row[]): number {
  return rows.filter(([t, l]) => predict(m, t) === l).length / rows.length;
}

export type Vote = { word: string; known: boolean; spamCount: number; hamCount: number; lean: number };

/** One vote per word: positive leans spam, negative leans not spam, zero for a word never seen in training. */
export function votes(m: Model, text: string): Vote[] {
  return tokenize(text).map((word) => {
    const known = isKnown(m, word);
    return {
      word,
      known,
      spamCount: m.words.spam.get(word) ?? 0,
      hamCount: m.words.ham.get(word) ?? 0,
      lean: known ? Math.log(wordChance(m, word, 'spam')) - Math.log(wordChance(m, word, 'ham')) : 0,
    };
  });
}

/** How much the share of spam in the examples pulls before any word is read (log of spam share over ham share). */
export function startingLean(m: Model): number {
  return Math.log(m.messages.spam / m.messages.ham);
}
