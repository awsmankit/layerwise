/**
 * What if deep networks have no skip connections?
 * A deep stack of sigmoid layers is built from seeded random weights, one input is pushed forward, and the
 * gradient of a simple loss is pushed back by hand (backpropagation). We record how big the gradient is
 * at every layer, with and without a skip connection around each layer.
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

export const WIDTH = 32;
export const MAX_DEPTH = 30;
/** How much of its own change each layer adds on a skip path (a small step, as in real residual nets). */
export const BRANCH = 0.3;

export const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

export function norm(v: number[]): number {
  return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
}

/**
 * Gradient size at each layer, relative to the gradient at the output. Entry 0 is the input side
 * (the first layer's input), the last entry is the output and is always 1.
 * Plain layer:    h' = sigmoid(W h)
 * With skip:      h' = h + BRANCH * (sigmoid(W h) - 0.5)
 * Sigmoid is the classic case where fading gradients were first noticed; its slope is at most 0.25.
 */
export function gradientSizes(depth: number, skip: boolean, seed = 5, samples = 8): number[] {
  const r = rng(seed);
  const acc = Array(depth + 1).fill(0);
  for (let s = 0; s < samples; s++) {
    const Ws = Array.from({ length: depth }, () => Array.from({ length: WIDTH }, () => Array.from({ length: WIDTH }, () => gauss(r) / Math.sqrt(WIDTH))));
    let h = Array.from({ length: WIDTH }, () => gauss(r));
    const hs = [h];
    const ts: number[][] = [];
    for (let l = 0; l < depth; l++) {
      const t = Ws[l].map((row) => sigmoid(row.reduce((a, w, i) => a + w * h[i], 0)));
      ts.push(t);
      h = skip ? h.map((x, i) => x + BRANCH * (t[i] - 0.5)) : t;
      hs.push(h);
    }
    // loss = half the squared size of the output, so the gradient at the output is the output itself
    let g = h.slice();
    const out = norm(g);
    acc[depth] += 1;
    for (let l = depth - 1; l >= 0; l--) {
      const dz = g.map((gi, i) => gi * (skip ? BRANCH : 1) * (ts[l][i] * (1 - ts[l][i])));
      const back = Ws[l][0].map((_, j) => dz.reduce((a, d, i) => a + d * Ws[l][i][j], 0));
      g = skip ? g.map((gi, j) => gi + back[j]) : back;
      acc[l] += norm(g) / out;
    }
  }
  return acc.map((a) => a / samples);
}

/** Plain words for a gradient size relative to the output's (which is 1). */
export function gradientLabel(ratio: number): string {
  if (ratio >= 2) return `${ratio.toFixed(1)} times the output's`;
  if (ratio >= 0.5) return "about the same as the output's";
  const inv = 1 / ratio;
  const names: [number, string][] = [[1e15, 'quadrillion'], [1e12, 'trillion'], [1e9, 'billion'], [1e6, 'million']];
  if (inv >= 1e18) return `1 in 10^${Math.round(Math.log10(inv))} of the output's`;
  for (const [v, name] of names) if (inv >= v) return `1 in ${Math.round(inv / v).toLocaleString('en-US')} ${name} of the output's`;
  return `1 in ${Math.round(inv).toLocaleString('en-US')} of the output's`;
}
