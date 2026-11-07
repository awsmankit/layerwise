/**
 * What if the training data does not look like the people who use it? A TOY one-number model.
 * Each person has a signal x. The model says "yes" when x is above a cut-off it learns from its training mix.
 * In group A the true answer flips around x = 0. In group B the same signal means something a little different:
 * the answer flips around x = 1 (think of an accent, a lighting condition or a skin tone changing what the sensor sees).
 * All settings are made up for the demo. Accuracy is computed on a fine grid, so it needs no random numbers.
 */

export const BOUNDARY = { A: 0, B: 1.0 } as const;
/** How sharply the true answer flips around the boundary. */
export const SHARPNESS = 5;
/** Example share of real users who belong to group B. */
export const USER_SHARE_B = 0.3;

const STEP = 0.01;
const LO = -5;
const HI = 6;
const N = Math.round((HI - LO) / STEP) + 1;

const xs: number[] = Array.from({ length: N }, (_, i) => Math.round((LO + i * STEP) * 100) / 100);

type Prefix = { pos: number[]; neg: number[] };

function build(boundary: number): Prefix {
  // mass of "true yes" and "true no" at each x, for people whose signal is spread like a bell curve
  const mass = xs.map((x) => Math.exp(-(x * x) / 2));
  const total = mass.reduce((a, b) => a + b, 0);
  const pos: number[] = [0];
  const neg: number[] = [0];
  xs.forEach((x, i) => {
    const p = 1 / (1 + Math.exp(-SHARPNESS * (x - boundary)));
    const w = mass[i] / total;
    pos.push(pos[i] + w * p);
    neg.push(neg[i] + w * (1 - p));
  });
  return { pos, neg };
}

const table: Record<'A' | 'B', Prefix> = { A: build(BOUNDARY.A), B: build(BOUNDARY.B) };

/** Share of a group the model gets wrong with the cut-off at xs[index]: true yes below it, true no above it. */
function errorAt(g: 'A' | 'B', index: number): number {
  const t = table[g];
  const posBelow = t.pos[index];
  const negAbove = t.neg[N] - t.neg[index];
  return posBelow + negAbove;
}

const round4 = (v: number) => Math.round(v * 10000) / 10000;

/** The cut-off that minimises training error when a share `f` (0 to 1) of the training data comes from group B. */
export function learnedCutoff(f: number): number {
  let best = 0;
  let bestErr = Infinity;
  for (let i = 0; i < N; i++) {
    const e = (1 - f) * errorAt('A', i) + f * errorAt('B', i);
    if (e < bestErr - 1e-12) {
      bestErr = e;
      best = i;
    }
  }
  return xs[best];
}

export function accuracyAt(group: 'A' | 'B', cutoff: number): number {
  const i = Math.min(N, Math.max(0, Math.round((cutoff - LO) / STEP)));
  return round4(1 - errorAt(group, i));
}

export type Point = { f: number; cutoff: number; accA: number; accB: number; gap: number; users: number };

export function atShare(fPct: number): Point {
  const f = fPct / 100;
  const cutoff = learnedCutoff(f);
  const accA = accuracyAt('A', cutoff);
  const accB = accuracyAt('B', cutoff);
  return {
    f: fPct,
    cutoff: Math.round(cutoff * 100) / 100,
    accA,
    accB,
    gap: round4(accA - accB),
    users: round4((1 - USER_SHARE_B) * accA + USER_SHARE_B * accB),
  };
}

export const CURVE_STEP = 5;
const cache: Point[] = [];
/** The whole curve at 0, 5, ..., 100 percent of group B in the training data. */
export function curve(): Point[] {
  if (cache.length === 0) for (let p = 0; p <= 100; p += CURVE_STEP) cache.push(atShare(p));
  return cache;
}

/** The share of group B in training (whole percent, steps of CURVE_STEP) that gives the best accuracy on the example users. */
export function bestShareForUsers(): number {
  let best = curve()[0];
  for (const p of curve()) if (p.users > best.users + 1e-9) best = p;
  return best.f;
}

/** Training mix as dots: `true` is a group B example. 100 dots, B ones spread evenly. */
export function mixDots(fPct: number): boolean[] {
  const out: boolean[] = [];
  for (let i = 0; i < 100; i++) out.push(Math.floor(((i + 1) * fPct) / 100) > Math.floor((i * fPct) / 100));
  return out;
}
