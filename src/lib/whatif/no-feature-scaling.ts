/**
 * What if we do not scale the features? A small, deterministic example.
 * Each row is a customer with two numbers: yearly income in dollars (tens of thousands) and a repayment ratio
 * (between 0 and 1). The label says whether they paid on time. The ratio is the strong clue; income is a weak one.
 * Two models are run on the same rows:
 *  - k-nearest-neighbours (vote of the k closest training rows), with and without standardising the features;
 *  - linear regression trained by gradient descent, whose loss bowl is stretched when features are not scaled.
 * Every number on screen comes from here.
 */

export const N_TRAIN = 140;
export const N_TEST = 60;
export const K = 7;
/** The most gradient descent steps we are willing to simulate while looking for the 1% mark. */
export const MAX_STEPS = 1_000_000;

export type Row = { income: number; ratio: number; label: 0 | 1 };

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

/** Seeded toy rows, split into training and test. Classes alternate so both sides are balanced. */
export function makeData(seed = 3): { train: Row[]; test: Row[] } {
  const r = rng(seed);
  const rows: Row[] = [];
  for (let i = 0; i < N_TRAIN + N_TEST; i++) {
    const label = (i % 2) as 0 | 1;
    const income = Math.max(8000, 52000 + 9000 * label + 20000 * gauss(r));
    const ratio = Math.min(
      1,
      Math.max(0, 0.32 + 0.3 * label + 0.12 * gauss(r)),
    );
    rows.push({
      income: Math.round(income),
      ratio: Math.round(ratio * 1000) / 1000,
      label,
    });
  }
  // a seeded shuffle so the test rows are not simply the last ones
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
  return { train: rows.slice(0, N_TRAIN), test: rows.slice(N_TRAIN) };
}

export type Scaler = { mi: number; si: number; mr: number; sr: number };

/** Mean and spread (standard deviation) of each feature, from the training rows only. */
export function fitScaler(train: Row[]): Scaler {
  const n = train.length;
  const mi = train.reduce((s, t) => s + t.income, 0) / n;
  const mr = train.reduce((s, t) => s + t.ratio, 0) / n;
  const si = Math.sqrt(train.reduce((s, t) => s + (t.income - mi) ** 2, 0) / n);
  const sr = Math.sqrt(train.reduce((s, t) => s + (t.ratio - mr) ** 2, 0) / n);
  return { mi, si, mr, sr };
}

/** The two coordinates the model measures distance in. Raw: as they are. Scaled: in units of one standard deviation. */
export function coords(
  row: Row,
  sc: Scaler | null,
  incomeUnit = 1,
): [number, number] {
  return sc
    ? [(row.income - sc.mi) / sc.si, (row.ratio - sc.mr) / sc.sr]
    : [row.income / incomeUnit, row.ratio];
}

export function dist(
  a: Row,
  b: Row,
  sc: Scaler | null,
  incomeUnit = 1,
): number {
  const [ax, ay] = coords(a, sc, incomeUnit);
  const [bx, by] = coords(b, sc, incomeUnit);
  return Math.hypot(ax - bx, ay - by);
}

export type Neighbourhood = {
  idx: number[];
  radius: number;
  vote: 0 | 1;
  incomeShare: number;
};

/** The k closest training rows to q (ties go to the earlier row), their vote, the radius of the ball, and how much of the squared distance came from income. */
export function neighbours(
  train: Row[],
  q: Row,
  sc: Scaler | null,
  k = K,
  incomeUnit = 1,
): Neighbourhood {
  const ds = train.map((t, i) => ({ i, d: dist(t, q, sc, incomeUnit) }));
  ds.sort((a, b) => a.d - b.d || a.i - b.i);
  const top = ds.slice(0, k);
  const ones = top.filter((t) => train[t.i].label === 1).length;
  let inc = 0;
  let tot = 0;
  for (const t of top) {
    const [ax, ay] = coords(train[t.i], sc, incomeUnit);
    const [bx, by] = coords(q, sc, incomeUnit);
    inc += (ax - bx) ** 2;
    tot += (ax - bx) ** 2 + (ay - by) ** 2;
  }
  return {
    idx: top.map((t) => t.i),
    radius: top[k - 1].d,
    vote: ones * 2 > k ? 1 : 0,
    incomeShare: tot === 0 ? 0 : inc / tot,
  };
}

export function accuracy(
  train: Row[],
  test: Row[],
  scaled: boolean,
  k = K,
  incomeUnit = 1,
): number {
  const sc = scaled ? fitScaler(train) : null;
  let right = 0;
  for (const q of test)
    if (neighbours(train, q, sc, k, incomeUnit).vote === q.label) right++;
  return right / test.length;
}

/** Accuracy with no scaling when income is written in different units. Nothing about the customers changes. */
export function unitSweep(
  train: Row[],
  test: Row[],
  units = [1, 1000, 10000, 100000],
): { unit: number; accuracy: number }[] {
  return units.map((unit) => ({
    unit,
    accuracy: accuracy(train, test, false, K, unit),
  }));
}

/** The first test row that unscaled kNN gets wrong and standardised kNN gets right: a good one to look at first. */
export function showcaseQuery(train: Row[], test: Row[]): number {
  const sc = fitScaler(train);
  const i = test.findIndex(
    (q) =>
      neighbours(train, q, null).vote !== q.label &&
      neighbours(train, q, sc).vote === q.label,
  );
  return i < 0 ? 0 : i;
}

/* ---------- gradient descent on a linear model ---------- */

export type Bowl = {
  /** eigenvalues of the loss curvature, largest first */
  lambda: [number, number];
  /** how many times longer the loss bowl is than it is wide: sqrt(lambda1 / lambda2) */
  stretch: number;
  /** angle (radians) of the long direction of the bowl in weight space, from the first weight axis */
  angle: number;
  /** the best weights */
  best: [number, number];
  /** the curvature matrix [[a, b], [b, c]] */
  h: [number, number, number];
};

/**
 * Linear regression of the label on the two (centred) features, squared error loss.
 * Loss(w) = L* + (w - w*)^T (H / 2) (w - w*), with H = (2 / n) X^T X. Returns H's shape and the best weights.
 */
export function bowl(train: Row[], scaled: boolean): Bowl {
  const sc = fitScaler(train);
  const n = train.length;
  const X = train.map((t) =>
    scaled
      ? coords(t, sc)
      : ([t.income - sc.mi, t.ratio - sc.mr] as [number, number]),
  );
  const my = train.reduce((s, t) => s + t.label, 0) / n;
  let a = 0;
  let b = 0;
  let c = 0;
  let p = 0;
  let q = 0;
  X.forEach(([x1, x2], i) => {
    a += x1 * x1;
    b += x1 * x2;
    c += x2 * x2;
    p += x1 * (train[i].label - my);
    q += x2 * (train[i].label - my);
  });
  const det = a * c - b * b;
  const best: [number, number] = [(c * p - b * q) / det, (a * q - b * p) / det];
  const h: [number, number, number] = [(2 * a) / n, (2 * b) / n, (2 * c) / n];
  const tr = h[0] + h[2];
  const disc = Math.sqrt(((h[0] - h[2]) / 2) ** 2 + h[1] ** 2);
  const l1 = tr / 2 + disc;
  const l2 = tr / 2 - disc;
  const angle = 0.5 * Math.atan2(2 * h[1], h[0] - h[2]);
  return { lambda: [l1, l2], stretch: Math.sqrt(l1 / l2), angle, best, h };
}

export type Descent = {
  /** share of the starting excess loss still left after each step (starts at 1) */
  remaining: number[];
  /** steps needed to get the excess loss under 1% of where it started, or null if not reached in maxSteps */
  stepsTo1pct: number | null;
};

/**
 * Plain gradient descent from the all-zero weights with the largest step size that is safe (1 / largest curvature).
 * A bigger step makes the steep direction diverge. Runs on the exact quadratic loss of the bowl.
 */
export function descend(
  bw: Bowl,
  recordSteps = 200,
  maxSteps = MAX_STEPS,
): Descent {
  const [h11, h12, h22] = bw.h;
  const lr = 1 / bw.lambda[0];
  let w1 = 0;
  let w2 = 0;
  const excess = (x: number, y: number) => {
    const d1 = x - bw.best[0];
    const d2 = y - bw.best[1];
    return 0.5 * (h11 * d1 * d1 + 2 * h12 * d1 * d2 + h22 * d2 * d2);
  };
  const start = excess(0, 0);
  const remaining = [1];
  let stepsTo1pct: number | null = null;
  for (let s = 1; s <= maxSteps; s++) {
    const d1 = w1 - bw.best[0];
    const d2 = w2 - bw.best[1];
    w1 -= lr * (h11 * d1 + h12 * d2);
    w2 -= lr * (h12 * d1 + h22 * d2);
    const rem = excess(w1, w2) / start;
    if (s <= recordSteps) remaining.push(rem);
    if (stepsTo1pct === null && rem < 0.01) {
      stepsTo1pct = s;
      if (s >= recordSteps) break;
    }
    if (s >= recordSteps && stepsTo1pct !== null) break;
  }
  return { remaining, stepsTo1pct };
}

/** Average ratio of the customers who paid on time and of those who paid late (training rows). */
export function ratioMeans(train: Row[]): { onTime: number; late: number } {
  const mean = (label: 0 | 1) => {
    const rows = train.filter((t) => t.label === label);
    return rows.reduce((s, t) => s + t.ratio, 0) / rows.length;
  };
  return { onTime: mean(1), late: mean(0) };
}
