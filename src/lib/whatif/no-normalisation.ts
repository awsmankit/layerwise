/**
 * What if there is no normalisation?
 * A random network of ReLU layers is built and run on a small batch of random inputs. We record how big
 * the numbers flowing through it are (their root-mean-square size) at every layer, with and without a
 * layer-norm step after each layer. Seeded, so the page and the tests agree.
 */

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(r: () => number): number {
  return Math.sqrt(-2 * Math.log(Math.max(r(), 1e-12))) * Math.cos(2 * Math.PI * r());
}

export const WIDTH = 64;
export const BATCH = 16;
export const MAX_DEPTH = 24;

/** Root-mean-square size of every number in a batch. */
export function rms(batch: number[][]): number {
  let s = 0;
  let n = 0;
  for (const v of batch) for (const x of v) {
    s += x * x;
    n++;
  }
  return Math.sqrt(s / n);
}

/** Layer norm for one vector: subtract its mean, divide by its standard deviation. */
export function layerNorm(v: number[], eps = 1e-5): number[] {
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  const variance = v.reduce((a, b) => a + (b - m) * (b - m), 0) / v.length;
  const d = Math.sqrt(variance + eps);
  return v.map((x) => (x - m) / d);
}

/**
 * RMS activation size after each of `depth` layers. Weights are random with standard deviation
 * scale * sqrt(2 / width): scale 1 is the carefully tuned "He" setting for ReLU, which keeps the size
 * steady; any other scale is multiplied in again at every layer. Index 0 is the input (RMS about 1).
 */
export function activationSizes(depth: number, scale: number, norm: boolean, seed = 42): number[] {
  const r = rng(seed);
  let h = Array.from({ length: BATCH }, () => Array.from({ length: WIDTH }, () => gauss(r)));
  const sizes = [rms(h)];
  const sd = scale * Math.sqrt(2 / WIDTH);
  for (let l = 0; l < depth; l++) {
    const W = Array.from({ length: WIDTH }, () => Array.from({ length: WIDTH }, () => gauss(r) * sd));
    h = h.map((v) => {
      let z = W.map((row) => row.reduce((s, w, i) => s + w * v[i], 0));
      if (norm) z = layerNorm(z);
      return z.map((x) => Math.max(0, x));
    });
    sizes.push(rms(h));
  }
  return sizes;
}

/** How many times bigger (or smaller) the last layer's numbers are than the input's. */
export function drift(sizes: number[]): number {
  return sizes[sizes.length - 1] / sizes[0];
}

/** Largest finite number a 16-bit float can hold; activations past this turn into infinity on many GPUs. */
export const FLOAT16_MAX = 65504;

/** Plain-words label for a size ratio. */
export function describeDrift(ratio: number): 'blowing up' | 'fading away' | 'steady' {
  if (ratio > 3) return 'blowing up';
  if (ratio < 1 / 3) return 'fading away';
  return 'steady';
}

/** "340 times bigger than the input", "about the same size as the input", "8,600 times smaller than the input". */
export function ratioLabel(ratio: number): string {
  const n = (x: number) => Math.round(x).toLocaleString('en-US');
  if (ratio >= 1.5) return `${ratio >= 10 ? n(ratio) : ratio.toFixed(1)} times bigger than the input`;
  if (ratio > 2 / 3) return 'about the same size as the input';
  const inv = 1 / ratio;
  return `${inv >= 10 ? n(inv) : inv.toFixed(1)} times smaller than the input`;
}
