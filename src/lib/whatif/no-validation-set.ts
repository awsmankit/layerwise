/**
 * What if we never hold out data to check?
 * A polynomial of each size is fitted (least squares) to a few noisy points drawn from a smooth curve.
 * Training error can only fall as the polynomial grows; the error on points it has not seen falls and
 * then climbs. Choosing by training error alone picks the biggest model; a held-out check picks a sensible one.
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

export type Pt = { x: number; y: number };

/** The hidden truth the data is drawn from. */
export const truth = (x: number) => Math.sin(2 * Math.PI * x);
export const NOISE = 0.3;
export const N_TRAIN = 12;
export const N_CHECK = 30;
export const N_TEST = 400;
export const MAX_DEGREE = 11;

export function sample(n: number, seed: number): Pt[] {
  const r = rng(seed);
  return Array.from({ length: n }, () => {
    const x = r();
    return { x, y: truth(x) + NOISE * gauss(r) };
  });
}

/** Legendre polynomials P0..Pd at t in [-1, 1]. Better behaved than plain powers. */
export function legendre(t: number, degree: number): number[] {
  const p = [1, t];
  for (let k = 2; k <= degree; k++) p.push(((2 * k - 1) * t * p[k - 1] - (k - 1) * p[k - 2]) / k);
  return p.slice(0, degree + 1);
}

const basis = (x: number, degree: number) => legendre(2 * x - 1, degree);

/** Solve A c = b by Gaussian elimination with partial pivoting. */
export function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = (M[i][n] - M[i].slice(i + 1, n).reduce((s, v, k) => s + v * x[i + 1 + k], 0)) / M[i][i];
  }
  return x;
}

/** Least-squares fit of the given degree. A tiny ridge keeps the arithmetic stable when degree + 1 equals the number of points. */
export function fit(points: Pt[], degree: number): number[] {
  const n = degree + 1;
  const Phi = points.map((p) => basis(p.x, degree));
  const A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => Phi.reduce((s, row) => s + row[i] * row[j], 0) + (i === j ? 1e-9 : 0)));
  const b = Array.from({ length: n }, (_, i) => Phi.reduce((s, row, k) => s + row[i] * points[k].y, 0));
  return solve(A, b);
}

export function predict(coef: number[], x: number): number {
  const b = basis(x, coef.length - 1);
  return coef.reduce((s, c, i) => s + c * b[i], 0);
}

export function mse(coef: number[], points: Pt[]): number {
  return points.reduce((s, p) => s + (predict(coef, p.x) - p.y) ** 2, 0) / points.length;
}

export type Experiment = {
  train: Pt[];
  check: Pt[];
  test: Pt[];
  coefs: number[][]; // index = degree
  trainErr: number[];
  checkErr: number[];
  testErr: number[];
};

export const SEED = 6;

export function run(seed = SEED): Experiment {
  const train = sample(N_TRAIN, seed);
  const check = sample(N_CHECK, seed + 1000);
  const test = sample(N_TEST, seed + 2000);
  const coefs = Array.from({ length: MAX_DEGREE + 1 }, (_, d) => fit(train, d));
  return {
    train,
    check,
    test,
    coefs,
    trainErr: coefs.map((c) => mse(c, train)),
    checkErr: coefs.map((c) => mse(c, check)),
    testErr: coefs.map((c) => mse(c, test)),
  };
}

/** Index of the smallest value; on a tie the larger (later) index wins, as a "bigger is better" chooser would. */
export function argmin(values: number[]): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) if (values[i] <= values[best]) best = i;
  return best;
}

/** The degree each approach would pick: by training error only, or by error on held-out points. */
export function winners(e: Experiment): { withoutCheck: number; withCheck: number } {
  return { withoutCheck: argmin(e.trainErr.slice(1)) + 1, withCheck: argmin(e.checkErr.slice(1)) + 1 };
}

/** The curve for one fitted model, sampled at evenly spaced x values. */
export function curve(coef: number[], steps = 80): Pt[] {
  return Array.from({ length: steps + 1 }, (_, i) => ({ x: i / steps, y: predict(coef, i / steps) }));
}

/** The noise in the data adds this much squared error that no model can remove. */
export const NOISE_FLOOR = NOISE * NOISE;
