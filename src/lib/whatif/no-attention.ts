/**
 * What if attention is removed? A toy, hand-set model of one attention step for the word "it" in
 * "the animal didn't cross the street because it was too tired".
 * Each word gets four hand-set numbers (its "key"): [is a noun, is alive, is a place, is a small function word].
 * The question the word "it" asks (its "query") is also four hand-set numbers. This is a teaching toy,
 * not a trained model: real models learn thousands of numbers per word.
 */

export const features = ['noun', 'alive', 'place', 'function word'] as const;

export const words = ['the', 'animal', "didn't", 'cross', 'the', 'street', 'because', 'it', 'was', 'too', 'tired'] as const;
export const IT = 7;
export const ANIMAL = 1;
export const STREET = 5;

/** Hand-set keys, one row per word, in the order of `words`. */
export const keys: number[][] = [
  [0, 0, 0, 1], // the
  [1, 1, 0, 0], // animal
  [0, 0, 0, 1], // didn't
  [0, 0, 0, 0.5], // cross
  [0, 0, 0, 1], // the
  [1, 0, 1, 0], // street
  [0, 0, 0, 1], // because
  [1, 0, 0, 0], // it (a pronoun: noun-like, but nothing else)
  [0, 0, 0, 1], // was
  [0, 0, 0, 1], // too
  [0, 0, 0, 0.5], // tired
];

export type Ending = 'tired' | 'wide';
export const endings: Record<Ending, { word: string; query: number[]; ask: string }> = {
  // "it" asks for: a noun, and above all something alive (it can be tired)
  tired: { word: 'tired', query: [1, 3, 0, -1], ask: 'something alive that can be tired' },
  // "it" asks for: a noun, and above all a place (it can be wide)
  wide: { word: 'wide', query: [1, 0, 3, -1], ask: 'a place that can be wide' },
};

export type Mode = 'attention' | 'self' | 'average';

export function softmax(scores: number[]): number[] {
  const m = Math.max(...scores);
  const e = scores.map((s) => Math.exp(s - m));
  const total = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / total);
}

const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);

/** Raw scores of "it" against every word: the dot product of its query with each key. */
export function scores(ending: Ending): number[] {
  const q = endings[ending].query;
  return keys.map((k) => dot(q, k));
}

/**
 * How much "it" listens to each word (the weights add up to 1).
 * attention: softmax of the scores. self: all of it on itself. average: the same share for every other word.
 */
export function weights(ending: Ending, mode: Mode): number[] {
  const n = words.length;
  if (mode === 'self') return words.map((_, i) => (i === IT ? 1 : 0));
  if (mode === 'average') return words.map((_, i) => (i === IT ? 0 : 1 / (n - 1)));
  return softmax(scores(ending));
}

/** What "it" now carries: the weighted mix of the keys. Index 1 is "alive", index 2 is "place". */
export function blend(w: number[]): number[] {
  return features.map((_, f) => w.reduce((s, x, i) => s + x * keys[i][f], 0));
}

/** Which noun "it" refers to, if the weights make it clear. A noun must get at least twice the share of the other. */
export function resolve(w: number[]): 'animal' | 'street' | null {
  if (w[ANIMAL] > 0 && w[ANIMAL] >= 2 * w[STREET]) return 'animal';
  if (w[STREET] > 0 && w[STREET] >= 2 * w[ANIMAL]) return 'street';
  return null;
}
