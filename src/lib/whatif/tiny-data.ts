/**
 * What if the computer only gets three examples? A small, deterministic toy.
 * Dots of two groups, A and B, are scattered across a plane. The helper learns a rule from a few training dots:
 * it finds the middle of the A dots and the middle of the B dots (their averages) and draws a line halfway
 * between the two middles, at right angles to the line joining them. Dots on the B side are called B.
 * We repeat the learning 20 times with 20 different random sets of training dots of the same size,
 * and measure how much the 20 lines disagree. Every number on screen comes from here.
 */

export type Pt = { x: number; y: number; label: 0 | 1 };
/** A rule: call a dot B when a*x + b*y > c. */
export type Rule = { a: number; b: number; c: number };

export const LIM = 3.5;
export const SIZES = [3, 6, 10, 30, 100, 300] as const;
export const DRAWS = 20;
export const TEST_N = 600;
export const CENTRE_A = -1;
export const CENTRE_B = 1;
const SPREAD = 1;

function rng(seed: number): () => number {
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
  const u = Math.max(r(), 1e-12);
  return Math.round(Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()) * 1e6) / 1e6;
}
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const clip = (v: number) => Math.max(-LIM + 0.05, Math.min(LIM - 0.05, v));

/** The true world: group A is centred at (-1, -1), group B at (1, 1), each spread by 1 in both directions. */
function dot(label: 0 | 1, r: () => number): Pt {
  const m = label === 1 ? CENTRE_B : CENTRE_A;
  return { x: r3(clip(m + SPREAD * gauss(r))), y: r3(clip(m + SPREAD * gauss(r))), label };
}

/** n training dots for one draw. Labels alternate, starting with a seeded coin flip, so each group has at least one dot when n is 2 or more. */
export function trainDots(n: number, batch: number, draw: number): Pt[] {
  const r = rng(1000 * batch + 97 * draw + 13 * n + 5);
  const first = r() < 0.5 ? 0 : 1;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) out.push(dot(((i + first) % 2) as 0 | 1, r));
  return out;
}

export function testDots(): Pt[] {
  const r = rng(424242);
  const out: Pt[] = [];
  for (let i = 0; i < TEST_N; i++) out.push(dot((i % 2) as 0 | 1, r));
  return out;
}

/** Learn the rule: the line halfway between the average A dot and the average B dot, at right angles to the line joining them. */
export function learn(train: Pt[]): Rule {
  const mean = (l: 0 | 1) => {
    const g = train.filter((p) => p.label === l);
    return { x: g.reduce((s, p) => s + p.x, 0) / g.length, y: g.reduce((s, p) => s + p.y, 0) / g.length };
  };
  const A = mean(0);
  const B = mean(1);
  const a = B.x - A.x;
  const b = B.y - A.y;
  const c = a * ((A.x + B.x) / 2) + b * ((A.y + B.y) / 2);
  return { a, b, c };
}

/** The best straight rule for this world, which knows where the groups really are: x + y = 0. */
export const IDEAL: Rule = { a: 2, b: 2, c: 0 };

export const say = (rule: Rule, p: { x: number; y: number }): 0 | 1 => (rule.a * p.x + rule.b * p.y > rule.c ? 1 : 0);

export function accuracy(rule: Rule, tests: Pt[]): number {
  return tests.filter((p) => say(rule, p) === p.label).length / tests.length;
}

/** The direction of the rule's line in degrees, folded into -90 to 90 (a line has no front or back). Rounded to 0.1. */
export function lineAngle(rule: Rule): number {
  const deg = (Math.atan2(rule.a, -rule.b) * 180) / Math.PI; // direction of the line itself
  let d = ((deg % 180) + 180) % 180;
  if (d > 90) d -= 180;
  return Math.round(d * 10) / 10;
}

/** How far a rule's line is turned away from the ideal line, in degrees, 0 to 90. */
export function tilt(rule: Rule): number {
  let d = lineAngle(rule) - lineAngle(IDEAL);
  d = ((((d + 90) % 180) + 180) % 180) - 90;
  return Math.abs(Math.round(d * 10) / 10);
}

/** Where a rule's line crosses the plot box [-LIM, LIM]: two end points, or null if it misses the box. */
export function segment(rule: Rule): { x1: number; y1: number; x2: number; y2: number } | null {
  const { a, b, c } = rule;
  const pts: { x: number; y: number }[] = [];
  const eps = 1e-9;
  if (Math.abs(b) > eps) for (const x of [-LIM, LIM]) {
    const y = (c - a * x) / b;
    if (Math.abs(y) <= LIM + 1e-9) pts.push({ x, y });
  }
  if (Math.abs(a) > eps) for (const y of [-LIM, LIM]) {
    const x = (c - b * y) / a;
    if (Math.abs(x) <= LIM + 1e-9) pts.push({ x, y });
  }
  if (pts.length < 2) return null;
  let best: [number, number] = [0, 1];
  let bd = -1;
  for (let i = 0; i < pts.length; i++)
    for (let j = i + 1; j < pts.length; j++) {
      const d = (pts[i].x - pts[j].x) ** 2 + (pts[i].y - pts[j].y) ** 2;
      if (d > bd) {
        bd = d;
        best = [i, j];
      }
    }
  const p = pts[best[0]];
  const q = pts[best[1]];
  return { x1: Math.round(p.x * 100) / 100, y1: Math.round(p.y * 100) / 100, x2: Math.round(q.x * 100) / 100, y2: Math.round(q.y * 100) / 100 };
}

export type Run = {
  n: number;
  batch: number;
  /** the training dots of the first draw, to show on the plot */
  firstDots: Pt[];
  rules: Rule[];
  tilts: number[];
  accs: number[];
  /** typical tilt: the root mean square of the 20 tilts, degrees */
  rms: number;
  accMin: number;
  accMax: number;
  accMean: number;
};

export function run(n: number, batch: number): Run {
  const tests = testDots();
  const rules: Rule[] = [];
  let firstDots: Pt[] = [];
  for (let k = 0; k < DRAWS; k++) {
    const dots = trainDots(n, batch, k);
    if (k === 0) firstDots = dots;
    rules.push(learn(dots));
  }
  const tilts = rules.map(tilt);
  const accs = rules.map((r) => accuracy(r, tests));
  const rms = Math.sqrt(tilts.reduce((s, t) => s + t * t, 0) / tilts.length);
  return {
    n,
    batch,
    firstDots,
    rules,
    tilts,
    accs,
    rms: Math.round(rms * 10) / 10,
    accMin: Math.min(...accs),
    accMax: Math.max(...accs),
    accMean: accs.reduce((s, a) => s + a, 0) / accs.length,
  };
}

export const bestAccuracy = (): number => accuracy(IDEAL, testDots());
