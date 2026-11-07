/**
 * What if missing values are handled carelessly? A toy medical-style example: one test result x per person and a
 * yes/no outcome y (needs follow-up). People who need follow-up have higher x on average. The catch: the test is
 * missing far more often for them than for everyone else, so "missing" itself carries information (it depends on the
 * outcome). Three ways of handling a missing x are compared with the same small logistic-regression model:
 *   drop: throw away training rows with a missing x (and, at scoring time, fall back to the common answer),
 *   mean: fill with the average of the x values we did see,
 *   flag: fill with the average AND add a 0/1 column "x was missing".
 * Every number is computed here from seeded data.
 */

export const N_TRAIN = 400;
export const N_TEST = 4000;
export const P_SICK = 0.4;
export const MISS_HEALTHY = 0.1;
export const SEPARATION = 1; // class means are -1 and +1, spread 1
export const SHOWN_SEED = 21;

export type Strategy = 'drop' | 'mean' | 'flag';

export type Row = { x: number; y: 0 | 1; missing: boolean };

export function rng(seed: number): () => number {
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
  return Math.sqrt(-2 * Math.log(Math.max(r(), 1e-12))) * Math.cos(2 * Math.PI * r());
}

/** missSick is the chance the test result is missing for someone who needs follow-up (healthy people: 10%). */
export function makeRows(n: number, missSick: number, seed: number): Row[] {
  const r = rng(seed);
  return Array.from({ length: n }, () => {
    const y = (r() < P_SICK ? 1 : 0) as 0 | 1;
    const x = Math.round(((y ? SEPARATION : -SEPARATION) + gauss(r)) * 1000) / 1000;
    const missing = r() < (y ? missSick : MISS_HEALTHY);
    return { x, y, missing };
  });
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/** Solve a w = b by Gaussian elimination with partial pivoting (tiny systems). */
function solve(a: number[][], b: number[]): number[] {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = c + 1; r < n; r++) {
      const f = m[r][c] / m[c][c];
      for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
    }
  }
  const w = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = m[i][n];
    for (let k = i + 1; k < n; k++) s -= m[i][k] * w[k];
    w[i] = s / m[i][i];
  }
  return w;
}

/** Logistic regression by Newton's method with a tiny ridge so the system is always solvable. */
export function fitLogistic(X: number[][], y: number[], iterations = 25, ridge = 1e-3): number[] {
  const d = X[0].length;
  let w = new Array(d).fill(0);
  for (let it = 0; it < iterations; it++) {
    const g = new Array(d).fill(0);
    const H = Array.from({ length: d }, () => new Array(d).fill(0));
    for (let i = 0; i < X.length; i++) {
      const p = sigmoid(X[i].reduce((s, v, k) => s + v * w[k], 0));
      for (let a = 0; a < d; a++) {
        g[a] += (p - y[i]) * X[i][a];
        for (let b = 0; b < d; b++) H[a][b] += p * (1 - p) * X[i][a] * X[i][b];
      }
    }
    for (let a = 0; a < d; a++) {
      H[a][a] += ridge;
      g[a] += ridge * w[a];
    }
    const step = solve(H, g);
    w = w.map((v, k) => v - step[k]);
  }
  return w;
}

export type Model = { strategy: Strategy; w: number[]; fill: number; fallback: number; dropped: { all: number; sick: number; healthy: number } };

const features = (row: Row, fill: number, strategy: Strategy): number[] => {
  const x = row.missing ? fill : row.x;
  return strategy === 'flag' ? [1, x, row.missing ? 1 : 0] : [1, x];
};

export function train(rows: Row[], strategy: Strategy): Model {
  const seen = rows.filter((r) => !r.missing);
  const fill = seen.reduce((s, r) => s + r.x, 0) / seen.length;
  const share = (list: Row[]) => (list.length ? list.filter((r) => r.missing).length / list.length : 0);
  const dropped = { all: share(rows), sick: share(rows.filter((r) => r.y === 1)), healthy: share(rows.filter((r) => r.y === 0)) };
  const fallback = seen.reduce((s, r) => s + r.y, 0) / seen.length;
  const used = strategy === 'drop' ? seen : rows;
  const w = fitLogistic(used.map((r) => features(r, fill, strategy)), used.map((r) => r.y));
  return { strategy, w, fill, fallback, dropped };
}

/** Chance of "needs follow-up". A model trained by dropping rows has no answer for a missing x, so it uses the common rate it saw. */
export function probability(m: Model, row: Row): number {
  if (m.strategy === 'drop' && row.missing) return m.fallback;
  return sigmoid(features(row, m.fill, m.strategy).reduce((s, v, k) => s + v * m.w[k], 0));
}

export type Result = {
  accuracy: number;
  /** Share of the people who truly need follow-up that the model flags. */
  recall: number;
  /** Share of people the model flags minus the real share who need follow-up, in percentage points. Negative means it under-flags. */
  bias: number;
  /** Accuracy on just the rows whose x is missing. */
  accuracyMissing: number;
  predictedShare: number;
  /** What the model says (chance of follow-up) for a person whose x is missing. */
  pMissing: number;
};

export function evaluate(m: Model, rows: Row[]): Result {
  let right = 0;
  let sick = 0;
  let caught = 0;
  let miss = 0;
  let missRight = 0;
  let flagged = 0;
  for (const r of rows) {
    const p = probability(m, r);
    const call = p >= 0.5 ? 1 : 0;
    if (call === r.y) right++;
    if (call === 1) flagged++;
    if (r.y === 1) {
      sick++;
      if (call === 1) caught++;
    }
    if (r.missing) {
      miss++;
      if (call === r.y) missRight++;
    }
  }
  return {
    accuracy: right / rows.length,
    recall: sick ? caught / sick : 0,
    bias: 100 * (flagged / rows.length - sick / rows.length),
    accuracyMissing: miss ? missRight / miss : 0,
    predictedShare: flagged / rows.length,
    pMissing: probability(m, { x: 0, y: 0, missing: true }),
  };
}

export const STRATEGIES: Strategy[] = ['drop', 'mean', 'flag'];

/** Train all three on the same training rows and score them on a large test set that has the same pattern of gaps. */
export function compare(missSick: number, seed = SHOWN_SEED) {
  const trainRows = makeRows(N_TRAIN, missSick, seed);
  const testRows = makeRows(N_TEST, missSick, seed + 1000);
  const out = {} as Record<Strategy, { model: Model; result: Result }>;
  for (const s of STRATEGIES) {
    const model = train(trainRows, s);
    out[s] = { model, result: evaluate(model, testRows) };
  }
  // for comparison: the same model if nothing had been hidden (the true x of every row is used)
  const whole = trainRows.map((r) => ({ ...r, missing: false }));
  const reference = train(whole, 'mean');
  const referenceResult = evaluate(reference, testRows.map((r) => ({ ...r, missing: false })));
  return { trainRows, out, referenceWeight: reference.w[1], referenceResult };
}
