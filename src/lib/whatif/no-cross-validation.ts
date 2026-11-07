/**
 * What if we trust a single train/test split? A small, deterministic example.
 * A toy dataset of two measurements per row and two overlapping classes. The model is 5-nearest-neighbours.
 * We score it many ways on the same rows: 20 different random 80/20 splits (what one person would do once),
 * and 20 different random shuffles of 5-fold cross-validation (every row is tested exactly once per shuffle).
 * A big pool of fresh rows from the same recipe gives the "real" accuracy to compare against. All numbers come from here.
 */

export const K = 5;
export const FOLDS = 5;
export const REPEATS = 20;
export const MIN_ROWS = 30;
export const MAX_ROWS = 160;
export const DEFAULT_ROWS = 60;
export const FRESH_ROWS = 600;

export type Row = { x: number; y: number; label: 0 | 1 };

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

/** Seeded rows. Taking the first n of a longer list gives the same rows, so the data only grows as you add rows. */
export function makeRows(n: number, seed = 5): Row[] {
  const r = rng(seed);
  const rows: Row[] = [];
  for (let i = 0; i < n; i++) {
    const label = (r() < 0.5 ? 0 : 1) as 0 | 1;
    const m = label === 1 ? 0.5 : -0.5;
    rows.push({
      x: Math.round((m + gauss(r)) * 1000) / 1000,
      y: Math.round((m + gauss(r)) * 1000) / 1000,
      label,
    });
  }
  return rows;
}

/** Vote of the k closest training rows. k is odd, so there are no ties. */
export function predict(train: Row[], q: Row, k = K): 0 | 1 {
  const ds = train.map((t, i) => ({
    i,
    d: (t.x - q.x) ** 2 + (t.y - q.y) ** 2,
  }));
  ds.sort((a, b) => a.d - b.d || a.i - b.i);
  let ones = 0;
  for (let j = 0; j < Math.min(k, ds.length); j++) ones += train[ds[j].i].label;
  return ones * 2 > Math.min(k, ds.length) ? 1 : 0;
}

export function shuffled(n: number, seed: number): number[] {
  const r = rng(seed);
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type Scored = { test: number[]; correct: boolean[]; accuracy: number };

function scoreRows(rows: Row[], testIdx: number[]): Scored {
  const test = new Set(testIdx);
  const train = rows.filter((_, i) => !test.has(i));
  const correct = testIdx.map((i) => predict(train, rows[i]) === rows[i].label);
  return {
    test: testIdx,
    correct,
    accuracy: correct.filter(Boolean).length / testIdx.length,
  };
}

/** One random 80/20 split: 20% of the rows (rounded) are the test set. */
export function holdout(rows: Row[], seed: number): Scored {
  const nTest = Math.round(rows.length * 0.2);
  return scoreRows(
    rows,
    shuffled(rows.length, seed)
      .slice(0, nTest)
      .sort((a, b) => a - b),
  );
}

/** 5-fold cross-validation for one shuffle: five scores, one per fold, and their average. */
export function crossValidate(
  rows: Row[],
  seed: number,
): { folds: Scored[]; mean: number } {
  const order = shuffled(rows.length, seed);
  const folds: Scored[] = [];
  for (let f = 0; f < FOLDS; f++) {
    const idx = order.filter((_, p) => p % FOLDS === f).sort((a, b) => a - b);
    folds.push(scoreRows(rows, idx));
  }
  return { folds, mean: folds.reduce((s, x) => s + x.accuracy, 0) / FOLDS };
}

export const mean = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
/** Sample standard deviation (divides by n - 1). */
export const sd = (v: number[]) => {
  const m = mean(v);
  return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
};

export type Study = {
  single: number[];
  cvMeans: number[];
  /** accuracy of models trained on 80% of the rows, measured on fresh rows: what you would really get */
  truth: number;
};

const SEED_BASE = 1000;
export const splitSeed = (i: number) => SEED_BASE + i;

/** The 20 single splits, the 20 cross-validation shuffles, and the real accuracy. i runs from 0 to 19. */
export function study(rows: Row[]): Study {
  const single: number[] = [];
  const cvMeans: number[] = [];
  const fresh = makeRows(FRESH_ROWS, 99_991);
  let truth = 0;
  for (let i = 0; i < REPEATS; i++) {
    single.push(holdout(rows, splitSeed(i)).accuracy);
    cvMeans.push(crossValidate(rows, splitSeed(i)).mean);
    const test = new Set(
      shuffled(rows.length, splitSeed(i)).slice(
        0,
        Math.round(rows.length * 0.2),
      ),
    );
    const train = rows.filter((_, j) => !test.has(j));
    truth +=
      fresh.filter((q) => predict(train, q) === q.label).length / fresh.length;
  }
  return { single, cvMeans, truth: truth / REPEATS };
}
