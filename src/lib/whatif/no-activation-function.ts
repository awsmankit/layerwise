/**
 * What if a neural network has no activation functions?
 * A tiny network is trained in plain TypeScript on a 2D dataset that no straight line can split (the
 * "XOR" pattern). One copy has no activation, one has tanh. Everything is seeded, so the page and the
 * tests see the same numbers.
 */

export type Point = { x: number; y: number; label: 0 | 1 };
export type Layer = { w: number[][]; b: number[] }; // w[out][in]
export type Net = { layers: Layer[]; activation: 'none' | 'tanh' };

/** Small seeded random number generator (mulberry32). */
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
  const u = Math.max(r(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}

/** Four blobs in the corners of a square. Opposite corners share a class, so no single line separates them. */
export function makeXor(perBlob = 20, seed = 7): Point[] {
  const r = rng(seed);
  const pts: Point[] = [];
  for (const [cx, cy] of [[1, 1], [-1, -1], [1, -1], [-1, 1]]) {
    for (let i = 0; i < perBlob; i++) {
      pts.push({ x: cx * 0.8 + 0.34 * gauss(r), y: cy * 0.8 + 0.34 * gauss(r), label: cx * cy > 0 ? 1 : 0 });
    }
  }
  return pts;
}

export function initNet(hidden: number, width: number, activation: 'none' | 'tanh', seed: number): Net {
  const r = rng(seed);
  const sizes = [2, ...Array(hidden).fill(width), 1];
  const layers: Layer[] = [];
  for (let l = 0; l < sizes.length - 1; l++) {
    const fanIn = sizes[l];
    const scale = Math.sqrt(1 / fanIn);
    layers.push({
      w: Array.from({ length: sizes[l + 1] }, () => Array.from({ length: fanIn }, () => gauss(r) * scale)),
      b: Array(sizes[l + 1]).fill(0),
    });
  }
  return { layers, activation };
}

const act = (a: Net['activation'], z: number) => (a === 'tanh' ? Math.tanh(z) : z);

/** Run the network on one point and return the raw score (before the sigmoid). */
export function score(net: Net, x: number, y: number): number {
  let h = [x, y];
  net.layers.forEach((L, li) => {
    const z = L.w.map((row, o) => row.reduce((s, wv, i) => s + wv * h[i], L.b[o]));
    h = li === net.layers.length - 1 ? z : z.map((v) => act(net.activation, v));
  });
  return h[0];
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/** Full-batch gradient descent on the logistic loss. Returns the trained net and the loss at each epoch. */
export function train(net: Net, data: Point[], epochs = 700, lr = 0.3): { net: Net; losses: number[] } {
  const L = net.layers;
  const losses: number[] = [];
  for (let e = 0; e < epochs; e++) {
    const gw = L.map((l) => l.w.map((row) => row.map(() => 0)));
    const gb = L.map((l) => l.b.map(() => 0));
    let loss = 0;
    for (const p of data) {
      // forward, remembering each layer's input
      const hs: number[][] = [[p.x, p.y]];
      const zs: number[][] = [];
      L.forEach((layer, li) => {
        const z = layer.w.map((row, o) => row.reduce((s, wv, i) => s + wv * hs[li][i], layer.b[o]));
        zs.push(z);
        hs.push(li === L.length - 1 ? z : z.map((v) => act(net.activation, v)));
      });
      const prob = sigmoid(hs[L.length][0]);
      loss += -(p.label ? Math.log(prob + 1e-12) : Math.log(1 - prob + 1e-12));
      // backward
      let delta = [prob - p.label];
      for (let li = L.length - 1; li >= 0; li--) {
        delta.forEach((d, o) => {
          gb[li][o] += d;
          for (let i = 0; i < hs[li].length; i++) gw[li][o][i] += d * hs[li][i];
        });
        if (li > 0) {
          const prev = hs[li].map((_, i) => delta.reduce((s, d, o) => s + d * L[li].w[o][i], 0));
          delta = net.activation === 'tanh' ? prev.map((v, i) => v * (1 - hs[li][i] * hs[li][i])) : prev;
        }
      }
    }
    const n = data.length;
    L.forEach((layer, li) => {
      layer.w.forEach((row, o) => row.forEach((_, i) => (row[i] -= (lr * gw[li][o][i]) / n)));
      layer.b.forEach((_, o) => (layer.b[o] -= (lr * gb[li][o]) / n));
    });
    losses.push(loss / n);
  }
  return { net, losses };
}

export function accuracy(net: Net, data: Point[]): number {
  return data.filter((p) => (score(net, p.x, p.y) > 0 ? 1 : 0) === p.label).length / data.length;
}

/** Multiply a stack of linear layers into one: returns the single weight row and bias that does the same job. */
export function collapse(layers: Layer[]): { w: number[]; b: number } {
  // Start with the identity map and fold each layer in: W <- L.w * W, b <- L.w * b + L.b
  let W: number[][] = [[1, 0], [0, 1]];
  let b: number[] = [0, 0];
  for (const L of layers) {
    const nW = L.w.map((row) => W[0].map((_, j) => row.reduce((s, wv, k) => s + wv * W[k][j], 0)));
    const nb = L.w.map((row, o) => row.reduce((s, wv, k) => s + wv * b[k], L.b[o]));
    W = nW;
    b = nb;
  }
  return { w: W[0], b: b[0] };
}

export const HIDDEN_LAYER_COUNTS = [1, 2, 3, 4] as const;
export const WIDTH = 6;

export type Trial = { hidden: number; activation: 'none' | 'tanh'; net: Net; accuracy: number; finalLoss: number };

/** Train every combination once. 8 tiny networks, well under a second. */
export function runAll(): { data: Point[]; trials: Trial[] } {
  const data = makeXor();
  const trials: Trial[] = [];
  for (const hidden of HIDDEN_LAYER_COUNTS) {
    for (const activation of ['none', 'tanh'] as const) {
      const { net, losses } = train(initNet(hidden, WIDTH, activation, 11 + hidden), data);
      trials.push({ hidden, activation, net, accuracy: accuracy(net, data), finalLoss: losses[losses.length - 1] });
    }
  }
  return { data, trials };
}
