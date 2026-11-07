/**
 * What if we never compare with a simple baseline? A small, deterministic example.
 * Toy "machine fault" data: 6 sensor numbers per machine and a fault label that is rare (about one machine in nine).
 * Four models are trained on the same 500 rows and scored on rows held back:
 *  - majority: always predict the most common label of the training rows (no learning at all);
 *  - one rule: the single best "feature above or below a cut" rule, chosen on the training rows;
 *  - straight line: logistic regression trained by gradient descent;
 *  - forest: 40 small decision trees on bootstrap samples, voting (the "fancy" model).
 * The gap between the forest and the best simple model gets a 95% interval from a paired bootstrap over test rows.
 * Every number on screen comes from here.
 */

export const FEATURES = 6;
export const N_TRAIN = 500;
export const TEST_SIZES = [100, 200, 400, 800] as const;
export const POOL = 800;
export const BOOT = 1000;

export type Row = { x: number[]; y: 0 | 1 };

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

/**
 * Rows of 6 numbers. A fault is more likely when sensors 1 and 2 are both high (a corner, not a line)
 * and a little more likely when sensor 3 is high; sensors 4 to 6 are noise. About 11% of rows are faults.
 */
export function makeRows(n: number, seed: number): Row[] {
  const r = rng(seed);
  const rows: Row[] = [];
  for (let i = 0; i < n; i++) {
    const x = Array.from(
      { length: FEATURES },
      () => Math.round(gauss(r) * 1000) / 1000,
    );
    const z =
      -2.7 +
      2.6 * Math.max(0, x[0] - 0.2) * Math.max(0, x[1] - 0.2) +
      0.8 * x[2];
    const p = 1 / (1 + Math.exp(-z));
    rows.push({ x, y: r() < p ? 1 : 0 });
  }
  return rows;
}

export const trainRows = () => makeRows(N_TRAIN, 8081);
export const testPool = () => makeRows(POOL, 479);

export type Model = {
  id: "majority" | "rule" | "line" | "forest";
  name: string;
  fancy: boolean;
  predict: (x: number[]) => 0 | 1;
};

/* ---------- the models ---------- */

function majority(train: Row[]): Model {
  const ones = train.filter((t) => t.y === 1).length;
  const cls = (ones * 2 > train.length ? 1 : 0) as 0 | 1;
  return {
    id: "majority",
    name: "Always the common answer",
    fancy: false,
    predict: () => cls,
  };
}

/** The best single rule "feature f above (or below) a cut", by training accuracy. Ties keep the first found, and the rule must beat the plain majority to be used. */
function rule(
  train: Row[],
): Model & { feature: number; cut: number; above: 0 | 1 } {
  const base = majority(train).predict([]);
  let bestAcc = train.filter((t) => t.y === base).length / train.length;
  let best = { feature: -1, cut: 0, above: base };
  for (let f = 0; f < FEATURES; f++) {
    const vals = Array.from(new Set(train.map((t) => t.x[f]))).sort(
      (a, b) => a - b,
    );
    for (let v = 0; v + 1 < vals.length; v += 1) {
      // a cut must leave at least 2% of the rows on each side
      const below = train.filter(
        (t) => t.x[f] <= (vals[v] + vals[v + 1]) / 2,
      ).length;
      if (below < train.length * 0.02 || below > train.length * 0.98) continue;
      const cut = (vals[v] + vals[v + 1]) / 2;
      for (const above of [0, 1] as const) {
        let right = 0;
        for (const t of train)
          if (((t.x[f] > cut ? above : 1 - above) as 0 | 1) === t.y) right++;
        const acc = right / train.length;
        if (acc > bestAcc + 1e-12) {
          bestAcc = acc;
          best = { feature: f, cut, above };
        }
      }
    }
  }
  const { feature, cut, above } = best;
  return {
    id: "rule",
    name: "One simple rule",
    fancy: false,
    feature,
    cut,
    above,
    predict: (x) =>
      feature < 0 ? above : ((x[feature] > cut ? above : 1 - above) as 0 | 1),
  };
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/** Logistic regression on standardised features: 300 steps of gradient descent, step size 0.3, answer 1 when the chance is above 0.5. */
function line(train: Row[]): Model {
  const n = train.length;
  const mu = Array.from(
    { length: FEATURES },
    (_, f) => train.reduce((s, t) => s + t.x[f], 0) / n,
  );
  const sd = Array.from(
    { length: FEATURES },
    (_, f) =>
      Math.sqrt(train.reduce((s, t) => s + (t.x[f] - mu[f]) ** 2, 0) / n) || 1,
  );
  const z = (x: number[]) => x.map((v, f) => (v - mu[f]) / sd[f]);
  const Z = train.map((t) => z(t.x));
  const w = new Array(FEATURES).fill(0);
  let b = 0;
  for (let s = 0; s < 300; s++) {
    const g = new Array(FEATURES).fill(0);
    let gb = 0;
    for (let i = 0; i < n; i++) {
      let a = b;
      for (let f = 0; f < FEATURES; f++) a += w[f] * Z[i][f];
      const e = sigmoid(a) - train[i].y;
      for (let f = 0; f < FEATURES; f++) g[f] += e * Z[i][f];
      gb += e;
    }
    for (let f = 0; f < FEATURES; f++) w[f] -= (0.3 * g[f]) / n;
    b -= (0.3 * gb) / n;
  }
  return {
    id: "line",
    name: "Straight line",
    fancy: false,
    predict: (x) => {
      const zz = z(x);
      let a = b;
      for (let f = 0; f < FEATURES; f++) a += w[f] * zz[f];
      return a > 0 ? 1 : 0;
    },
  };
}

type Node =
  | { leaf: true; p: number }
  | { leaf: false; f: number; cut: number; lo: Node; hi: Node };

function grow(rows: Row[], depth: number, r: () => number): Node {
  const ones = rows.filter((t) => t.y === 1).length;
  const p = ones / rows.length;
  if (depth === 0 || rows.length < 12 || ones === 0 || ones === rows.length)
    return { leaf: true, p };
  const gini = (a: number, n: number) =>
    n === 0 ? 0 : 2 * (a / n) * (1 - a / n);
  let best: { f: number; cut: number; score: number } | null = null;
  // each split looks at 3 of the 6 features, picked at random (that is what makes the trees differ)
  const all = Array.from({ length: FEATURES }, (_, i) => i);
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  const feats = all.slice(0, 3);
  for (const f of feats) {
    const sorted = rows
      .map((t) => ({ v: t.x[f], y: t.y }))
      .sort((a, b) => a.v - b.v);
    let left1 = 0;
    for (let i = 0; i + 1 < sorted.length; i++) {
      left1 += sorted[i].y;
      if (
        sorted[i].v === sorted[i + 1].v ||
        i + 1 < 5 ||
        sorted.length - (i + 1) < 5
      )
        continue;
      const nl = i + 1;
      const nr = sorted.length - nl;
      const score =
        (nl * gini(left1, nl) + nr * gini(ones - left1, nr)) / sorted.length;
      if (!best || score < best.score)
        best = { f, cut: (sorted[i].v + sorted[i + 1].v) / 2, score };
    }
  }
  if (!best) return { leaf: true, p };
  const { f, cut } = best;
  return {
    leaf: false,
    f,
    cut,
    lo: grow(
      rows.filter((t) => t.x[f] <= cut),
      depth - 1,
      r,
    ),
    hi: grow(
      rows.filter((t) => t.x[f] > cut),
      depth - 1,
      r,
    ),
  };
}

const leafP = (node: Node, x: number[]): number =>
  node.leaf ? node.p : leafP(x[node.f] <= node.cut ? node.lo : node.hi, x);

/** 40 trees, each grown to depth 5 on a bootstrap sample of the training rows; they vote by averaging their leaf fault rates. */
function forest(train: Row[], trees = 40): Model {
  const r = rng(555);
  const nodes: Node[] = [];
  for (let t = 0; t < trees; t++) {
    const sample = Array.from(
      { length: train.length },
      () => train[Math.floor(r() * train.length)],
    );
    nodes.push(grow(sample, 5, r));
  }
  return {
    id: "forest",
    name: "Fancy model (forest)",
    fancy: true,
    predict: (x) =>
      nodes.reduce((s, n) => s + leafP(n, x), 0) / trees > 0.5 ? 1 : 0,
  };
}

export type Trained = {
  models: Model[];
  ruleInfo: { feature: number; cut: number; above: 0 | 1 };
};

export function trainAll(train: Row[] = trainRows()): Trained {
  const ru = rule(train);
  return {
    models: [majority(train), ru, line(train), forest(train)],
    ruleInfo: { feature: ru.feature, cut: ru.cut, above: ru.above },
  };
}

/* ---------- scoring ---------- */

export const accuracyOf = (c: boolean[]) => c.filter(Boolean).length / c.length;

/** Which of the first m test rows each model gets right. */
export function correctness(
  models: Model[],
  m: number,
  pool: Row[] = testPool(),
): boolean[][] {
  const test = pool.slice(0, m);
  return models.map((md) => test.map((t) => md.predict(t.x) === t.y));
}

/** Wilson 95% interval for a share: a good interval for accuracies near 0 or 1. */
export function wilson(right: number, n: number, z = 1.96): [number, number] {
  const p = right / n;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const h = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [(c - h) / d, (c + h) / d];
}

/** Paired bootstrap: resample the test rows, take (share right for A) minus (share right for B) each time, and give the middle 95%. */
export function diffInterval(
  a: boolean[],
  b: boolean[],
  boot = BOOT,
  seed = 31,
): { diff: number; lo: number; hi: number } {
  const r = rng(seed);
  const n = a.length;
  const d = a.map((v, i) => (v ? 1 : 0) - (b[i] ? 1 : 0));
  const diff = d.reduce((s, x) => s + x, 0) / n;
  const out: number[] = [];
  for (let k = 0; k < boot; k++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += d[Math.floor(r() * n)];
    out.push(s / n);
  }
  out.sort((x, y) => x - y);
  return {
    diff,
    lo: out[Math.floor(0.025 * boot)],
    hi: out[Math.ceil(0.975 * boot) - 1],
  };
}

export type Verdict = "worse" | "cannot-tell" | "small" | "worth-it";

/**
 * The "is it worth it" call. `needed` is the gain (as a share, e.g. 0.03) the extra complexity has to earn.
 * Worth it only when even the low end of the interval is above what is needed.
 */
export function verdict(lo: number, hi: number, needed: number): Verdict {
  if (hi < 0) return "worse";
  if (lo > needed) return "worth-it";
  if (lo > 0) return "small";
  return "cannot-tell";
}

export type Report = {
  names: string[];
  fancy: number;
  acc: number[];
  ci: [number, number][];
  /** training accuracy of each model, used to pick the strongest simple model without peeking at the test rows */
  trainAcc: number[];
  /** index of the strongest simple model (highest training accuracy; ties go to the simpler one) */
  best: number;
  diff: { diff: number; lo: number; hi: number };
  m: number;
  faultShare: number;
};

export function report(
  t: Trained,
  m: number,
  train: Row[] = trainRows(),
  pool: Row[] = testPool(),
): Report {
  const c = correctness(t.models, m, pool);
  const acc = c.map(accuracyOf);
  const trainAcc = t.models.map(
    (md) => train.filter((r) => md.predict(r.x) === r.y).length / train.length,
  );
  const fancy = t.models.findIndex((md) => md.fancy);
  let best = -1;
  t.models.forEach((md, i) => {
    if (!md.fancy && (best < 0 || trainAcc[i] > trainAcc[best] + 1e-12))
      best = i;
  });
  const test = pool.slice(0, m);
  return {
    names: t.models.map((md) => md.name),
    fancy,
    acc,
    ci: c.map((cc) => wilson(cc.filter(Boolean).length, m)),
    trainAcc,
    best,
    diff: diffInterval(c[fancy], c[best]),
    m,
    faultShare: test.filter((r) => r.y === 1).length / m,
  };
}
