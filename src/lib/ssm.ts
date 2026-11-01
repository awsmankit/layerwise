/*
 * Arithmetic for the "State-space models and Mamba" lesson. Everything is exact
 * counting or a short recurrence, so the lesson can state the numbers and the unit
 * tests can check them. The default shape is the published Jamba v0.1 configuration
 * (config.json on Hugging Face, read 1 November 2026).
 */

/* ---------- memory and work: attention against a recurrent state ---------- */

export type ArchShape = {
  layers: number; // total layers, each either attention or state-space
  qHeads: number; // query heads in an attention layer
  kvHeads: number; // key and value heads (grouped-query attention)
  headDim: number;
  dModel: number;
  expand: number; // a Mamba layer works on expand x dModel channels
  dState: number; // state size N per channel
  bytes: number; // bytes per cached or stored number
};

/** Jamba v0.1: 32 layers, 32 query heads, 8 KV heads of size 128, width 4096, expand 2, state size 16. */
export const JAMBA_SHAPE: ArchShape = { layers: 32, qHeads: 32, kvHeads: 8, headDim: 128, dModel: 4096, expand: 2, dState: 16, bytes: 2 };

export type Layout = { id: 'attention' | 'hybrid' | 'ssm'; label: string; attnLayers: number };

/** Three ways to fill the same 32 layers. Jamba uses one attention layer in every eight. */
export const LAYOUTS: Layout[] = [
  { id: 'attention', label: 'All attention', attnLayers: 32 },
  { id: 'hybrid', label: 'Hybrid, 1 attention in 8', attnLayers: 4 },
  { id: 'ssm', label: 'All state-space', attnLayers: 0 },
];

export const GIB = 1024 ** 3;
export const MIB = 1024 ** 2;

/** Causal self-attention scores one pair for each token and each earlier token (itself included). */
export const attentionPairs = (n: number) => (n * (n + 1)) / 2;

/** Keys and values cached per token: 2 (K and V) x KV heads x head size x bytes, for every attention layer. */
export const kvBytesPerToken = (s: ArchShape, attnLayers: number) => 2 * s.kvHeads * s.headDim * s.bytes * attnLayers;

export const kvBytes = (n: number, s: ArchShape, attnLayers: number) => kvBytesPerToken(s, attnLayers) * n;

/** Recurrent state of one state-space layer: expand x width channels, each with N numbers. Small convolution buffers are not counted. */
export const ssmStateValues = (s: ArchShape) => s.expand * s.dModel * s.dState;

/** State bytes for the whole model; the same at any sequence length. */
export const ssmStateBytes = (s: ArchShape, attnLayers: number) => (s.layers - attnLayers) * ssmStateValues(s) * s.bytes;

export const cacheBytes = (n: number, s: ArchShape, attnLayers: number) => kvBytes(n, s, attnLayers) + ssmStateBytes(s, attnLayers);

/** Multiply-adds that depend on the context length when one new token reads the whole cache: scores (Q.K) plus the weighted sum of values, per attention layer. */
export const attentionDecodeMacs = (n: number, s: ArchShape) => 2 * n * s.qHeads * s.headDim;

/** Multiply-adds for one state update and read-out in one state-space layer: about 3 per state entry (decay, write, read). Independent of n. */
export const ssmDecodeMacs = (s: ArchShape) => 3 * ssmStateValues(s);

/** Length-dependent multiply-adds to produce one token with a given layout. */
export const decodeMacs = (n: number, s: ArchShape, attnLayers: number) => attnLayers * attentionDecodeMacs(n, s) + (s.layers - attnLayers) * ssmDecodeMacs(s);

/** Token pairs scored while reading a prompt of n tokens, summed over heads and attention layers. */
export const prefillPairs = (n: number, s: ArchShape, attnLayers: number) => attentionPairs(n) * s.qHeads * attnLayers;

/** The context length at which the cache of an all-attention model equals the fixed state a layout adds in place of it. */
export function memoryCrossover(s: ArchShape, attnLayers: number): number {
  const saved = kvBytesPerToken(s, s.layers) - kvBytesPerToken(s, attnLayers); // bytes per token not cached
  if (saved <= 0) return Infinity;
  return ssmStateBytes(s, attnLayers) / saved;
}

/** Sequential steps a parallel scan needs for n elements: the depth of a balanced tree. */
export const scanDepth = (n: number) => (n <= 1 ? 0 : Math.ceil(Math.log2(n)));

/* ---------- the recurrence, and why it can be scanned in parallel ---------- */

/** One step of a linear recurrence h = a * h_prev + b, as a pair. */
export type Affine = { a: number; b: number };

/** Apply `second` after `first`: the result is again of the form a * h + b, which is why the recurrence is associative. */
export const compose = (first: Affine, second: Affine): Affine => ({ a: second.a * first.a, b: second.a * first.b + second.b });

/** h_t = a_t * h_(t-1) + b_t, one step at a time. */
export function recurrence(steps: Affine[], h0 = 0): number[] {
  const out: number[] = [];
  let h = h0;
  for (const s of steps) {
    h = s.a * h + s.b;
    out.push(h);
  }
  return out;
}

/** The same states by a Hillis-Steele inclusive scan: ceil(log2 n) rounds, each of which could run in parallel. */
export function parallelScan(steps: Affine[], h0 = 0): { states: number[]; rounds: number } {
  let cur = steps.slice();
  let rounds = 0;
  for (let d = 1; d < cur.length; d *= 2) {
    const next = cur.slice();
    for (let i = d; i < cur.length; i++) next[i] = compose(cur[i - d], cur[i]);
    cur = next;
    rounds += 1;
  }
  return { states: cur.map((c) => c.a * h0 + c.b), rounds };
}

/* ---------- the gate: what the state keeps ---------- */

/**
 * The selective recurrence for one channel with a one-number state (Gu and Dao 2023, Theorem 1):
 * h_t = (1 - g_t) * h_(t-1) + g_t * x_t. A gate near 1 overwrites the state with the new input; near 0 it keeps the old state.
 */
export const gatedSteps = (x: number[], g: number[]): Affine[] => x.map((xi, i) => ({ a: 1 - g[i], b: g[i] * xi }));

export const gatedState = (x: number[], g: number[], h0 = 0) => recurrence(gatedSteps(x, g), h0);

/**
 * How much of the state at time `t` (0-based) came from each token s <= t:
 * g_s times the product of (1 - g_k) for every later token k up to t. These shares add up to 1 minus the share still held from h0.
 */
export function holdShares(g: number[], t: number): number[] {
  const out: number[] = [];
  for (let s = 0; s <= t; s++) {
    let keep = g[s];
    for (let k = s + 1; k <= t; k++) keep *= 1 - g[k];
    out.push(keep);
  }
  return out;
}

/** The same gate for every token: a model whose dynamics do not depend on what it reads. */
export const fixedGates = (n: number, g: number) => new Array<number>(n).fill(g);

/** A hand-set stand-in for a learned gate: high for tokens marked important, low for the rest. */
export const selectiveGates = (important: boolean[], high = 0.9, low = 0.03) => important.map((v) => (v ? high : low));
