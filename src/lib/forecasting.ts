/**
 * A small forecasting sandbox on an invented monthly series: baselines, Holt-Winters, boosted trees on lag features,
 * error measures (MAE, MAPE, MASE) and rolling-origin backtesting. Pure functions, no DOM.
 */
import { mulberry32 } from './trees';

export const PERIOD = 12;

export type SeriesOpts = { trend: number; season: number; noise: number; seed: number; n?: number };

/** One year of seasonal shape, centred so it sums to zero: quiet winter, busy summer. */
const SHAPE = (() => {
  const raw = [-0.9, -0.8, -0.3, 0.2, 0.6, 1.0, 1.2, 1.0, 0.3, -0.1, -0.4, 0.0];
  const m = raw.reduce((a, b) => a + b, 0) / raw.length;
  return raw.map((v) => v - m);
})();

function gaussian(rng: () => number): number {
  const u = Math.max(rng(), 1e-12);
  // Rounded so that the last-digit differences between the server's and the browser's Math.log and Math.cos cannot change a result.
  return Math.round(Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng()) * 1e9) / 1e9;
}

/** An invented series: level 100 plus a straight trend (units per month) plus a yearly shape scaled by `season` (peak about 20 x season) plus noise (standard deviation). */
export function makeSeries({ trend, season, noise, seed, n = 108 }: SeriesOpts): number[] {
  const rng = mulberry32(seed * 6151 + 5);
  return Array.from({ length: n }, (_, t) => 100 + trend * t + 20 * season * SHAPE[t % PERIOD] + noise * gaussian(rng));
}

/* ---------- error measures ---------- */

export const mae = (actual: number[], fc: number[]) => actual.reduce((s, a, i) => s + Math.abs(a - fc[i]), 0) / actual.length;
export const rmse = (actual: number[], fc: number[]) => Math.sqrt(actual.reduce((s, a, i) => s + (a - fc[i]) ** 2, 0) / actual.length);
/** Mean absolute percentage error in percent. Undefined (Infinity) if an actual value is 0. */
export const mape = (actual: number[], fc: number[]) => (100 * actual.reduce((s, a, i) => s + (a === 0 ? Infinity : Math.abs(a - fc[i]) / Math.abs(a)), 0)) / actual.length;

/** The scale for MASE: the mean absolute error of the seasonal-naive forecast on the training data. */
export function naiveScale(train: number[], m = PERIOD): number {
  let s = 0;
  for (let t = m; t < train.length; t++) s += Math.abs(train[t] - train[t - m]);
  return s / (train.length - m);
}

/** Mean absolute scaled error: MAE of the forecast divided by the training-set seasonal-naive MAE. Below 1 beats that baseline's in-sample error. */
export const mase = (actual: number[], fc: number[], train: number[], m = PERIOD) => mae(actual, fc) / naiveScale(train, m);

/* ---------- forecasting methods ---------- */

export type MethodId = 'naive' | 'snaive' | 'mean12' | 'hw' | 'gbLevel' | 'gbChange';

export const METHODS: { id: MethodId; label: string; short: string }[] = [
  { id: 'naive', label: 'Naive: repeat the last value', short: 'Naive' },
  { id: 'snaive', label: 'Seasonal naive: repeat the same month last year', short: 'Seasonal naive' },
  { id: 'mean12', label: 'Average of the last 12 months', short: 'Average of 12' },
  { id: 'hw', label: 'Holt-Winters (trend and season smoothing)', short: 'Holt-Winters' },
  { id: 'gbLevel', label: 'Boosted trees on lags, predicting the level', short: 'Trees: level' },
  { id: 'gbChange', label: 'Boosted trees on lags, predicting the change from a year ago', short: 'Trees: change' },
];

export const naiveForecast = (train: number[], h: number) => Array.from({ length: h }, () => train[train.length - 1]);
export const seasonalNaiveForecast = (train: number[], h: number, m = PERIOD) => Array.from({ length: h }, (_, i) => train[train.length - m + (i % m)]);
export const meanForecast = (train: number[], h: number, m = PERIOD) => {
  const v = train.slice(-m).reduce((a, b) => a + b, 0) / m;
  return Array.from({ length: h }, () => v);
};

type HwState = { level: number; trend: number; seasonal: number[]; sse: number };

function hwRun(y: number[], a: number, b: number, g: number, m: number): HwState {
  const first = y.slice(0, m).reduce((s, v) => s + v, 0) / m;
  const second = y.slice(m, 2 * m).reduce((s, v) => s + v, 0) / m;
  let level = first;
  let trend = (second - first) / m;
  const seasonal = y.slice(0, m).map((v) => v - first);
  let sse = 0;
  for (let t = m; t < y.length; t++) {
    const s = seasonal[t % m];
    const pred = level + trend + s;
    sse += (y[t] - pred) ** 2;
    const prevLevel = level;
    level = a * (y[t] - s) + (1 - a) * (level + trend);
    trend = b * (level - prevLevel) + (1 - b) * trend;
    seasonal[t % m] = g * (y[t] - level) + (1 - g) * s;
  }
  return { level, trend, seasonal, sse };
}

/** Additive Holt-Winters. The three smoothing weights are picked from a small grid by the one-step squared error on the training data. Needs at least two full years. */
export function holtWintersForecast(train: number[], h: number, m = PERIOD): number[] {
  if (train.length < 2 * m) return seasonalNaiveForecast(train, h, m);
  const grid = [0.05, 0.15, 0.3, 0.5, 0.7];
  let best: HwState | null = null;
  for (const a of grid) for (const b of [0.01, 0.05, 0.15]) for (const g of grid) {
    const st = hwRun(train, a, b, g, m);
    if (!best || st.sse < best.sse) best = st;
  }
  const n = train.length;
  const st = best as HwState;
  return Array.from({ length: h }, (_, i) => st.level + (i + 1) * st.trend + st.seasonal[(n + i) % m]);
}

/* A small multi-feature regression tree and boosting, just enough for lag features. */
type Tree = { leaf: true; value: number } | { leaf: false; f: number; thr: number; left: Tree; right: Tree };

function fitTree(X: number[][], y: number[], depth: number): Tree {
  const build = (ids: number[], d: number): Tree => {
    const mean = ids.reduce((s, i) => s + y[i], 0) / ids.length;
    if (d >= depth || ids.length < 4) return { leaf: true, value: mean };
    let bestScore = -Infinity;
    let bf = -1;
    let bt = 0;
    const total = ids.reduce((s, i) => s + y[i], 0);
    for (let f = 0; f < X[0].length; f++) {
      const order = ids.slice().sort((a, b) => X[a][f] - X[b][f]);
      let sumL = 0;
      for (let k = 0; k + 1 < order.length; k++) {
        sumL += y[order[k]];
        if (X[order[k]][f] === X[order[k + 1]][f]) continue;
        const nL = k + 1;
        const nR = order.length - nL;
        if (nL < 2 || nR < 2) continue;
        const score = (sumL * sumL) / nL + ((total - sumL) * (total - sumL)) / nR;
        if (score > bestScore + 1e-12) {
          bestScore = score;
          bf = f;
          bt = (X[order[k]][f] + X[order[k + 1]][f]) / 2;
        }
      }
    }
    if (bf < 0) return { leaf: true, value: mean };
    return {
      leaf: false,
      f: bf,
      thr: bt,
      left: build(ids.filter((i) => X[i][bf] <= bt), d + 1),
      right: build(ids.filter((i) => X[i][bf] > bt), d + 1),
    };
  };
  return build(X.map((_, i) => i), 0);
}

const predictTree = (t: Tree, x: number[]): number => (t.leaf ? t.value : x[t.f] <= t.thr ? predictTree(t.left, x) : predictTree(t.right, x));

export type Booster = { base: number; lr: number; trees: Tree[] };

export function fitBooster(X: number[][], y: number[], rounds = 80, lr = 0.1, depth = 3): Booster {
  const base = y.reduce((a, b) => a + b, 0) / y.length;
  const pred = y.map(() => base);
  const trees: Tree[] = [];
  for (let r = 0; r < rounds; r++) {
    const t = fitTree(X, y.map((v, i) => v - pred[i]), depth);
    trees.push(t);
    for (let i = 0; i < y.length; i++) pred[i] += lr * predictTree(t, X[i]);
  }
  return { base, lr, trees };
}

export const boosterPredict = (b: Booster, x: number[]) => b.trees.reduce((s, t) => s + b.lr * predictTree(t, x), b.base);

/** Features for predicting y[t] from the past only: the last two values, the value a year ago, and the month number. */
const levelFeatures = (y: number[], t: number, m = PERIOD) => [y[t - 1], y[t - 2], y[t - m], t % m];

/** Boosted trees that predict the level y[t] from lags. Multi-step forecasts feed each prediction back in as the next lag. Trees cannot go beyond the range of values they were trained on. */
export function boostedLevelForecast(train: number[], h: number, m = PERIOD): number[] {
  const X: number[][] = [];
  const y: number[] = [];
  for (let t = m; t < train.length; t++) {
    X.push(levelFeatures(train, t, m));
    y.push(train[t]);
  }
  const model = fitBooster(X, y);
  const hist = train.slice();
  const out: number[] = [];
  for (let i = 0; i < h; i++) {
    const t = hist.length;
    const v = boosterPredict(model, levelFeatures(hist, t, m));
    hist.push(v);
    out.push(v);
  }
  return out;
}

/** Boosted trees that predict the change from the same month last year, d[t] = y[t] - y[t-12], from earlier changes and the month. This removes the trend before the trees see the data. */
export function boostedChangeForecast(train: number[], h: number, m = PERIOD): number[] {
  const d = (y: number[], t: number) => y[t] - y[t - m];
  const feats = (y: number[], t: number) => [d(y, t - 1), d(y, t - 2), d(y, t - 3), t % m];
  const X: number[][] = [];
  const target: number[] = [];
  for (let t = m + 3; t < train.length; t++) {
    X.push(feats(train, t));
    target.push(d(train, t));
  }
  if (X.length < 8) return seasonalNaiveForecast(train, h, m);
  const model = fitBooster(X, target);
  const hist = train.slice();
  const out: number[] = [];
  for (let i = 0; i < h; i++) {
    const t = hist.length;
    const v = hist[t - m] + boosterPredict(model, feats(hist, t));
    hist.push(v);
    out.push(v);
  }
  return out;
}

export function forecast(id: MethodId, train: number[], h: number): number[] {
  switch (id) {
    case 'naive': return naiveForecast(train, h);
    case 'snaive': return seasonalNaiveForecast(train, h);
    case 'mean12': return meanForecast(train, h);
    case 'hw': return holtWintersForecast(train, h);
    case 'gbLevel': return boostedLevelForecast(train, h);
    case 'gbChange': return boostedChangeForecast(train, h);
  }
}

/* ---------- backtesting ---------- */

export type Origin = { origin: number; forecast: number[]; actual: number[]; mae: number; baselineMae: number; mase: number };

/**
 * Rolling-origin backtest. At each origin the method sees only the values before it and forecasts the next `horizon` values.
 * The origin then moves forward by `step`. Nothing from the future is ever used to fit a forecast.
 */
export function rollingOrigins(series: number[], id: MethodId, opts: { initial: number; horizon: number; step: number }): Origin[] {
  const { initial, horizon, step } = opts;
  const out: Origin[] = [];
  for (let o = initial; o + horizon <= series.length; o += step) {
    const train = series.slice(0, o);
    const actual = series.slice(o, o + horizon);
    const fc = forecast(id, train, horizon);
    const base = seasonalNaiveForecast(train, horizon);
    out.push({ origin: o, forecast: fc, actual, mae: mae(actual, fc), baselineMae: mae(actual, base), mase: mase(actual, fc, train) });
  }
  return out;
}

export const meanOf = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;

/** Ordinary least squares with an intercept, by the normal equations. Returns [intercept, ...weights]. A tiny ridge keeps the solve stable. */
export function olsFit(X: number[][], y: number[]): number[] {
  const p = X[0].length + 1;
  const A = Array.from({ length: p }, () => new Array(p + 1).fill(0));
  X.forEach((row, r) => {
    const v = [1, ...row];
    for (let i = 0; i < p; i++) {
      for (let j = 0; j < p; j++) A[i][j] += v[i] * v[j];
      A[i][p] += v[i] * y[r];
    }
  });
  for (let i = 0; i < p; i++) A[i][i] += 1e-9;
  for (let c = 0; c < p; c++) {
    let piv = c;
    for (let r = c + 1; r < p; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    [A[c], A[piv]] = [A[piv], A[c]];
    for (let r = 0; r < p; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k <= p; k++) A[r][k] -= f * A[c][k];
    }
  }
  return A.map((row, i) => row[p] / row[i]);
}

export const olsPredict = (w: number[], x: number[]) => w.reduce((s, wi, i) => s + wi * (i === 0 ? 1 : x[i - 1]), 0);

/**
 * Three one-step-ahead scores for a linear model on the same series, to show what a shuffled split hides.
 * Features: the last two months, the same month last year, and the month of the year as a sine and cosine.
 * randomSplitMae: a random 25% of months held out, ordinary features.
 * leakyRandomSplitMae: the same split with one extra feature that quietly includes the month being predicted:
 *   a 3-month rolling average that ends on the month itself (the classic forgotten shift). A shuffled split cannot tell the difference.
 * honestMae: a rolling origin with ordinary features: for each of the last `tail` months, fit on the months before it only.
 */
export function leakDemo(series: number[], seed = 1, tail = 24, m = PERIOD): { randomSplitMae: number; leakyRandomSplitMae: number; honestMae: number; naiveMae: number } {
  const base = (y: number[], t: number) => [y[t - 1], y[t - 2], y[t - m], Math.sin((2 * Math.PI * (t % m)) / m), Math.cos((2 * Math.PI * (t % m)) / m)];
  const leaky = (y: number[], t: number) => [...base(y, t), (y[t - 2] + y[t - 1] + y[t]) / 3];
  const rows: number[] = [];
  for (let t = m; t < series.length; t++) rows.push(t);
  const rng = mulberry32(seed * 31 + 3);
  const order = rows.slice();
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const test = new Set(order.slice(0, Math.round(rows.length * 0.25)));
  const trainRows = rows.filter((t) => !test.has(t));
  const testRows = rows.filter((t) => test.has(t));
  const split = (feat: (y: number[], t: number) => number[]) => {
    const w = olsFit(trainRows.map((t) => feat(series, t)), trainRows.map((t) => series[t]));
    return meanOf(testRows.map((t) => Math.abs(series[t] - olsPredict(w, feat(series, t)))));
  };
  const errs: number[] = [];
  const naiveErrs: number[] = [];
  for (let t = series.length - tail; t < series.length; t++) {
    const past = series.slice(0, t);
    const idx = Array.from({ length: past.length - m }, (_, k) => k + m);
    const w = olsFit(idx.map((s) => base(past, s)), idx.map((s) => past[s]));
    errs.push(Math.abs(series[t] - olsPredict(w, base(series, t))));
    naiveErrs.push(Math.abs(series[t] - series[t - 1]));
  }
  return { randomSplitMae: split(base), leakyRandomSplitMae: split(leaky), honestMae: meanOf(errs), naiveMae: meanOf(naiveErrs) };
}
