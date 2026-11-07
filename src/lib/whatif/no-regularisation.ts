/**
 * What if there is no regularisation?
 * A small noisy dataset (10 training points around a gentle sine curve) is fitted with a degree-9 polynomial,
 * which has 10 weights: exactly enough freedom to pass through every training point, noise and all.
 * Regularisation here is an L2 penalty ("weight decay"): instead of only minimising the squared error, we minimise
 *   sum (prediction - y)^2  +  lambda * sum of squared weights  (the constant term is not penalised).
 * This has a closed-form answer, w = (X'X + lambda I') ^ -1 X'y, solved by Gaussian elimination below.
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

export const DEGREE = 9;
export const N_TRAIN = 10;
export const N_TEST = 40;
export const NOISE = 0.25;
/** The hidden truth the data is drawn around. */
export const truth = (x: number): number => Math.sin(Math.PI * x);

/** Strengths on the slider. Index 0 means no regularisation at all. */
export const LAMBDAS = [0, 1e-6, 1e-5, 1e-4, 1e-3, 1e-2, 1e-1, 1, 10] as const;

export type Point = { x: number; y: number };
export type Data = { train: Point[]; test: Point[] };

export function makeData(seed = 2): Data {
  const r = rng(seed);
  // training x are spread out with a little jitter, so every part of the range has a point
  const train: Point[] = Array.from({ length: N_TRAIN }, (_, i) => {
    const x = -1 + (2 * (i + 0.5 + (r() - 0.5) * 0.7)) / N_TRAIN;
    return { x, y: truth(x) + NOISE * gauss(r) };
  });
  const test: Point[] = Array.from({ length: N_TEST }, (_, i) => {
    const x = -1 + (2 * (i + 0.5)) / N_TEST;
    return { x, y: truth(x) + NOISE * gauss(r) };
  });
  return { train, test };
}

export function features(x: number): number[] {
  return Array.from({ length: DEGREE + 1 }, (_, k) => Math.pow(x, k));
}

/** Solve a x = b by Gaussian elimination with partial pivoting. */
export function solve(a: number[][], b: number[]): number[] {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = c + 1; r < n; r++) {
      const f = m[r][c] / m[c][c];
      for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
    }
  }
  const x = Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = m[r][n];
    for (let k = r + 1; k < n; k++) s -= m[r][k] * x[k];
    x[r] = s / m[r][r];
  }
  return x;
}

/** Ridge (L2) fit. lambda = 0 is the plain least-squares fit. */
export function fit(train: Point[], lambda: number): number[] {
  const d = DEGREE + 1;
  const G = Array.from({ length: d }, () => Array(d).fill(0));
  const v = Array(d).fill(0);
  for (const p of train) {
    const f = features(p.x);
    for (let i = 0; i < d; i++) {
      v[i] += f[i] * p.y;
      for (let j = 0; j < d; j++) G[i][j] += f[i] * f[j];
    }
  }
  for (let i = 1; i < d; i++) G[i][i] += lambda;
  return solve(G, v);
}

export function predict(w: number[], x: number): number {
  let s = 0;
  for (let k = 0; k < w.length; k++) s += w[k] * Math.pow(x, k);
  return s;
}

export function rmse(w: number[], pts: Point[]): number {
  return Math.sqrt(pts.reduce((s, p) => s + (predict(w, p.x) - p.y) ** 2, 0) / pts.length);
}

/** Size of all weights except the constant term: the square root of the sum of squares. */
export function weightNorm(w: number[]): number {
  return Math.sqrt(w.slice(1).reduce((s, v) => s + v * v, 0));
}

export type Result = {
  lambda: number;
  w: number[];
  trainError: number;
  testError: number;
  norm: number;
  maxWeight: number;
};

export function run(data: Data, lambda: number): Result {
  const w = fit(data.train, lambda);
  return {
    lambda,
    w,
    trainError: rmse(w, data.train),
    testError: rmse(w, data.test),
    norm: weightNorm(w),
    maxWeight: Math.max(...w.slice(1).map(Math.abs)),
  };
}

/** The slider index with the lowest held-out error. */
export function bestIndex(data: Data): number {
  let best = 0;
  let bestErr = Infinity;
  LAMBDAS.forEach((l, i) => {
    const e = run(data, l).testError;
    if (e < bestErr) {
      bestErr = e;
      best = i;
    }
  });
  return best;
}

/** The error of just guessing the true curve's value plus noise: the floor nobody can beat on this data (about NOISE). */
export const NOISE_FLOOR = NOISE;

export function lambdaLabel(l: number): string {
  return l === 0 ? 'none' : String(l);
}
