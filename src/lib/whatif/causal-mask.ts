/**
 * What if the model can see the words that come after?
 * A toy next-word task. A "masked" model may only read the words up to and including the one that is
 * asking; an "unmasked" model may also read the words after it. Every number on the page comes from here.
 */

export const sentence = ['the', 'cat', 'sat', 'on', 'the', 'mat'] as const;

/** The tiny training text for the masked model's word-pair table. The page sentence is the first line. */
export const corpus: string[][] = [
  ['the', 'cat', 'sat', 'on', 'the', 'mat'],
  ['the', 'dog', 'sat', 'on', 'the', 'rug'],
  ['the', 'cat', 'ate', 'the', 'fish'],
  ['a', 'dog', 'ate', 'the', 'bone'],
];

export type Mode = 'practice' | 'live';

/** Attention weights for a sentence of n words. Row i is the word asking, column j the word it looks at. */
export function attentionWeights(n: number, masked: boolean): number[][] {
  return Array.from({ length: n }, (_, i) => {
    // Equal scores everywhere, so the only thing that shapes the weights is the mask: -infinity hides a cell.
    const scores = Array.from({ length: n }, (_, j) => (masked && j > i ? -Infinity : 0));
    const exps = scores.map((s): number => (s === -Infinity ? 0 : 1));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map((e) => e / sum);
  });
}

/** Can the word in row i read the word in column j? */
export function canSee(i: number, j: number, masked: boolean): boolean {
  return !masked || j <= i;
}

/** Word-pair table: for each word, the word that most often follows it (ties go to the alphabetically first). */
export function trainPairs(text: string[][] = corpus): Record<string, string> {
  const counts: Record<string, Record<string, number>> = {};
  for (const s of text) {
    for (let i = 0; i < s.length - 1; i++) {
      counts[s[i]] ??= {};
      counts[s[i]][s[i + 1]] = (counts[s[i]][s[i + 1]] ?? 0) + 1;
    }
  }
  const table: Record<string, string> = {};
  for (const [w, nexts] of Object.entries(counts)) {
    table[w] = Object.entries(nexts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  }
  return table;
}

/**
 * The words the model can read when it is asked about row i. null is a blank: a word that has not been
 * written yet. In practice the whole sentence is on the page; live, only the words up to i exist.
 */
export function view(words: readonly string[], i: number, masked: boolean, mode: Mode): (string | null)[] {
  return words.map((w, j) => {
    if (masked && j > i) return null; // the mask hides it in both modes
    if (!masked && j > i && mode === 'live') return null; // not written yet
    return w;
  });
}

/** A masked model that reads the latest word it is allowed to see and looks up the pair table. */
function predictFromPast(seen: (string | null)[], i: number, table: Record<string, string>): string | null {
  const w = seen[i];
  return w != null && table[w] !== undefined ? table[w] : null;
}

/** A model that can see the next word and has learned the easiest rule available: copy it. */
function predictByPeeking(seen: (string | null)[], i: number): string | null {
  return seen[i + 1] ?? null;
}

export type Row = { i: number; asked: string; truth: string; pred: string | null; ok: boolean };

/** Ask the model for each next word of the sentence, one row at a time. */
export function results(masked: boolean, mode: Mode, words: readonly string[] = sentence, table = trainPairs()): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    const seen = view(words, i, masked, mode);
    const pred = masked ? predictFromPast(seen, i, table) : predictByPeeking(seen, i);
    rows.push({ i, asked: words[i], truth: words[i + 1], pred, ok: pred === words[i + 1] });
  }
  return rows;
}

export const correctCount = (rows: Row[]) => rows.filter((r) => r.ok).length;
export const percent = (rows: Row[]) => Math.round((100 * correctCount(rows)) / rows.length);

/** Practice-test accuracy of the peeking model over the whole training text (every sentence, every next word). */
export function peekAccuracyOnCorpus(text: string[][] = corpus): number {
  let ok = 0;
  let total = 0;
  for (const s of text) {
    for (const r of results(false, 'practice', s)) {
      total += 1;
      if (r.ok) ok += 1;
    }
  }
  return ok / total;
}
