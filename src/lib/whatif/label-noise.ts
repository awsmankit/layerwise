/**
 * What if some of the labels are wrong? A small, deterministic example.
 * Two overlapping groups of points in the plane. Some training labels are flipped on purpose (a seeded, nested
 * choice: the points flipped at 10% are all still flipped at 20%). Three models learn from the noisy labels and are
 * scored on clean test points whose labels are right:
 *  - a straight line (logistic regression trained by gradient descent),
 *  - a memoriser (1-nearest-neighbour),
 *  - a smoother (15-nearest-neighbours).
 * Every number on screen comes from here.
 */

export type Pt = { x: number; y: number; label: 0 | 1 };
export type ModelId = "line" | "memoriser" | "smoother";

export const MODELS: { id: ModelId; name: string; short: string }[] = [
  { id: "line", name: "Straight line", short: "line" },
  { id: "smoother", name: "15 neighbours", short: "15-NN" },
  { id: "memoriser", name: "Memoriser (1 neighbour)", short: "1-NN" },
];

export const SIZES = [60, 600] as const;
export const NOISE_STEPS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45];
export const TEST_ROWS = 500;
export const LIM = 3;
export const GRID = 28;

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
  return (
    Math.round(
      Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()) * 1e9,
    ) / 1e9
  ); // rounded so Node and the browser agree
}

/** Two groups, centred at (-0.8, -0.8) and (0.8, 0.8), each point spread by 1.0 in both directions. */
export function makePoints(n: number, seed: number): Pt[] {
  const r = rng(seed);
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const label = (i % 2) as 0 | 1;
    const m = label === 1 ? 0.8 : -0.8;
    const clip = (v: number) => Math.max(-LIM + 0.05, Math.min(LIM - 0.05, v));
    pts.push({
      x: Math.round(clip(m + gauss(r)) * 1000) / 1000,
      y: Math.round(clip(m + gauss(r)) * 1000) / 1000,
      label,
    });
  }
  // shuffle so that "first n" is not strictly alternating
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [pts[i], pts[j]] = [pts[j], pts[i]];
  }
  return pts;
}

export const trainSet = (n: number) => makePoints(n, 314);
export const testSet = () => makePoints(TEST_ROWS, 2718);

/** Which training rows have a wrong label at this share (0 to 100): the first round(share% of n) in a fixed seeded order. */
export function flippedSet(n: number, percent: number): Set<number> {
  const r = rng(77 + n);
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return new Set(order.slice(0, Math.round((n * percent) / 100)));
}

/** The labels the model is shown. */
export function noisyLabels(train: Pt[], flipped: Set<number>): (0 | 1)[] {
  return train.map((p, i) =>
    flipped.has(i) ? ((1 - p.label) as 0 | 1) : p.label,
  );
}

export type Predictor = (x: number, y: number) => 0 | 1;

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/** Logistic regression trained by plain gradient descent (400 steps, step size 0.5) from all-zero weights. */
export function fitLine(
  train: Pt[],
  labels: (0 | 1)[],
): { w: [number, number]; b: number } {
  let w0 = 0;
  let w1 = 0;
  let b = 0;
  const n = train.length;
  for (let s = 0; s < 400; s++) {
    let g0 = 0;
    let g1 = 0;
    let gb = 0;
    for (let i = 0; i < n; i++) {
      const e = sigmoid(w0 * train[i].x + w1 * train[i].y + b) - labels[i];
      g0 += e * train[i].x;
      g1 += e * train[i].y;
      gb += e;
    }
    w0 -= (0.5 * g0) / n;
    w1 -= (0.5 * g1) / n;
    b -= (0.5 * gb) / n;
  }
  return { w: [w0, w1], b };
}

function knnVote(
  train: Pt[],
  labels: (0 | 1)[],
  x: number,
  y: number,
  k: number,
): 0 | 1 {
  // keep the k smallest squared distances with a short insertion list
  const bestD: number[] = [];
  const bestL: number[] = [];
  for (let i = 0; i < train.length; i++) {
    const d = (train[i].x - x) ** 2 + (train[i].y - y) ** 2;
    if (bestD.length < k || d < bestD[bestD.length - 1]) {
      let p = bestD.length;
      while (p > 0 && bestD[p - 1] > d) p--;
      bestD.splice(p, 0, d);
      bestL.splice(p, 0, labels[i]);
      if (bestD.length > k) {
        bestD.pop();
        bestL.pop();
      }
    }
  }
  const ones = bestL.reduce((s, l) => s + l, 0);
  return ones * 2 > bestL.length ? 1 : 0;
}

export function fit(model: ModelId, train: Pt[], labels: (0 | 1)[]): Predictor {
  if (model === "line") {
    const { w, b } = fitLine(train, labels);
    return (x, y) => (w[0] * x + w[1] * y + b > 0 ? 1 : 0);
  }
  const k = model === "memoriser" ? 1 : 15;
  return (x, y) => knnVote(train, labels, x, y, k);
}

/** Accuracy against the TRUE labels of the clean test points. */
export function cleanAccuracy(pred: Predictor, test: Pt[] = testSet()): number {
  let right = 0;
  for (const t of test) if (pred(t.x, t.y) === t.label) right++;
  return right / test.length;
}

/** What the best possible rule (the line x + y = 0) scores on the same clean test points. */
export function ceiling(test: Pt[] = testSet()): number {
  return (
    test.filter((t) => (t.x + t.y > 0 ? 1 : 0) === t.label).length / test.length
  );
}

/** Predicted class for each cell of a GRID x GRID map (row 0 is the top, y = +LIM). */
export function gridMap(pred: Predictor): (0 | 1)[] {
  const out: (0 | 1)[] = [];
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const x = -LIM + ((c + 0.5) / GRID) * 2 * LIM;
      const y = LIM - ((r + 0.5) / GRID) * 2 * LIM;
      out.push(pred(x, y));
    }
  }
  return out;
}

export type Run = { model: ModelId; accuracy: number; map: (0 | 1)[] };

/** Train one model on n rows with this share (percent) of wrong labels, then score it on clean data. */
export function run(
  model: ModelId,
  n: number,
  percent: number,
  withMap = true,
): Run {
  const train = trainSet(n);
  const labels = noisyLabels(train, flippedSet(n, percent));
  const pred = fit(model, train, labels);
  return {
    model,
    accuracy: cleanAccuracy(pred),
    map: withMap ? gridMap(pred) : [],
  };
}

/** Clean-test accuracy of one model at every noise step. */
export function curve(model: ModelId, n: number): number[] {
  return NOISE_STEPS.map((p) => run(model, n, p, false).accuracy);
}

/** Share of grid cells where two maps disagree: how far the boundary moved. */
export function mapChange(a: (0 | 1)[], b: (0 | 1)[]): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d / a.length;
}
