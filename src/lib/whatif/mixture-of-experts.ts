/**
 * What if every expert runs for every token? An example model shape in the style of Mixtral 8x7B
 * (dimension, layers, hidden size, heads and expert counts are Table 1 of the Mixtral paper; the 32,000-word
 * vocabulary is an assumption for the example). Parameter counts are computed from the shape.
 * The router scores in the animation are made up (a seeded generator), not from a trained router.
 */

export type Shape = {
  dim: number;
  layers: number;
  hidden: number;
  heads: number;
  kvHeads: number;
  experts: number;
  vocab: number;
};

export const example: Shape = { dim: 4096, layers: 32, hidden: 14336, heads: 32, kvHeads: 8, experts: 8, vocab: 32000 };

export const sentence = ['The', 'cat', 'sat', 'on', 'the', 'mat', 'and', 'purred'] as const;

/** Weights in the attention part of one layer: query, key, value and output projections. */
export function attnParams(s: Shape): number {
  const headDim = s.dim / s.heads;
  return s.dim * s.dim * 2 + s.dim * (s.kvHeads * headDim) * 2;
}

/** One expert is a SwiGLU feed-forward block: three matrices of dim by hidden. */
export function expertParams(s: Shape): number {
  return 3 * s.dim * s.hidden;
}

/** The router is one matrix of dim by number of experts. */
export function routerParams(s: Shape): number {
  return s.dim * s.experts;
}

/** Input and output word tables (not tied). */
export function embedParams(s: Shape): number {
  return 2 * s.vocab * s.dim;
}

/** All weights the model stores. */
export function totalParams(s: Shape): number {
  return embedParams(s) + s.layers * (attnParams(s) + routerParams(s) + s.experts * expertParams(s));
}

/** Weights one token actually uses when it is sent to k experts in each layer. */
export function activeParams(s: Shape, k: number): number {
  const kk = Math.min(Math.max(Math.round(k), 1), s.experts);
  return embedParams(s) + s.layers * (attnParams(s) + routerParams(s) + kk * expertParams(s));
}

/** Rule of thumb: about two arithmetic operations (a multiply and an add) per weight used, per token. */
export function flopsPerToken(params: number): number {
  return 2 * params;
}

/** How many times more work per token when all experts run than when k are chosen. */
export function slowdown(s: Shape, k: number): number {
  return activeParams(s, s.experts) / activeParams(s, k);
}

/** Memory for the stored weights, in gigabytes, at two bytes per weight (16-bit). */
export function weightsGB(params: number): number {
  return (params * 2) / 1e9;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Made-up router scores for one token: one number per expert, in the range -2 to 2, to three decimals. */
export function routerScores(token: number, experts: number): number[] {
  const rnd = mulberry32(1000 + token * 7919);
  return Array.from({ length: experts }, () => Math.round((rnd() * 4 - 2) * 1000) / 1000);
}

/** The k experts with the highest scores (ties go to the lower number), with gate weights that add up to 1 (softmax over the chosen scores). */
export function route(token: number, experts: number, k: number): { expert: number; gate: number }[] {
  const sc = routerScores(token, experts);
  const kk = Math.min(Math.max(Math.round(k), 1), experts);
  const top = sc
    .map((s, e) => ({ s, e }))
    .sort((x, y) => y.s - x.s || x.e - y.e)
    .slice(0, kk);
  const m = Math.max(...top.map((t) => t.s));
  const ex = top.map((t) => Math.exp(t.s - m));
  const total = ex.reduce((s, x) => s + x, 0);
  return top.map((t, i) => ({ expert: t.e, gate: Math.round((ex[i] / total) * 10000) / 10000 }));
}

/** How many tokens each expert has handled after tokens 0..upto (inclusive), in one layer. */
export function loads(experts: number, k: number, upto: number): number[] {
  const out = new Array(experts).fill(0);
  for (let t = 0; t <= upto; t++) for (const r of route(t, experts, k)) out[r.expert]++;
  return out;
}

export function billions(n: number): string {
  return (n / 1e9).toFixed(1) + ' B';
}
