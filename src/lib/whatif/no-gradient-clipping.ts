/**
 * What if one huge gradient is allowed through?
 * A toy recurrent network with a single weight w: it carries a memory forward, h_t = w * h_(t-1), starting from h_1 = 1
 * (input 1, no bias), and is trained to remember its input, so the target is 1 after any number of steps.
 * For a sequence of T steps the output is w^(T-1), the loss is 0.5 * (w^(T-1) - 1)^2 and the gradient is
 *   (w^(T-1) - 1) * (T - 1) * w^(T-2).
 * That gradient is tiny while w is below 1 and enormous once w is a little above 1, and the longer the sequence
 * the bigger the cliff. This is the exploding gradient problem of recurrent networks.
 * Training batches are short sequences (SHORT steps) except that every 8th batch is a long one (LONG steps).
 * Plain gradient descent with a fixed rate. Clip by norm: if |g| > clip, replace g by g * clip / |g|.
 * The loss we report is always measured on a LONG sequence, so the numbers are comparable from step to step.
 */

export const SHORT = 8;
export const LONG = 40;
export const EVERY = 8;
export const STEPS = 40;
export const W0 = 0.7;
export const RATE = 0.03;
/** Clip thresholds offered on the slider (gradient norms). */
export const CLIPS = [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50];
export const DEFAULT_CLIP = 1;
/** A loss above this counts as blown up. */
export const BLOWN_UP = 1e12;
/** A loss below this counts as trained. */
export const TRAINED = 1e-3;

/** Length of the sequence in training batch t (0-based): every EVERY-th batch is long. */
export function batchLength(t: number): number {
  return t % EVERY === EVERY - 1 ? LONG : SHORT;
}

export function lossFor(w: number, T: number): number {
  const e = Math.pow(w, T - 1) - 1;
  return 0.5 * e * e;
}

export function gradFor(w: number, T: number): number {
  return (Math.pow(w, T - 1) - 1) * (T - 1) * Math.pow(w, T - 2);
}

/** Clip by norm in one dimension: keep the sign, cap the size. */
export function clipBy(g: number, clip: number | null): number {
  if (clip === null) return g;
  const n = Math.abs(g);
  return n > clip ? (g * clip) / n : g;
}

export type Step = {
  /** Weight before this step. */
  w: number;
  /** Loss on a long sequence before this step. */
  loss: number;
  /** Length of this step's training sequence. */
  length: number;
  /** Size of the raw gradient. */
  norm: number;
  /** Size of the gradient actually applied (after clipping). */
  applied: number;
  clipped: boolean;
  /** Weight after this step. */
  next: number;
};

export type Run = {
  steps: Step[];
  /** Weight and loss before step STEPS (the end state), unless the run blew up first. */
  endLoss: number;
  endW: number;
  /** First step at which the loss was above BLOWN_UP or not a number, or null. */
  blownUpAt: number | null;
  /** First step at which the loss was below TRAINED, or null. */
  trainedAt: number | null;
  /** Biggest change of the weight in one step (before any blow-up). */
  biggestJump: number;
  maxNorm: number;
  clippedCount: number;
};

/** clip = null means no clipping. */
export function simulate(clip: number | null): Run {
  const steps: Step[] = [];
  let w = W0;
  let blownUpAt: number | null = null;
  let trainedAt: number | null = null;
  let endLoss = lossFor(w, LONG);
  let biggestJump = 0;
  let maxNorm = 0;
  let clippedCount = 0;
  for (let t = 0; t < STEPS; t++) {
    const L = lossFor(w, LONG);
    if (!Number.isFinite(L) || L > BLOWN_UP) {
      blownUpAt = t;
      endLoss = Infinity;
      break;
    }
    if (trainedAt === null && L < TRAINED) trainedAt = t;
    const T = batchLength(t);
    const g = gradFor(w, T);
    const norm = Math.abs(g);
    const gc = clipBy(g, clip);
    const next = w - RATE * gc;
    const clipped = Math.abs(gc) < norm;
    steps.push({ w, loss: L, length: T, norm, applied: Math.abs(gc), clipped, next });
    if (Number.isFinite(norm)) maxNorm = Math.max(maxNorm, norm);
    if (Number.isFinite(next - w)) biggestJump = Math.max(biggestJump, Math.abs(next - w));
    if (clipped) clippedCount++;
    w = next;
    endLoss = lossFor(w, LONG);
    if (t === STEPS - 1) {
      if (!Number.isFinite(endLoss) || endLoss > BLOWN_UP) {
        blownUpAt = STEPS;
        endLoss = Infinity;
      } else if (trainedAt === null && endLoss < TRAINED) trainedAt = STEPS;
    }
  }
  return { steps, endLoss, endW: w, blownUpAt, trainedAt, biggestJump, maxNorm, clippedCount };
}

export type Outcome = 'blown-up' | 'trained' | 'stuck';

export function outcome(run: Run): Outcome {
  if (run.blownUpAt !== null) return 'blown-up';
  return run.trainedAt !== null ? 'trained' : 'stuck';
}

export type Jump = { step: number; from: number; to: number; norm: number; typical: number };

/** The first step whose weight change is bigger than `threshold`, with the average gradient size before it. Null if there is none. */
export function firstJump(run: Run, threshold = 0.2): Jump | null {
  const i = run.steps.findIndex((s) => Math.abs(s.next - s.w) > threshold);
  if (i < 0) return null;
  const before = run.steps.slice(0, i).map((s) => s.norm);
  const typical = before.length ? before.reduce((a, b) => a + b, 0) / before.length : run.steps[i].norm;
  return { step: i, from: run.steps[i].w, to: run.steps[i].next, norm: run.steps[i].norm, typical };
}

export const clipFromIndex = (i: number) => CLIPS[Math.max(0, Math.min(CLIPS.length - 1, i))];
export const indexFromClip = (c: number) => Math.max(0, CLIPS.indexOf(c));
