/**
 * What if we add hundreds of features that mean nothing? A small toy training set (30 people, two classes) where
 * exactly 2 columns carry the signal. We append 0 to 500 columns of pure random numbers and score two models on
 * 250 fresh rows:
 *   flexible: 1-nearest-neighbour. It copies the label of the closest training row, measuring "closest" over ALL columns,
 *             so every useless column adds distance noise.
 *   simple and regularised: a linear model with an L1 penalty (lasso), fitted by coordinate descent. The penalty pushes the
 *             weights of columns that do not help to exactly zero.
 * Scores are averaged over several seeded repeats. Every number is computed here.
 */

export const N_TRAIN = 30;
export const N_TEST = 250;
export const REAL = 2;
export const SIGNAL = 1.5; // class means are -1.5 and +1.5 on each real column, spread 1
export const MAX_NOISE = 500;
export const STEPS = [0, 5, 10, 20, 50, 100, 150, 200, 300, 400, 500] as const;
export const REPEATS = 6;
/** Lasso penalty = LAMBDA_SCALE * sqrt(2 ln(columns) / n): a standard rule of thumb, not tuned on the test rows. */
export const LAMBDA_SCALE = 0.5;

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

export type Data = { X: number[][]; y: number[] };

/** Rows with REAL signal columns first, then MAX_NOISE random columns. Use the first `noise` of them. Classes are balanced. */
export function makeData(n: number, seed: number): Data {
  const r = rng(seed);
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    const label = i % 2 === 0 ? 1 : 0;
    const row: number[] = [];
    for (let j = 0; j < REAL; j++) row.push(Math.round(((label ? SIGNAL : -SIGNAL) + gauss(r)) * 1000) / 1000);
    for (let j = 0; j < MAX_NOISE; j++) row.push(Math.round(gauss(r) * 1000) / 1000);
    X.push(row);
    y.push(label);
  }
  return { X, y };
}

const cols = (noise: number) => REAL + noise;

/** 1-nearest-neighbour over the first REAL + noise columns. */
export function nearestNeighbour(train: Data, test: Data, noise: number): number {
  const d = cols(noise);
  let right = 0;
  for (let i = 0; i < test.X.length; i++) {
    let best = Infinity;
    let label = 0;
    for (let k = 0; k < train.X.length; k++) {
      let s = 0;
      for (let j = 0; j < d; j++) {
        const diff = test.X[i][j] - train.X[k][j];
        s += diff * diff;
      }
      if (s < best) {
        best = s;
        label = train.y[k];
      }
    }
    if (label === test.y[i]) right++;
  }
  return right / test.X.length;
}

const soft = (z: number, t: number) => (z > t ? z - t : z < -t ? z + t : 0);

export type Lasso = { w: number[]; b: number };

/** Minimise (1 / 2n) * sum (y' - b - x.w)^2 + lambda * sum |w| for y' = +1 or -1, by cyclic coordinate descent. */
export function fitLasso(train: Data, noise: number, lambda: number, sweeps = 60): Lasso {
  const d = cols(noise);
  const n = train.X.length;
  const t = train.y.map((v) => (v ? 1 : -1));
  const mean = Array.from({ length: d }, (_, j) => train.X.reduce((s, row) => s + row[j], 0) / n);
  const Xc = train.X.map((row) => Array.from({ length: d }, (_, j) => row[j] - mean[j]));
  const tm = t.reduce((s, v) => s + v, 0) / n;
  const w = new Array(d).fill(0);
  const resid = t.map((v) => v - tm);
  const sq = Array.from({ length: d }, (_, j) => Xc.reduce((s, row) => s + row[j] * row[j], 0) / n);
  for (let s = 0; s < sweeps; s++) {
    for (let j = 0; j < d; j++) {
      if (sq[j] === 0) continue;
      let rho = 0;
      for (let i = 0; i < n; i++) rho += Xc[i][j] * (resid[i] + Xc[i][j] * w[j]);
      rho /= n;
      const next = soft(rho, lambda) / sq[j];
      const delta = next - w[j];
      if (delta !== 0) {
        for (let i = 0; i < n; i++) resid[i] -= Xc[i][j] * delta;
        w[j] = next;
      }
    }
  }
  const b = tm - w.reduce((s, v, j) => s + v * mean[j], 0);
  return { w, b };
}

export const lambdaFor = (noise: number) => LAMBDA_SCALE * Math.sqrt((2 * Math.log(cols(noise))) / N_TRAIN);

export function lassoScore(train: Data, test: Data, noise: number): { accuracy: number; kept: number; keptNoise: number } {
  const m = fitLasso(train, noise, lambdaFor(noise));
  const d = cols(noise);
  let right = 0;
  for (let i = 0; i < test.X.length; i++) {
    let z = m.b;
    for (let j = 0; j < d; j++) z += m.w[j] * test.X[i][j];
    if ((z > 0 ? 1 : 0) === test.y[i]) right++;
  }
  const kept = m.w.filter((v) => v !== 0).length;
  const keptNoise = m.w.slice(REAL).filter((v) => v !== 0).length;
  return { accuracy: right / test.X.length, kept, keptNoise };
}

export type Point = { noise: number; nn: number; lasso: number; keptNoise: number; keptReal: number };

/** Average over REPEATS seeded training and test sets. */
export function scoreAt(noise: number, repeats = REPEATS): Point {
  let nn = 0;
  let lasso = 0;
  let keptNoise = 0;
  let keptReal = 0;
  for (let r = 0; r < repeats; r++) {
    const train = makeData(N_TRAIN, 100 + r);
    const test = makeData(N_TEST, 900 + r);
    nn += nearestNeighbour(train, test, noise);
    const l = lassoScore(train, test, noise);
    lasso += l.accuracy;
    keptNoise += l.keptNoise;
    keptReal += l.kept - l.keptNoise;
  }
  return { noise, nn: nn / repeats, lasso: lasso / repeats, keptNoise: keptNoise / repeats, keptReal: keptReal / repeats };
}

export function curve(steps: readonly number[] = STEPS, repeats = REPEATS): Point[] {
  return steps.map((n) => scoreAt(n, repeats));
}
