/**
 * Three optimisers racing down a 2D loss "ravine", for the lesson "Training deep networks".
 * The landscape is a long, narrow valley tilted at an angle: steep walls, a gentle floor
 * that slopes towards the minimum. Plain gradient descent zig-zags across the valley and
 * crawls along it; momentum and Adam are two different cures. Everything is deterministic.
 */

export type OptimiserId = 'sgd' | 'momentum' | 'adam';
export type Vec = [number, number];

/** The valley: curvature along it, curvature across it, and the tilt in radians. */
export const RAVINE = { along: 1, across: 100, tilt: 0.5, start: [-3.9, -1.2] as Vec };
export const GOAL = 0.01; // "arrived" means the loss is below this
export const MAX_STEPS = 300;

const c = Math.cos(RAVINE.tilt);
const s = Math.sin(RAVINE.tilt);

/** Rotate a point into valley coordinates: u along the floor, v across it. */
function toValley(x: number, y: number): Vec {
  return [c * x + s * y, -s * x + c * y];
}

export function lossAt(x: number, y: number): number {
  const [u, v] = toValley(x, y);
  return 0.5 * (RAVINE.along * u * u + RAVINE.across * v * v);
}

export function gradAt(x: number, y: number): Vec {
  const [u, v] = toValley(x, y);
  const gu = RAVINE.along * u;
  const gv = RAVINE.across * v;
  return [c * gu - s * gv, s * gu + c * gv];
}

export type Settings = Record<OptimiserId, number>;
/** Learning rates the race starts with. Each optimiser's own sensible range differs, so each gets its own. */
export const DEFAULT_RATES: Settings = { sgd: 0.01, momentum: 0.01, adam: 0.3 };

/** The learning rates the sliders offer (a log-spaced list). */
export const RATE_STOPS = [0.001, 0.002, 0.005, 0.01, 0.02, 0.03, 0.05, 0.08, 0.12, 0.2, 0.3, 0.5, 0.8];

export type Run = {
  id: OptimiserId;
  lr: number;
  /** Position after each step; index 0 is the start. */
  path: Vec[];
  /** Loss after each step. */
  losses: number[];
  /** First step at which the loss was below GOAL, or null. */
  reached: number | null;
  diverged: boolean;
};

/** Run one optimiser from the start for up to `steps` steps. It stops early if it blows up. */
export function simulate(id: OptimiserId, lr: number, steps = MAX_STEPS): Run {
  let [x, y] = RAVINE.start;
  const path: Vec[] = [[x, y]];
  const losses = [lossAt(x, y)];
  let reached: number | null = losses[0] < GOAL ? 0 : null;
  let diverged = false;
  // optimiser state
  let vx = 0;
  let vy = 0; // momentum's velocity, or Adam's first moment
  let sx = 0;
  let sy = 0; // Adam's second moment
  const b1 = 0.9;
  const b2 = 0.999;
  for (let t = 1; t <= steps; t++) {
    const [gx, gy] = gradAt(x, y);
    if (id === 'sgd') {
      x -= lr * gx;
      y -= lr * gy;
    } else if (id === 'momentum') {
      vx = b1 * vx + gx;
      vy = b1 * vy + gy;
      x -= lr * vx;
      y -= lr * vy;
    } else {
      vx = b1 * vx + (1 - b1) * gx;
      vy = b1 * vy + (1 - b1) * gy;
      sx = b2 * sx + (1 - b2) * gx * gx;
      sy = b2 * sy + (1 - b2) * gy * gy;
      const m1 = 1 - Math.pow(b1, t);
      const m2 = 1 - Math.pow(b2, t);
      x -= (lr * (vx / m1)) / (Math.sqrt(sx / m2) + 1e-8);
      y -= (lr * (vy / m1)) / (Math.sqrt(sy / m2) + 1e-8);
    }
    const l = lossAt(x, y);
    if (!Number.isFinite(l) || l > 1e4) {
      diverged = true;
      break;
    }
    path.push([x, y]);
    losses.push(l);
    if (reached === null && l < GOAL) reached = t;
  }
  return { id, lr, path, losses, reached, diverged };
}

/** Points of one contour of the loss (an ellipse), for drawing the valley. */
export function contour(level: number, n = 72): Vec[] {
  const a = Math.sqrt((2 * level) / RAVINE.along);
  const b = Math.sqrt((2 * level) / RAVINE.across);
  return Array.from({ length: n + 1 }, (_, k) => {
    const th = (k / n) * Math.PI * 2;
    const u = a * Math.cos(th);
    const v = b * Math.sin(th);
    return [c * u - s * v, s * u + c * v] as Vec;
  });
}
