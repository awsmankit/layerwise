/**
 * What if training starts at the full learning rate?
 * A toy network with three layers, one weight in each: output f = a * b * c, input 1, target 1,
 * loss = 0.5 * (f - 1)^2. All three weights start at 2, so f starts at 8 and the loss at 24.5.
 * Plain gradient descent (no Adam, no momentum):  w_i <- w_i - rate * (f - 1) * f / w_i.
 * The loss surface is very steep where the weights are big and much flatter near the answer, which is
 * what makes a big rate fine later but unsafe at the start. Gradient descent on a locally quadratic
 * loss is stable only while rate < 2 / sharpness, where sharpness is the largest eigenvalue of the
 * Hessian (the second derivatives). We compute that sharpness exactly at every step.
 */

export const LAYERS = 3;
export const INIT = 2;
export const STEPS = 40;
export const RATE_MIN = 0.05;
export const RATE_MAX = 0.5;
export const RATE_STEP = 0.05;
export const DEFAULT_RATE = 0.3;
export const WARM_MAX = 30;
export const DEFAULT_WARMUP = 10;
/** A loss above this counts as blown up; the run is cut at that step. */
export const BLOWN_UP = 1e6;
/** A loss below this counts as trained. */
export const TRAINED = 1e-3;

export type Weights = [number, number, number];

export function output(w: Weights): number {
  return w[0] * w[1] * w[2];
}

export function loss(w: Weights): number {
  const e = output(w) - 1;
  return 0.5 * e * e;
}

/** Learning rate at 0-based step t: a linear ramp over `warm` steps up to `peak`, then constant. warm = 0 means no warmup. */
export function rateAt(t: number, peak: number, warm: number): number {
  if (warm <= 0) return peak;
  return peak * Math.min(1, (t + 1) / warm);
}

/** The Hessian of the loss in the three weights. */
export function hessian(w: Weights): number[][] {
  const f = output(w);
  const e = f - 1;
  const d = w.map((x) => f / x); // df / dw_i
  const H: number[][] = [];
  for (let i = 0; i < 3; i++) {
    H.push([]);
    for (let j = 0; j < 3; j++) {
      const cross = i === j ? 0 : f / (w[i] * w[j]); // d2f / dw_i dw_j
      H[i].push(d[i] * d[j] + e * cross);
    }
  }
  return H;
}

/** Largest eigenvalue of the Hessian (the sharpness), by power iteration on a shifted copy. */
export function sharpness(w: Weights): number {
  const H = hessian(w);
  let shift = 0;
  for (const row of H) for (const v of row) shift += v * v;
  shift = Math.sqrt(shift) + 1e-9;
  let v = [1, 1, 1].map((x) => x / Math.sqrt(3));
  let mu = 0;
  for (let it = 0; it < 400; it++) {
    const nv = [0, 1, 2].map((i) => H[i].reduce((s, h, j) => s + h * v[j], 0) + shift * v[i]);
    const norm = Math.hypot(nv[0], nv[1], nv[2]);
    mu = norm;
    v = nv.map((x) => x / norm);
  }
  return Math.round((mu - shift) * 1e4) / 1e4;
}

/** The biggest rate gradient descent can take here without the step growing: 2 / sharpness. */
export function stableLimit(w: Weights): number {
  const s = sharpness(w);
  return s > 0 ? 2 / s : Infinity;
}

export type Run = {
  /** Loss before each step (index 0 is the start). Ends early if the run blows up. */
  loss: number[];
  /** Rate used at each step. */
  rate: number[];
  /** 2 / sharpness at the weights before each step. */
  limit: number[];
  /** The weights before each step. */
  weights: Weights[];
  /** Step at which the loss went above BLOWN_UP, or null. */
  blownUpAt: number | null;
  /** First step with loss below TRAINED, or null. */
  trainedAt: number | null;
  finalLoss: number;
};

export function simulate(peak: number, warm: number): Run {
  let w: Weights = [INIT, INIT, INIT];
  const run: Run = { loss: [], rate: [], limit: [], weights: [], blownUpAt: null, trainedAt: null, finalLoss: 0 };
  for (let t = 0; t <= STEPS; t++) {
    const L = loss(w);
    if (!Number.isFinite(L) || L > BLOWN_UP) {
      run.blownUpAt = t;
      run.finalLoss = Infinity;
      return run;
    }
    run.loss.push(L);
    run.weights.push(w);
    run.limit.push(Math.min(stableLimit(w), 10));
    const eta = rateAt(t, peak, warm);
    run.rate.push(eta);
    if (run.trainedAt === null && L < TRAINED) run.trainedAt = t;
    run.finalLoss = L;
    if (t === STEPS) break;
    const f = output(w);
    const e = f - 1;
    w = w.map((x) => x - eta * e * (f / x)) as Weights;
  }
  return run;
}

export type Outcome = 'blown-up' | 'trained' | 'stuck';

export function outcome(run: Run): Outcome {
  if (run.blownUpAt !== null) return 'blown-up';
  return run.trainedAt !== null ? 'trained' : 'stuck';
}

/**
 * The shortest warmup (in steps, 0 to WARM_MAX) from which every longer warmup up to WARM_MAX also trains the
 * network to a loss below TRAINED, or null if even the longest does not.
 */
export function minTrainingWarmup(peak: number): number | null {
  let best: number | null = null;
  for (let k = WARM_MAX; k >= 0; k--) {
    if (outcome(simulate(peak, k)) === 'trained') best = k;
    else break;
  }
  return best;
}

export const rateFromIndex = (i: number) => Math.round(i * RATE_STEP * 100) / 100;
export const indexFromRate = (r: number) => Math.round(r / RATE_STEP);
