/**
 * What if training data is fed in a fixed order, never shuffled?
 * A toy: softmax regression (a one-layer classifier) on three blobs of 2D points, trained by
 * minibatch SGD. Each class has PER_CLASS points; a batch holds BATCH points; one epoch is
 * 3 * PER_CLASS / BATCH steps. Two runs see exactly the same points the same number of times:
 *   'sorted'   : class 0 first, then class 1, then class 2, the same order every epoch;
 *   'shuffled' : a fresh seeded shuffle each epoch.
 * After every step the model is scored on ALL points, so the loss curve is the full-data loss, not the batch loss.
 */

export const CLASS_NAMES = ['A', 'B', 'C'] as const;
export const CENTERS: [number, number][] = [
  [-1.3, -0.7],
  [1.3, -0.7],
  [0, 1.4],
];
export const SPREAD = 1;
export const PER_CLASS = 60;
export const BATCH = 10;
export const EPOCHS = 3;
export const STEPS_PER_EPOCH = (3 * PER_CLASS) / BATCH; // 18
export const STEPS = EPOCHS * STEPS_PER_EPOCH; // 54
export const LR_MIN = 0.5;
export const LR_MAX = 3;
export const LR_STEP = 0.5;
export const DEFAULT_LR = 2;

export type Order = 'sorted' | 'shuffled';
export type Pt = { x: number; y: number; c: 0 | 1 | 2 };
/** Weights of the 3 classes: [weight on x, weight on y, bias]. */
export type Weights = [number, number, number][];

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(r: () => number): number {
  const u = 1 - r();
  const v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const r4 = (n: number) => Math.round(n * 1e4) / 1e4;
const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** The training points, already grouped by class (the "sorted" order). Fixed seed. */
export function makeData(): Pt[] {
  const r = mulberry32(1);
  const pts: Pt[] = [];
  for (let c = 0; c < 3; c++) {
    for (let i = 0; i < PER_CLASS; i++) {
      pts.push({ x: r4(CENTERS[c][0] + SPREAD * gauss(r)), y: r4(CENTERS[c][1] + SPREAD * gauss(r)), c: c as 0 | 1 | 2 });
    }
  }
  return pts;
}
const DATA = makeData();

/** Point indices for every step: steps[s] is the batch used at step s. */
export function batchPlan(order: Order): number[][] {
  const r = mulberry32(5);
  const plan: number[][] = [];
  for (let e = 0; e < EPOCHS; e++) {
    const idx = DATA.map((_, i) => i);
    if (order === 'shuffled') {
      for (let i = idx.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [idx[i], idx[j]] = [idx[j], idx[i]];
      }
    }
    for (let b = 0; b < STEPS_PER_EPOCH; b++) plan.push(idx.slice(b * BATCH, (b + 1) * BATCH));
  }
  return plan;
}

/** Share of each class inside every batch, e.g. [1, 0, 0] for an all-A batch. */
export function batchMix(order: Order): [number, number, number][] {
  return batchPlan(order).map((b) => {
    const n: [number, number, number] = [0, 0, 0];
    for (const i of b) n[DATA[i].c] += 1;
    return n.map((v) => v / BATCH) as [number, number, number];
  });
}

function softmax(z: number[]): number[] {
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp(v - m));
  const s = e[0] + e[1] + e[2];
  return e.map((v) => v / s);
}

const scores = (w: Weights, x: number, y: number) => w.map((k) => k[0] * x + k[1] * y + k[2]);

/** The class a model with weights w picks at (x, y). Ties go to the lowest index. */
export function predict(w: Weights, x: number, y: number): 0 | 1 | 2 {
  const s = scores(w, x, y);
  let k = 0;
  if (s[1] > s[k]) k = 1;
  if (s[2] > s[k]) k = 2;
  return k as 0 | 1 | 2;
}

export type Snapshot = {
  /** Average cross-entropy over all points. */
  loss: number;
  /** Share of all points classified correctly. */
  acc: number;
  /** Share of each class classified correctly. */
  recall: [number, number, number];
  /** Share of ALL points the model labels A, B, C. A fair model gives one third each. */
  share: [number, number, number];
  weights: Weights;
};

function snapshot(w: Weights): Snapshot {
  let L = 0;
  let right = 0;
  const hit = [0, 0, 0];
  const pred = [0, 0, 0];
  for (const d of DATA) {
    const p = softmax(scores(w, d.x, d.y));
    L -= Math.log(Math.max(p[d.c], 1e-12));
    const k = predict(w, d.x, d.y);
    pred[k]++;
    if (k === d.c) {
      right++;
      hit[d.c]++;
    }
  }
  const n = DATA.length;
  return {
    loss: r4(L / n),
    acc: r4(right / n),
    recall: hit.map((h) => r4(h / PER_CLASS)) as [number, number, number],
    share: pred.map((p) => r4(p / n)) as [number, number, number],
    weights: w.map((k) => k.map(r6)) as Weights,
  };
}

/** Train and return STEPS + 1 snapshots: index 0 is before any step. */
export function train(order: Order, lr: number): Snapshot[] {
  const plan = batchPlan(order);
  let w: Weights = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const out: Snapshot[] = [snapshot(w)];
  for (const batch of plan) {
    const g: number[][] = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    for (const i of batch) {
      const d = DATA[i];
      const p = softmax(scores(w, d.x, d.y));
      for (let c = 0; c < 3; c++) {
        const e = p[c] - (c === d.c ? 1 : 0);
        g[c][0] += (e * d.x) / BATCH;
        g[c][1] += (e * d.y) / BATCH;
        g[c][2] += e / BATCH;
      }
    }
    w = w.map((k, c) => k.map((v, j) => v - lr * g[c][j])) as Weights;
    out.push(snapshot(w));
  }
  return out;
}

/** The biggest one-step rise of the full-data loss over the whole run: how hard the curve lurches. */
export function biggestLurch(run: Snapshot[]): number {
  let m = 0;
  for (let i = 1; i < run.length; i++) m = Math.max(m, run[i].loss - run[i - 1].loss);
  return r4(m);
}

/** How many steps made the full-data loss go UP. */
export function stepsGoingUp(run: Snapshot[]): number {
  let n = 0;
  for (let i = 1; i < run.length; i++) if (run[i].loss > run[i - 1].loss + 1e-9) n++;
  return n;
}

/** The step (1-based epoch end) numbers where an epoch finishes. */
export const EPOCH_ENDS = [1, 2, 3].map((e) => e * STEPS_PER_EPOCH);

export const lrFromIndex = (i: number) => Math.round(i * LR_STEP * 100) / 100;
export const indexFromLr = (lr: number) => Math.round(lr / LR_STEP);
