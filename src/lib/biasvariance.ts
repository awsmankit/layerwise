/**
 * Fit a polynomial of chosen degree to noisy points, with an optional ridge penalty, and measure
 * training error, test error, bias and variance. Used by the "Overfitting and bias-variance" lesson.
 * The polynomial is written in Chebyshev form so degree 15 stays numerically well behaved.
 */
import { ridgeFit } from './linalg';
import { mulberry32 } from './data-prep';

export interface Point {
  x: number;
  y: number;
}

/** The hidden truth the points are drawn around. */
export const truth = (x: number) => Math.sin(2 * Math.PI * x) + 0.6 * x;
/** Standard deviation of the noise added to each label. */
export const NOISE = 0.3;
export const MAX_DEGREE = 15;
/** Sizes the "get more data" button steps through. */
export const SIZES = [12, 24, 48, 96, 192];
/** Regulariser strengths on the slider; index 0 is off. */
export const LAMBDAS = [0, 0.0001, 0.001, 0.01, 0.1, 1, 10];
export const LAMBDA_NAMES = ['off', 'tiny', 'small', 'medium', 'large', 'larger', 'huge'];

function gauss(rand: () => number) {
  return Math.sqrt(-2 * Math.log(Math.max(rand(), 1e-12))) * Math.cos(2 * Math.PI * rand());
}

/** `n` points with x between 0 and 1. The same seed always gives the same stream, so the first 10 points are inside the first 20. */
export function sample(seed: number, n: number): Point[] {
  const rand = mulberry32(seed);
  return Array.from({ length: n }, () => {
    const x = rand();
    return { x, y: truth(x) + NOISE * gauss(rand) };
  });
}

/** A fixed set of unseen points used to measure test error. */
export const TEST = sample(424242, 400);
/** The points the lesson starts from. */
export const DATA_SEED = 11;

function basis(x: number, degree: number): number[] {
  const t = 2 * x - 1;
  const b = [1];
  if (degree >= 1) b.push(t);
  for (let k = 2; k <= degree; k++) b.push(2 * t * b[k - 1] - b[k - 2]);
  return b;
}

export interface Fit {
  degree: number;
  lambda: number;
  coef: number[];
}

const FLOOR = 1e-7; // keeps the equations solvable when there are more knobs than points

/** Least-squares fit of a polynomial. `lambda` is the ridge penalty on every coefficient except the constant. */
export function fit(points: Point[], degree: number, lambda: number): Fit {
  const X = points.map((p) => basis(p.x, degree));
  const penalty = [0, ...Array.from({ length: degree }, () => Math.max(lambda, FLOOR))];
  const coef = ridgeFit(X, points.map((p) => p.y), penalty) ?? new Array<number>(degree + 1).fill(0);
  return { degree, lambda, coef };
}

export function predict(f: Fit, x: number): number {
  const b = basis(x, f.degree);
  let s = 0;
  for (let i = 0; i < b.length; i++) s += b[i] * f.coef[i];
  return s;
}

/** Root mean squared error of a fit on some points. */
export function rmse(f: Fit, points: Point[]): number {
  let s = 0;
  for (const p of points) s += (predict(f, p.x) - p.y) ** 2;
  return Math.sqrt(s / points.length);
}

/** Training and test error for every degree from 1 to MAX_DEGREE, on one training set. */
export function errorsByDegree(train: Point[], lambda: number, test: Point[] = TEST) {
  const out: { degree: number; train: number; test: number }[] = [];
  for (let d = 1; d <= MAX_DEGREE; d++) {
    const f = fit(train, d, lambda);
    out.push({ degree: d, train: rmse(f, train), test: rmse(f, test) });
  }
  return out;
}

export interface Decomposition {
  /** Squared gap between the average prediction and the truth. */
  bias2: number;
  /** How much predictions change from one training set to the next. */
  variance: number;
  /** The noise that no model can remove. */
  noise: number;
  /** Mean test squared error over the same training sets. */
  meanTestMse: number;
}

const GRID = Array.from({ length: 101 }, (_, i) => i / 100);

/** Refit on `reps` fresh training sets of size `n` and split the average test error into bias, variance and noise. */
export function decompose(n: number, degree: number, lambda: number, reps = 40, firstSeed = 5000): Decomposition {
  const preds: number[][] = [];
  let mse = 0;
  for (let r = 0; r < reps; r++) {
    const f = fit(sample(firstSeed + r, n), degree, lambda);
    preds.push(GRID.map((x) => predict(f, x)));
    mse += rmse(f, TEST) ** 2;
  }
  let bias2 = 0;
  let variance = 0;
  GRID.forEach((x, g) => {
    const m = preds.reduce((s, p) => s + p[g], 0) / reps;
    bias2 += (m - truth(x)) ** 2;
    variance += preds.reduce((s, p) => s + (p[g] - m) ** 2, 0) / reps;
  });
  return { bias2: bias2 / GRID.length, variance: variance / GRID.length, noise: NOISE ** 2, meanTestMse: mse / reps };
}

/** Average training and test error as the training set grows, for one choice of degree and penalty. */
export function learningCurve(degree: number, lambda: number, sizes: number[], reps = 12, firstSeed = 9000) {
  return sizes.map((n) => {
    let tr = 0;
    let te = 0;
    for (let r = 0; r < reps; r++) {
      const pts = sample(firstSeed + r, n);
      const f = fit(pts, degree, lambda);
      tr += rmse(f, pts);
      te += rmse(f, TEST);
    }
    return { n, train: tr / reps, test: te / reps };
  });
}

/** Mean of k-fold cross-validated RMSE: fit on k-1 folds, score on the one left out. */
export function crossValidate(points: Point[], degree: number, lambda: number, k = 5): number {
  let sum = 0;
  for (let i = 0; i < k; i++) {
    const hold = points.filter((_, j) => j % k === i);
    const rest = points.filter((_, j) => j % k !== i);
    sum += rmse(fit(rest, degree, lambda), hold);
  }
  return sum / k;
}
