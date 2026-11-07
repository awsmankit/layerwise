/**
 * What if the learning rate is too high or too low?
 * Plain gradient descent on a real 2D loss surface, a stretched bowl:
 *   loss(x, y) = 0.5 * (A * x^2 + B * y^2)      with A = 1 and B = 6.
 * The gradient is (A x, B y), so one step with learning rate lr is exactly
 *   x <- (1 - lr * A) x      y <- (1 - lr * B) y.
 * Each coordinate shrinks by a fixed factor per step, so the whole story can be checked by hand:
 *   - it converges only if |1 - lr * B| < 1, that is lr < 2 / B (the steep direction decides);
 *   - the factor per step is rho = max(|1 - lr A|, |1 - lr B|), smallest at lr = 2 / (A + B);
 *   - if lr * B > 1 the steep coordinate flips sign every step (it bounces across the valley).
 */

export const A = 1;
export const B = 6;
export const START: [number, number] = [-5, 2];
export const TOLERANCE = 0.01;
/** Steps drawn on screen: the "budget" a training run is given in this toy. */
export const BUDGET = 40;
export const MAX_STEPS = 5000;
export const LR_MIN = 0.01;
export const LR_MAX = 0.4;
export const LR_STEP = 0.01;
/** A well-chosen preset: smooth and quick. */
export const GOOD_LR = 0.16;
export const LOW_LR = 0.01;
export const HIGH_LR = 0.36;

export function loss(x: number, y: number): number {
  return 0.5 * (A * x * x + B * y * y);
}

export type Point = { x: number; y: number; loss: number };

/** The path of gradient descent: index 0 is the start. Stops early once the loss is tiny or has blown past 1e12. */
export function descend(lr: number, steps: number): Point[] {
  const pts: Point[] = [];
  let x = START[0];
  let y = START[1];
  pts.push({ x, y, loss: loss(x, y) });
  for (let t = 0; t < steps; t++) {
    x -= lr * A * x;
    y -= lr * B * y;
    pts.push({ x, y, loss: loss(x, y) });
  }
  return pts;
}

/** Per-step shrink factor of the slowest coordinate. Above 1 the loss grows. */
export function rho(lr: number): number {
  return Math.max(Math.abs(1 - lr * A), Math.abs(1 - lr * B));
}

/** Largest rate that still converges (exclusive). */
export const STABLE_LIMIT = 2 / B;
/** The fastest rate for this bowl. */
export const BEST_LR = 2 / (A + B);

/** Steps needed until the loss is below the tolerance, or null if it never gets there. */
export function stepsToTolerance(lr: number, tol = TOLERANCE): number | null {
  if (rho(lr) >= 1) return null;
  let x = START[0];
  let y = START[1];
  if (loss(x, y) <= tol) return 0;
  for (let t = 1; t <= MAX_STEPS; t++) {
    x -= lr * A * x;
    y -= lr * B * y;
    if (loss(x, y) <= tol) return t;
  }
  return null;
}

export type Behaviour = 'crawls' | 'smooth' | 'bouncing' | 'diverges';

/**
 * 'diverges': the loss grows. 'crawls': it falls but misses the tolerance within the budget.
 * 'bouncing': it converges but the steep coordinate flips sign each step. 'smooth': quick and steady.
 */
export function behaviour(lr: number): Behaviour {
  if (rho(lr) >= 1 - 1e-12) return 'diverges';
  const n = stepsToTolerance(lr);
  if (n === null || n > BUDGET) return 'crawls';
  return lr * B > 1 ? 'bouncing' : 'smooth';
}

/** Loss after `steps` steps, in closed form (used to cross-check the loop). */
export function lossAfter(lr: number, steps: number): number {
  const x = START[0] * Math.pow(1 - lr * A, steps);
  const y = START[1] * Math.pow(1 - lr * B, steps);
  return loss(x, y);
}

/** The slider has integer positions; position i means lr = i * LR_STEP, rounded to avoid float noise. */
export function lrFromIndex(i: number): number {
  return Math.round(i * LR_STEP * 1000) / 1000;
}
export function indexFromLr(lr: number): number {
  return Math.round(lr / LR_STEP);
}
