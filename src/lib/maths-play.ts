/** Pure helpers behind the "Maths without fear" lesson: arrows, matrices, slopes and natural frequencies. */

export type V2 = [number, number];
export type M2 = [[number, number], [number, number]];

export const dot = (a: V2, b: V2): number => a[0] * b[0] + a[1] * b[1];
export const norm = (a: V2): number => Math.hypot(a[0], a[1]);

/** Cosine of the angle between two arrows, or null if either has no length. */
export function cosine(a: V2, b: V2): number | null {
  const d = norm(a) * norm(b);
  return d === 0 ? null : dot(a, b) / d;
}

export function angleDeg(a: V2, b: V2): number | null {
  const c = cosine(a, b);
  if (c === null) return null;
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
}

/** A plain-words verdict on the cosine, used under the arrow playground. */
export function agreement(c: number | null): string {
  if (c === null) return 'One arrow has no length, so it points nowhere.';
  if (c > 0.995) return 'They point almost exactly the same way.';
  if (c > 0.7) return 'They mostly point the same way.';
  if (c > 0.2) return 'They point a little the same way.';
  if (c >= -0.2) return 'They are about at right angles, so they share almost nothing.';
  if (c >= -0.7) return 'They point a little in opposite directions.';
  if (c >= -0.995) return 'They mostly point in opposite directions.';
  return 'They point in exactly opposite directions.';
}

export const applyM = (m: M2, v: V2): V2 => [m[0][0] * v[0] + m[0][1] * v[1], m[1][0] * v[0] + m[1][1] * v[1]];
export const det = (m: M2): number => m[0][0] * m[1][1] - m[0][1] * m[1][0];

/** Chain two machines: first `b`, then `a` (that is the matrix product a x b). */
export function matMul(a: M2, b: M2): M2 {
  return [
    [a[0][0] * b[0][0] + a[0][1] * b[1][0], a[0][0] * b[0][1] + a[0][1] * b[1][1]],
    [a[1][0] * b[0][0] + a[1][1] * b[1][0], a[1][0] * b[0][1] + a[1][1] * b[1][1]],
  ];
}

export type Preset = { id: string; label: string; m: M2; blurb: string };

export const PRESETS: Preset[] = [
  { id: 'same', label: 'Do nothing', m: [[1, 0], [0, 1]], blurb: 'Every arrow stays where it is. This is the identity machine.' },
  { id: 'stretch', label: 'Stretch', m: [[2, 0], [0, 1]], blurb: 'Everything is pulled twice as far sideways. Up and down stay the same.' },
  { id: 'flip', label: 'Mirror', m: [[-1, 0], [0, 1]], blurb: 'Left and right swap, like a mirror standing on the up-down line.' },
  { id: 'turn', label: 'Turn 90 degrees', m: [[0, -1], [1, 0]], blurb: 'Everything turns a quarter turn anticlockwise. Shapes keep their size.' },
  { id: 'shear', label: 'Slant', m: [[1, 1], [0, 1]], blurb: 'The top slides sideways while the bottom stays put, like pushing a deck of cards.' },
  { id: 'squash', label: 'Squash flat', m: [[1, 1], [1, 1]], blurb: 'The whole grid collapses onto one line. Information is lost, and you cannot undo it.' },
];

/** Grid lines of the plane after a matrix, as polylines of two points, for x and y from -n to n. */
export function gridLines(m: M2, n: number): { from: V2; to: V2; axis: boolean }[] {
  const out: { from: V2; to: V2; axis: boolean }[] = [];
  for (let k = -n; k <= n; k++) {
    out.push({ from: applyM(m, [k, -n]), to: applyM(m, [k, n]), axis: k === 0 });
    out.push({ from: applyM(m, [-n, k]), to: applyM(m, [n, k]), axis: k === 0 });
  }
  return out;
}

/* ---------- slopes ---------- */

export type Curve = {
  id: string;
  label: string;
  f: (x: number) => number;
  df: (x: number) => number;
  domain: [number, number];
  start: number;
  note: string;
};

export const CURVES: Curve[] = [
  {
    id: 'bowl',
    label: 'Smooth bowl',
    f: (x) => (x - 3) ** 2 / 4 + 1,
    df: (x) => (x - 3) / 2,
    domain: [0, 6],
    start: 0.5,
    note: 'One valley. Following the downhill direction always ends at the bottom.',
  },
  {
    id: 'hills',
    label: 'Bumpy hills',
    f: (x) => 0.05 * (x * x - 4) ** 2 - 0.3 * x + 2,
    df: (x) => 0.2 * x * (x * x - 4) - 0.3,
    domain: [-3.5, 3.5],
    start: -3,
    note: 'Two valleys. Where you start decides which one you reach, and the shallow one is not the lowest.',
  },
];

/** The slope by nudging: how much the height changes for a tiny sideways move, divided by the move. */
export function nudgeSlope(f: (x: number) => number, x: number, h = 1e-4): number {
  return (f(x + h) - f(x - h)) / (2 * h);
}

export function slopeWords(s: number): string {
  if (Math.abs(s) < 0.03) return 'flat: you are at the bottom of a valley or the top of a hill';
  return s > 0 ? 'uphill to the right, so downhill is to the left' : 'downhill to the right';
}

/** One downhill step: move against the slope, scaled by a step size. Stops at the edges of the picture. */
export function descentStep(c: Curve, x: number, stepSize: number): { x: number; offEdge: boolean } {
  const next = x - stepSize * c.df(x);
  const [lo, hi] = c.domain;
  if (next < lo || next > hi) return { x: Math.max(lo, Math.min(hi, next)), offEdge: true };
  return { x: next, offEdge: false };
}

export function descentPath(c: Curve, x0: number, stepSize: number, steps: number): number[] {
  const path = [x0];
  let x = x0;
  for (let i = 0; i < steps; i++) {
    const r = descentStep(c, x, stepSize);
    x = r.x;
    path.push(x);
    if (r.offEdge) break;
  }
  return path;
}

/* ---------- chain rule ---------- */

/** Slope of g(f(x)) as the product of the two local slopes. */
export const chainSlope = (dfAtX: number, dgAtFx: number): number => dfAtX * dgAtFx;

/* ---------- probability by counting ---------- */

export type Counts = { total: number; cheats: number; honest: number; caught: number; missed: number; falseAlarms: number; clear: number; flagged: number; chance: number | null };

/**
 * Natural frequencies: out of `total` people, how many fall in each box.
 * Counts are rounded to whole people, so they are "about" numbers.
 */
export function naturalFrequencies(total: number, rate: number, hitRate: number, falseAlarmRate: number): Counts {
  const cheats = Math.round(total * rate);
  const honest = total - cheats;
  const caught = Math.round(cheats * hitRate);
  const missed = cheats - caught;
  const falseAlarms = Math.round(honest * falseAlarmRate);
  const clear = honest - falseAlarms;
  const flagged = caught + falseAlarms;
  return { total, cheats, honest, caught, missed, falseAlarms, clear, flagged, chance: flagged === 0 ? null : caught / flagged };
}
