/**
 * What if attention has only one head? A toy with hand-set head patterns for the word "ate" in
 * "the tired cat quickly ate the fish". Each head is one row of attention weights over the seven words
 * (every row adds up to 1). These are teaching numbers, not trained weights: real models learn them.
 * Several heads run side by side and their outputs are joined (the paper uses h = 8 heads), so each
 * head can look at a different thing. One head has a single set of weights, so it must choose.
 */

export const words = ['the', 'tired', 'cat', 'quickly', 'ate', 'the', 'fish'] as const;
export const QUERY = 4; // "ate"

export type HeadId = 'syntax' | 'nearby' | 'meaning' | 'describing';

export const heads: { id: HeadId; name: string; plain: string; weights: number[] }[] = [
  { id: 'syntax', name: 'Grammar head', plain: 'who does it, and to what', weights: [0, 0, 0.55, 0, 0, 0.05, 0.4] },
  { id: 'nearby', name: 'Nearby head', plain: 'the words right next to it', weights: [0, 0, 0.1, 0.5, 0, 0.4, 0] },
  { id: 'meaning', name: 'Meaning head', plain: 'words about eating', weights: [0, 0.1, 0.25, 0, 0, 0, 0.65] },
  { id: 'describing', name: 'Describing head', plain: 'words that describe', weights: [0, 0.5, 0, 0.5, 0, 0, 0] },
];

/** Facts a reader needs to understand "ate", each tied to the word that carries it. */
export const facts: { id: string; label: string; word: number }[] = [
  { id: 'who', label: 'who ate', word: 2 },
  { id: 'what', label: 'what was eaten', word: 6 },
  { id: 'how', label: 'how it ate', word: 3 },
  { id: 'state', label: 'what state the eater is in', word: 1 },
];

/** A fact counts as captured when some head gives its word at least this share of its attention (toy threshold). */
export const THRESHOLD = 0.3;

export type Choice = HeadId | 'blend';

/** The single head's weights: one pattern, or the average of all four (the head tries to do everything). */
export function singleHead(choice: Choice): number[] {
  if (choice === 'blend') {
    return words.map((_, i) => heads.reduce((s, h) => s + h.weights[i], 0) / heads.length);
  }
  return heads.find((h) => h.id === choice)!.weights;
}

/** The rows of weights the layer uses: all four heads, or one. */
export function activeRows(multi: boolean, choice: Choice): number[][] {
  return multi ? heads.map((h) => h.weights) : [singleHead(choice)];
}

/** The best share any active head gives to this fact's word. Heads keep separate outputs, so the best one counts. */
export function strength(fact: { word: number }, rows: number[][]): number {
  return Math.max(...rows.map((r) => r[fact.word]));
}

export function captured(fact: { word: number }, rows: number[][]): boolean {
  return strength(fact, rows) >= THRESHOLD - 1e-9;
}

export function capturedCount(rows: number[][]): number {
  return facts.filter((f) => captured(f, rows)).length;
}

export function rowSum(r: number[]): number {
  return r.reduce((a, b) => a + b, 0);
}
