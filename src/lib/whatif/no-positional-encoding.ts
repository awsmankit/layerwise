/**
 * What if the model has no positional encoding? A tiny deterministic self-attention layer over three words.
 * Each word gets a fixed 8-number embedding from a hash of its spelling. Position, when it is switched on,
 * is added the way the original transformer does it: sine and cosine waves of different frequencies.
 * The model has no learned weights (queries, keys and values are the vectors themselves), so every number
 * is reproducible and nothing is typed in by hand. It is a toy, not a trained model.
 */

export const DIM = 8;

export type Pair = { id: string; a: string[]; b: string[]; note: string };

export const pairs: Pair[] = [
  { id: 'dog', a: ['dog', 'bites', 'man'], b: ['man', 'bites', 'dog'], note: 'Who bites whom?' },
  { id: 'cat', a: ['cat', 'chased', 'mouse'], b: ['mouse', 'chased', 'cat'], note: 'Who is chasing?' },
  { id: 'pay', a: ['alice', 'paid', 'bob'], b: ['bob', 'paid', 'alice'], note: 'Who got the money?' },
];

/** A small string hash (FNV-1a) so every word maps to the same vector on the server and in the browser. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The embedding of a word: 8 numbers between -1 and 1, fixed by its spelling. */
export function embed(word: string): number[] {
  const rnd = mulberry32(hash(word));
  return Array.from({ length: DIM }, () => rnd() * 2 - 1);
}

/** Sinusoidal position vector for position `pos` (0, 1, 2, ...): even slots sine, odd slots cosine. */
export function positionVector(pos: number): number[] {
  return Array.from({ length: DIM }, (_, i) => {
    const freq = 1 / Math.pow(10000, (2 * Math.floor(i / 2)) / DIM);
    return i % 2 === 0 ? Math.sin(pos * freq) : Math.cos(pos * freq);
  });
}

/** What goes into the attention layer for a sentence. */
export function inputs(sentence: string[], withPosition: boolean): number[][] {
  return sentence.map((w, i) => {
    const e = embed(w);
    if (!withPosition) return e;
    const p = positionVector(i);
    return e.map((x, d) => x + p[d]);
  });
}

const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);

export function softmax(scores: number[]): number[] {
  const m = Math.max(...scores);
  const e = scores.map((s) => Math.exp(s - m));
  const t = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / t);
}

/** Attention weights: row i is how much word i looks at each word j, scaled by sqrt(DIM). Rows add up to 1. */
export function attention(sentence: string[], withPosition: boolean): number[][] {
  const x = inputs(sentence, withPosition);
  return x.map((q) => softmax(x.map((k) => dot(q, k) / Math.sqrt(DIM))));
}

/** The layer's output for each word: the attention-weighted mix of all the input vectors. */
export function outputs(sentence: string[], withPosition: boolean): number[][] {
  const x = inputs(sentence, withPosition);
  const w = attention(sentence, withPosition);
  return w.map((row) => Array.from({ length: DIM }, (_, d) => row.reduce((s, wj, j) => s + wj * x[j][d], 0)));
}

/** The same attention table, but arranged by word instead of by position, so two orders can be compared. */
export function byWord(sentence: string[], withPosition: boolean, order: string[]): number[][] {
  const w = attention(sentence, withPosition);
  const idx = order.map((word) => sentence.indexOf(word));
  return idx.map((i) => idx.map((j) => w[i][j]));
}

/** The sorted bag of words: what you are left with if you throw order away. */
export function bag(sentence: string[]): string[] {
  return [...sentence].sort();
}

export function sameBag(a: string[], b: string[]): boolean {
  return bag(a).join('|') === bag(b).join('|');
}

/** How far the layer's output for each word moves when the sentence is reordered. Zero means the model cannot tell. */
export function outputShift(a: string[], b: string[], withPosition: boolean, order: string[] = a): number[] {
  const oa = outputs(a, withPosition);
  const ob = outputs(b, withPosition);
  return order.map((word) => {
    const va = oa[a.indexOf(word)];
    const vb = ob[b.indexOf(word)];
    return Math.sqrt(va.reduce((s, x, d) => s + (x - vb[d]) ** 2, 0));
  });
}

/** Largest gap between any two cells of the by-word attention tables of the two orderings. */
export function tableGap(a: string[], b: string[], withPosition: boolean): number {
  const ta = byWord(a, withPosition, a);
  const tb = byWord(b, withPosition, a);
  let g = 0;
  ta.forEach((row, i) => row.forEach((v, j) => (g = Math.max(g, Math.abs(v - tb[i][j])))));
  return g;
}
