/**
 * A tiny transformer encoder you can read by eye, for the "Encoder, step by step" walkthrough.
 *
 * One sentence, six numbers per word (not 512), one attention head, weights written by hand so the
 * story is visible: "its" should look at "cat". Every step is the real operation (matrix multiply,
 * divide by sqrt(d), softmax, weighted sum, layer norm, ReLU feed-forward). Only the weights are toy.
 * Pure functions, no randomness at run time.
 */

export const TOKENS = ['The', 'cat', 'licked', 'its', 'paw'] as const;
export const D = 6;

/** What each of the six embedding slots stands for in this toy. Real embeddings have no such labels. */
export const FEATURES = ['noun', 'living', 'action', 'function word', 'possessive', 'determiner'] as const;

export type Vec = number[];
export type Mat = number[][];

/** Hand-made word vectors: one row per token, one column per FEATURE. */
export const EMBEDDINGS: Mat = [
  [0, 0, 0, 0, 0, 1], // The: a determiner
  [1, 1, 0, 0, 0, 0], // cat: a living noun
  [0, 0, 1, 0, 0, 0], // licked: an action
  [0, 0, 0, 1, 1, 0], // its: a possessive function word
  [1, 0, 0, 0, 0, 0], // paw: a noun
];

/** Position vectors are scaled down in this toy so a word keeps its identity next to them. */
export const POSITION_SCALE = 0.1;

/** The sinusoidal positional encoding of the original paper: sin on even slots, cos on odd slots, slower waves further along. */
export function positionalEncoding(pos: number, d = D): Vec {
  return Array.from({ length: d }, (_, i) => {
    const angle = pos / Math.pow(10000, (2 * Math.floor(i / 2)) / d);
    return i % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
  });
}

/** The positional encoding for several positions and dimensions, for drawing the wave picture. */
export function positionGrid(positions: number, d: number): Mat {
  return Array.from({ length: positions }, (_, p) => positionalEncoding(p, d));
}

const zeros = (): Mat => Array.from({ length: D }, () => Array(D).fill(0));
const identity = (): Mat => {
  const m = zeros();
  for (let i = 0; i < D; i++) m[i][i] = 1;
  return m;
};

/** What each token goes looking for. Row = a feature a token has, column = a feature it wants to find. */
export const WQ: Mat = (() => {
  const m = zeros();
  m[5][0] = 3; // a determiner wants a noun
  m[4][1] = 4; // a possessive wants something living (its owner)
  m[2][0] = 2.5; // an action wants a noun...
  m[2][1] = 2.5; // ...especially a living one (the doer)
  m[0][2] = 2; // a noun wants the action it takes part in
  m[1][2] = 0.5;
  return m;
})();
/** What each token advertises: here, simply the features it has. */
export const WK: Mat = identity();
/** What each token hands over when someone attends to it: here, itself. */
export const WV: Mat = identity();

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randomMat(rows: number, cols: number, seed: number, scale: number): Mat {
  const r = mulberry32(seed);
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => (r() * 2 - 1) * scale));
}

export const HIDDEN = D * 2;
/** The feed-forward weights: expand to twice the width, ReLU, shrink back. Fixed seeds, so they never change. */
export const W1: Mat = randomMat(D, HIDDEN, 7, 0.9);
export const W2: Mat = randomMat(HIDDEN, D, 11, 0.5);

/* ---------- small linear algebra ---------- */

export function matmul(a: Mat, b: Mat): Mat {
  return a.map((row) => b[0].map((_, j) => row.reduce((s, x, k) => s + x * b[k][j], 0)));
}
export function transpose(a: Mat): Mat {
  return a[0].map((_, j) => a.map((row) => row[j]));
}
export function softmax(row: Vec): Vec {
  const m = Math.max(...row);
  const e = row.map((x) => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
}
/** Normalise one vector to mean 0 and variance 1 (the learned scale and shift are left at 1 and 0). */
export function layerNorm(v: Vec, eps = 1e-5): Vec {
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  const variance = v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length;
  return v.map((x) => (x - mean) / Math.sqrt(variance + eps));
}
export const relu = (v: Vec): Vec => v.map((x) => Math.max(0, x));
export const addMat = (a: Mat, b: Mat): Mat => a.map((row, i) => row.map((x, j) => x + b[i][j]));

export function cosine(a: Vec, b: Vec): number {
  const dot = a.reduce((s, x, i) => s + x * b[i], 0);
  const na = Math.sqrt(a.reduce((s, x) => s + x * x, 0));
  const nb = Math.sqrt(b.reduce((s, x) => s + x * x, 0));
  return na === 0 || nb === 0 ? 0 : dot / (na * nb);
}

/* ---------- the encoder ---------- */

/** Word vector plus a nudge of position, for each token. */
export function withPosition(emb: Mat = EMBEDDINGS): Mat {
  return emb.map((row, p) => {
    const pe = positionalEncoding(p);
    return row.map((x, i) => x + POSITION_SCALE * pe[i]);
  });
}

export interface LayerTrace {
  input: Mat;
  q: Mat;
  k: Mat;
  v: Mat;
  /** Q times K-transposed: row i = token i looking, column j = token j being looked at. */
  scores: Mat;
  /** Scores divided by sqrt(d). */
  scaled: Mat;
  /** Softmax of each scaled row: every row adds to 1. */
  weights: Mat;
  /** Softmax of the raw scores, kept only to show what skipping the scaling would do. */
  weightsUnscaled: Mat;
  /** Weights times V: each token's blend of everyone's values. */
  context: Mat;
  /** Input plus context (the first residual), then normalised. */
  added1: Mat;
  normed1: Mat;
  /** Feed-forward: the wide ReLU layer, then the projection back. */
  hidden: Mat;
  ffn: Mat;
  added2: Mat;
  output: Mat;
}

/** One encoder layer on a matrix of token vectors (one row per token). Post-norm, as in the original paper. */
export function encoderLayer(input: Mat): LayerTrace {
  const q = matmul(input, WQ);
  const k = matmul(input, WK);
  const v = matmul(input, WV);
  const scores = matmul(q, transpose(k));
  const scaled = scores.map((r) => r.map((x) => x / Math.sqrt(D)));
  const weights = scaled.map(softmax);
  const weightsUnscaled = scores.map(softmax);
  const context = matmul(weights, v);
  const added1 = addMat(input, context);
  const normed1 = added1.map((r) => layerNorm(r));
  const hidden = normed1.map((r) => relu(matmul([r], W1)[0]));
  const ffn = matmul(hidden, W2);
  const added2 = addMat(normed1, ffn);
  const output = added2.map((r) => layerNorm(r));
  return { input, q, k, v, scores, scaled, weights, weightsUnscaled, context, added1, normed1, hidden, ffn, added2, output };
}

/** N encoder layers stacked: each takes the previous layer's output. (Real layers have their own weights; this toy reuses one set.) */
export function runEncoder(layers: number): LayerTrace[] {
  const traces: LayerTrace[] = [];
  let x = withPosition();
  for (let i = 0; i < layers; i++) {
    const t = encoderLayer(x);
    traces.push(t);
    x = t.output;
  }
  return traces;
}

/** Index of a token by its text. */
export const idx = (word: string): number => TOKENS.indexOf(word as (typeof TOKENS)[number]);

/** The token a row attends to most, ignoring itself. */
export function topFriend(weights: Mat, row: number): number {
  let best = -1;
  weights[row].forEach((w, j) => {
    if (j !== row && (best < 0 || w > weights[row][best])) best = j;
  });
  return best;
}
