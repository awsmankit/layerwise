/**
 * A tiny neural network and trainer in plain TypeScript, for the playground in
 * "Inside a neural network". No library: weights live in one flat array, the forward
 * pass and backpropagation are written out, and the optimiser is Adam on the full batch.
 * Every random choice comes from a seeded generator, so a given seed always gives the
 * same data, the same starting weights and the same training run.
 */

export type Activation = 'relu' | 'tanh' | 'sigmoid' | 'linear';
export type DatasetKind = 'blobs' | 'circle' | 'xor' | 'spiral';
export type Point = { x: number; y: number; label: 0 | 1 };

/** Inputs and outputs of the playground live in the square from -LIMIT to LIMIT. */
export const LIMIT = 1.2;

/* ---------- seeded randomness ---------- */

/** mulberry32: a small, fast generator. Returns numbers in [0, 1). */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One normally distributed number (mean 0, standard deviation 1), by the Box-Muller method. */
export function gauss(rand: () => number): number {
  const u = 1 - rand(); // avoid log(0)
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ---------- toy datasets ---------- */

export const DATASETS: { id: DatasetKind; label: string; note: string }[] = [
  { id: 'blobs', label: 'Two clumps', note: 'A straight line separates them.' },
  { id: 'circle', label: 'Ring', note: 'One class sits inside the other, so no straight line works.' },
  { id: 'xor', label: 'Corners', note: 'Opposite corners share a colour: the classic XOR pattern.' },
  { id: 'spiral', label: 'Spiral', note: 'Two arms wound round each other. The hardest of the four.' },
];

/** `n` labelled points, half of each class. */
export function makeData(kind: DatasetKind, n = 120, seed = 1): Point[] {
  const r = rng(seed * 7919 + 13);
  const pts: Point[] = [];
  const half = Math.floor(n / 2);
  if (kind === 'blobs') {
    for (let i = 0; i < n; i++) {
      const label = (i % 2) as 0 | 1;
      const c = label ? 0.5 : -0.5;
      pts.push({ x: c + gauss(r) * 0.2, y: c * 0.8 + gauss(r) * 0.2, label });
    }
  } else if (kind === 'circle') {
    for (let i = 0; i < n; i++) {
      const label = (i % 2) as 0 | 1;
      const a = r() * Math.PI * 2;
      const rad = label ? 0.1 + 0.4 * Math.sqrt(r()) : 0.72 + 0.28 * r();
      pts.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad, label });
    }
  } else if (kind === 'xor') {
    while (pts.length < n) {
      const x = r() * 2 - 1;
      const y = r() * 2 - 1;
      if (Math.abs(x) < 0.1 || Math.abs(y) < 0.1) continue; // keep a clear gap along each axis
      pts.push({ x, y, label: x * y > 0 ? 1 : 0 });
    }
  } else {
    for (let i = 0; i < n; i++) {
      const label = (i % 2) as 0 | 1;
      const t = Math.floor(i / 2) / half; // 0 at the centre, 1 at the rim
      const rad = 0.08 + 0.87 * t;
      const a = t * 3 * Math.PI + (label ? Math.PI : 0);
      pts.push({ x: Math.cos(a) * rad + gauss(r) * 0.03, y: Math.sin(a) * rad + gauss(r) * 0.03, label });
    }
  }
  return pts;
}

/* ---------- the network ---------- */

export type Net = {
  /** Width of every layer, input first: [2, hidden..., 1]. */
  sizes: number[];
  activation: Activation;
  /** All weights and biases in one array; `offsets` says where each layer's block starts. */
  params: Float64Array;
  offsets: { w: number; b: number }[];
  /** Adam's running averages and step count. */
  m: Float64Array;
  v: Float64Array;
  t: number;
  /** Scratch space for one forward pass and one backward pass. */
  out: Float64Array[];
  delta: Float64Array[];
  grad: Float64Array;
};

export const ACTIVATIONS: { id: Activation; label: string }[] = [
  { id: 'relu', label: 'ReLU' },
  { id: 'tanh', label: 'Tanh' },
  { id: 'sigmoid', label: 'Sigmoid' },
  { id: 'linear', label: 'None' },
];

export function act(kind: Activation, z: number): number {
  switch (kind) {
    case 'relu':
      return z > 0 ? z : 0;
    case 'tanh':
      return Math.tanh(z);
    case 'sigmoid':
      return 1 / (1 + Math.exp(-z));
    default:
      return z;
  }
}

/** Slope of the activation, written in terms of its own output `a` so no extra pass is needed. */
function slope(kind: Activation, a: number): number {
  switch (kind) {
    case 'relu':
      return a > 0 ? 1 : 0;
    case 'tanh':
      return 1 - a * a;
    case 'sigmoid':
      return a * (1 - a);
    default:
      return 1;
  }
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/** Number of weights and biases for a given list of hidden layer widths (two inputs, one output). */
export function paramCount(hidden: number[]): number {
  const sizes = [2, ...hidden, 1];
  let n = 0;
  for (let l = 0; l < sizes.length - 1; l++) n += sizes[l] * sizes[l + 1] + sizes[l + 1];
  return n;
}

/**
 * A fresh network with two inputs, the given hidden layers, and one output. Weights start random
 * and small, scaled by the layer's input count (He scaling for ReLU, Xavier otherwise); biases start at zero.
 */
export function createNet(hidden: number[], activation: Activation, seed = 1): Net {
  const sizes = [2, ...hidden, 1];
  const offsets: Net['offsets'] = [];
  let total = 0;
  for (let l = 0; l < sizes.length - 1; l++) {
    offsets.push({ w: total, b: total + sizes[l] * sizes[l + 1] });
    total += sizes[l] * sizes[l + 1] + sizes[l + 1];
  }
  const params = new Float64Array(total);
  const r = rng(seed * 104729 + 5);
  for (let l = 0; l < sizes.length - 1; l++) {
    const gain = activation === 'relu' && l < sizes.length - 2 ? 2 : 1;
    const std = Math.sqrt(gain / sizes[l]);
    for (let i = 0; i < sizes[l] * sizes[l + 1]; i++) params[offsets[l].w + i] = gauss(r) * std;
  }
  return {
    sizes,
    activation,
    params,
    offsets,
    m: new Float64Array(total),
    v: new Float64Array(total),
    t: 0,
    out: sizes.map((s) => new Float64Array(s)),
    delta: sizes.map((s) => new Float64Array(s)),
    grad: new Float64Array(total),
  };
}

/** Run one input through the network. Every layer's output is left in `net.out`. Returns the probability of class 1. */
export function forward(net: Net, x: number, y: number): number {
  const { sizes, params, offsets, out } = net;
  out[0][0] = x;
  out[0][1] = y;
  const last = sizes.length - 2;
  for (let l = 0; l <= last; l++) {
    const nIn = sizes[l];
    const nOut = sizes[l + 1];
    const { w, b } = offsets[l];
    for (let j = 0; j < nOut; j++) {
      let z = params[b + j];
      for (let i = 0; i < nIn; i++) z += params[w + j * nIn + i] * out[l][i];
      out[l + 1][j] = l === last ? sigmoid(z) : act(net.activation, z);
    }
  }
  return out[last + 1][0];
}

const EPS = 1e-12;
const bce = (p: number, label: number) => -(label ? Math.log(p + EPS) : Math.log(1 - p + EPS));

/** Mean cross-entropy loss over the data. */
export function loss(net: Net, data: Point[]): number {
  let s = 0;
  for (const d of data) s += bce(forward(net, d.x, d.y), d.label);
  return s / data.length;
}

/** Fraction of points on the right side of the 0.5 line. */
export function accuracy(net: Net, data: Point[]): number {
  let ok = 0;
  for (const d of data) ok += (forward(net, d.x, d.y) > 0.5 ? 1 : 0) === d.label ? 1 : 0;
  return ok / data.length;
}

/**
 * Gradient of the mean loss with respect to every parameter, by backpropagation, left in `net.grad`.
 * Returns the mean loss. Exposed so the tests can compare it with a numerical estimate.
 */
export function gradients(net: Net, data: Point[]): number {
  const { sizes, params, offsets, out, delta, grad } = net;
  grad.fill(0);
  const last = sizes.length - 2;
  let total = 0;
  for (const d of data) {
    const p = forward(net, d.x, d.y);
    total += bce(p, d.label);
    // sigmoid with cross-entropy: the error signal at the output is simply (p - label)
    delta[last + 1][0] = p - d.label;
    for (let l = last; l >= 0; l--) {
      const nIn = sizes[l];
      const nOut = sizes[l + 1];
      const { w, b } = offsets[l];
      if (l > 0) delta[l].fill(0);
      for (let j = 0; j < nOut; j++) {
        const dj = delta[l + 1][j];
        grad[b + j] += dj;
        for (let i = 0; i < nIn; i++) {
          grad[w + j * nIn + i] += dj * out[l][i];
          if (l > 0) delta[l][i] += dj * params[w + j * nIn + i];
        }
      }
      if (l > 0) for (let i = 0; i < nIn; i++) delta[l][i] *= slope(net.activation, out[l][i]);
    }
  }
  const n = data.length;
  for (let k = 0; k < grad.length; k++) grad[k] /= n;
  return total / n;
}

export const DEFAULT_LR = 0.03;

/** One Adam step on the whole dataset. Returns the loss measured before the step. */
export function trainStep(net: Net, data: Point[], lr = DEFAULT_LR): number {
  const l = gradients(net, data);
  const b1 = 0.9;
  const b2 = 0.999;
  net.t += 1;
  const c1 = 1 - Math.pow(b1, net.t);
  const c2 = 1 - Math.pow(b2, net.t);
  const { params, m, v, grad } = net;
  for (let k = 0; k < params.length; k++) {
    m[k] = b1 * m[k] + (1 - b1) * grad[k];
    v[k] = b2 * v[k] + (1 - b2) * grad[k] * grad[k];
    params[k] -= (lr * (m[k] / c1)) / (Math.sqrt(v[k] / c2) + 1e-8);
  }
  return l;
}

/** The probability of class 1 on a res x res grid covering the playground square, row by row from the top. */
export function boundaryGrid(net: Net, res: number): Float32Array {
  const g = new Float32Array(res * res);
  for (let r = 0; r < res; r++) {
    const y = LIMIT - ((r + 0.5) / res) * 2 * LIMIT;
    for (let c = 0; c < res; c++) {
      const x = -LIMIT + ((c + 0.5) / res) * 2 * LIMIT;
      g[r * res + c] = forward(net, x, y);
    }
  }
  return g;
}

/**
 * What every neuron outputs across the square: maps[layer][neuron] is a res x res grid.
 * Layer 0 holds the two inputs (x and y themselves); the last layer is the probability.
 */
export function neuronMaps(net: Net, res: number): Float32Array[][] {
  const maps = net.sizes.map((s) => Array.from({ length: s }, () => new Float32Array(res * res)));
  for (let r = 0; r < res; r++) {
    const y = LIMIT - ((r + 0.5) / res) * 2 * LIMIT;
    for (let c = 0; c < res; c++) {
      const x = -LIMIT + ((c + 0.5) / res) * 2 * LIMIT;
      forward(net, x, y);
      for (let l = 0; l < net.sizes.length; l++) for (let j = 0; j < net.sizes[l]; j++) maps[l][j][r * res + c] = net.out[l][j];
    }
  }
  return maps;
}

/** A weight, for drawing the lines between neurons: layer `l` connects neuron `i` of layer l to neuron `j` of layer l+1. */
export function weightAt(net: Net, l: number, i: number, j: number): number {
  return net.params[net.offsets[l].w + j * net.sizes[l] + i];
}

/**
 * Multiply a stack of linear layers into the single linear layer they are equal to.
 * Each layer is {w: out x in, b: out}. This is the arithmetic behind "a stack of layers with no
 * activation function is one layer".
 */
export type LinearLayer = { w: number[][]; b: number[] };
export function collapseLinear(layers: LinearLayer[]): LinearLayer {
  let w = layers[0].w.map((row) => [...row]);
  let b = [...layers[0].b];
  for (let k = 1; k < layers.length; k++) {
    const { w: w2, b: b2 } = layers[k];
    const nw = w2.map((row) => w[0].map((_, c) => row.reduce((s, v, i) => s + v * w[i][c], 0)));
    const nb = w2.map((row, j) => row.reduce((s, v, i) => s + v * b[i], 0) + b2[j]);
    w = nw;
    b = nb;
  }
  return { w, b };
}
