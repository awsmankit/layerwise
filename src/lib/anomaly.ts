/**
 * Anomaly detection on small 2D point sets and on a seasonal series: z-score, robust (median-based) score,
 * IQR fences, isolation forest, confusion counts, cost-based thresholds and the base-rate arithmetic of alerts.
 * Pure functions, no DOM. The isolation forest is checked against scikit-learn in the tests.
 */
import { gauss, mulberry32, r4 } from './clustering';

export { mulberry32 };

/* ------------------------------------------------------------------ one-dimensional statistics */

export const mean = (v: number[]): number => v.reduce((a, b) => a + b, 0) / v.length;

/** Standard deviation of the whole list (divides by n, as NumPy does by default). */
export function std(v: number[]): number {
  const m = mean(v);
  return Math.sqrt(v.reduce((s, x) => s + (x - m) * (x - m), 0) / v.length);
}

/** Quantile with linear interpolation between neighbours (NumPy's default method). `q` is between 0 and 1. */
export function quantile(values: number[], q: number): number {
  const s = [...values].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

export const median = (v: number[]): number => quantile(v, 0.5);

/** Median absolute deviation: the median of |x - median|. Not scaled. */
export function mad(v: number[]): number {
  const m = median(v);
  return median(v.map((x) => Math.abs(x - m)));
}

/** Classic z-scores: (x - mean) / standard deviation. All zeros when the spread is zero. */
export function zScores(v: number[]): number[] {
  const m = mean(v);
  const s = std(v);
  return v.map((x) => (s > 0 ? (x - m) / s : 0));
}

/**
 * Robust "modified z-score" of Iglewicz and Hoaglin: 0.6745 (x - median) / MAD. The constant makes it comparable to a z-score
 * for bell-shaped data, and 3.5 is the usual cut-off. When the MAD is zero (more than half the values are identical),
 * falls back to the mean absolute deviation with the constant 0.7979, as the NIST handbook describes.
 */
export function modifiedZ(v: number[]): number[] {
  const med = median(v);
  const m = mad(v);
  if (m > 0) return v.map((x) => (0.6745 * (x - med)) / m);
  const meanAd = mean(v.map((x) => Math.abs(x - med)));
  return v.map((x) => (meanAd > 0 ? (0.7979 * (x - med)) / meanAd : 0));
}

/** Tukey's fences: values below Q1 - k IQR or above Q3 + k IQR (k = 1.5 is the usual choice). */
export function iqrFences(v: number[], k = 1.5): { q1: number; q3: number; low: number; high: number } {
  const q1 = quantile(v, 0.25);
  const q3 = quantile(v, 0.75);
  return { q1, q3, low: q1 - k * (q3 - q1), high: q3 + k * (q3 - q1) };
}

/* ------------------------------------------------------------------ 2D scores */

export type Pt = [number, number];

/** Largest absolute classic z-score over the two coordinates. */
export function zScoreMax(points: Pt[]): number[] {
  const zx = zScores(points.map((p) => p[0]));
  const zy = zScores(points.map((p) => p[1]));
  return zx.map((z, i) => Math.max(Math.abs(z), Math.abs(zy[i])));
}

/** Largest absolute modified z-score over the two coordinates. */
export function madScoreMax(points: Pt[]): number[] {
  const zx = modifiedZ(points.map((p) => p[0]));
  const zy = modifiedZ(points.map((p) => p[1]));
  return zx.map((z, i) => Math.max(Math.abs(z), Math.abs(zy[i])));
}

/* ------------------------------------------------------------------ isolation forest */

/** Average path length of an unsuccessful search in a binary search tree of n points: the normaliser c(n) of Liu et al. (2008). */
export function avgPathLength(n: number): number {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  return 2 * (Math.log(n - 1) + 0.5772156649015329) - (2 * (n - 1)) / n;
}

export type ITree = { leaf: true; size: number } | { leaf: false; f: number; v: number; l: ITree; r: ITree };
export type IForest = { trees: ITree[]; psi: number; maxDepth: number };

function growTree(pts: Pt[], depth: number, maxDepth: number, rng: () => number): ITree {
  if (pts.length <= 1 || depth >= maxDepth) return { leaf: true, size: pts.length };
  const lo = [Infinity, Infinity];
  const hi = [-Infinity, -Infinity];
  for (const p of pts)
    for (let f = 0; f < 2; f++) {
      if (p[f] < lo[f]) lo[f] = p[f];
      if (p[f] > hi[f]) hi[f] = p[f];
    }
  const usable = [0, 1].filter((f) => hi[f] > lo[f]);
  if (usable.length === 0) return { leaf: true, size: pts.length };
  const f = usable[Math.floor(rng() * usable.length)];
  const v = lo[f] + rng() * (hi[f] - lo[f]);
  const left = pts.filter((p) => p[f] < v);
  const right = pts.filter((p) => p[f] >= v);
  if (left.length === 0 || right.length === 0) return { leaf: true, size: pts.length };
  return { leaf: false, f, v, l: growTree(left, depth + 1, maxDepth, rng), r: growTree(right, depth + 1, maxDepth, rng) };
}

/**
 * Isolation forest (Liu, Ting and Zhou, 2008). Each tree is grown on a random sub-sample of `psi` points by cutting a random
 * coordinate at a random value between its smallest and largest value in the node, until a point is alone or the depth limit
 * is reached. The default depth limit is ceil(log2(psi)), the paper's choice.
 */
export function buildIForest(points: Pt[], o: { nTrees?: number; psi?: number; maxDepth?: number; seed?: number } = {}): IForest {
  const rng = mulberry32(o.seed ?? 1);
  const psi = Math.min(o.psi ?? 256, points.length);
  const maxDepth = o.maxDepth ?? Math.ceil(Math.log2(psi));
  const trees: ITree[] = [];
  for (let t = 0; t < (o.nTrees ?? 100); t++) {
    // Sample psi points without replacement (partial Fisher-Yates).
    const idx = points.map((_, i) => i);
    for (let i = 0; i < psi; i++) {
      const j = i + Math.floor(rng() * (idx.length - i));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    trees.push(growTree(idx.slice(0, psi).map((i) => points[i]), 0, maxDepth, rng));
  }
  return { trees, psi, maxDepth };
}

/** Number of cuts a point needs in one tree, plus c(size) for a leaf that still holds several points (the paper's correction). */
export function pathLength(tree: ITree, p: Pt): number {
  let depth = 0;
  let node = tree;
  while (!node.leaf) {
    node = p[node.f] < node.v ? node.l : node.r;
    depth++;
  }
  return depth + avgPathLength(node.size);
}

/** Mean path length over all trees. */
export function meanPathLength(forest: IForest, p: Pt): number {
  return forest.trees.reduce((s, t) => s + pathLength(t, p), 0) / forest.trees.length;
}

/** Anomaly score s = 2^(-E[h] / c(psi)): close to 1 means isolated quickly (anomalous), about 0.5 means typical, well below 0.5 means very ordinary. */
export function iforestScores(forest: IForest, points: Pt[]): number[] {
  const c = avgPathLength(forest.psi);
  return points.map((p) => Math.pow(2, -meanPathLength(forest, p) / c));
}

export type Cut = { f: 0 | 1; v: number; box: { x0: number; x1: number; y0: number; y1: number } };

/**
 * One random isolation of `points[target]` within a random sample of `psi` points: cut at random until it is alone (or `maxDepth` cuts). Returns every cut with the
 * region it divided, for drawing. `extent` is the region before any cut.
 */
export function isolationTrace(points: Pt[], target: number, seed: number, extent: { x0: number; x1: number; y0: number; y1: number }, maxDepth = 12, psi = 256): { cuts: Cut[]; alone: boolean } {
  const rng = mulberry32(seed);
  // As in the forest: work on a random sample of psi points, always including the one being isolated.
  let pts = points.map((_, i) => i);
  if (pts.length > psi) {
    const others = pts.filter((i) => i !== target);
    for (let i = 0; i < psi - 1; i++) {
      const j = i + Math.floor(rng() * (others.length - i));
      [others[i], others[j]] = [others[j], others[i]];
    }
    pts = [target, ...others.slice(0, psi - 1)];
  }
  const box = { ...extent };
  const cuts: Cut[] = [];
  while (pts.length > 1 && cuts.length < maxDepth) {
    const lo = [Infinity, Infinity];
    const hi = [-Infinity, -Infinity];
    for (const i of pts)
      for (let f = 0; f < 2; f++) {
        lo[f] = Math.min(lo[f], points[i][f]);
        hi[f] = Math.max(hi[f], points[i][f]);
      }
    const usable = ([0, 1] as const).filter((f) => hi[f] > lo[f]);
    if (!usable.length) break;
    const f = usable[Math.floor(rng() * usable.length)];
    const v = lo[f] + rng() * (hi[f] - lo[f]);
    cuts.push({ f, v, box: { ...box } });
    const below = points[target][f] < v;
    pts = pts.filter((i) => (points[i][f] < v) === below);
    if (f === 0) {
      if (below) box.x1 = v;
      else box.x0 = v;
    } else if (below) box.y1 = v;
    else box.y0 = v;
  }
  return { cuts, alone: pts.length === 1 };
}

/* ------------------------------------------------------------------ evaluation */

export type Confusion = { tp: number; fp: number; fn: number; tn: number; precision: number; recall: number; falseAlarmRate: number; flagged: number };

/** Flag points whose score is at least `threshold` and count against the true labels (1 = anomaly). */
export function confusion(scores: number[], labels: number[], threshold: number): Confusion {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  scores.forEach((s, i) => {
    const flag = s >= threshold;
    if (flag && labels[i] === 1) tp++;
    else if (flag) fp++;
    else if (labels[i] === 1) fn++;
    else tn++;
  });
  return {
    tp,
    fp,
    fn,
    tn,
    precision: tp + fp > 0 ? tp / (tp + fp) : 1,
    recall: tp + fn > 0 ? tp / (tp + fn) : 1,
    falseAlarmRate: fp + tn > 0 ? fp / (fp + tn) : 0,
    flagged: tp + fp,
  };
}

/** Total cost of the mistakes: `missCost` per missed anomaly plus `alarmCost` per false alarm. */
export const totalCost = (c: Confusion, missCost: number, alarmCost = 1): number => c.fn * missCost + c.fp * alarmCost;

/** The threshold with the lowest total cost (flagging nothing is allowed). Ties go to the higher threshold, so fewer alerts. */
export function bestThreshold(scores: number[], labels: number[], missCost: number, alarmCost = 1): { threshold: number; cost: number } {
  const cands = [...new Set(scores)].sort((a, b) => b - a);
  let best = { threshold: Infinity, cost: totalCost(confusion(scores, labels, Infinity), missCost, alarmCost) };
  for (const t of cands) {
    const cost = totalCost(confusion(scores, labels, t), missCost, alarmCost);
    if (cost < best.cost) best = { threshold: t, cost };
  }
  return best;
}

/**
 * What a detector with a given recall and false alarm rate does on a day of traffic: how many alerts, how many are real,
 * and the share that is real (precision). `anomalyRate` is the share of events that are truly anomalous.
 */
export function alertsPerDay(o: { events: number; anomalyRate: number; recall: number; falseAlarmRate: number }) {
  const anomalies = o.events * o.anomalyRate;
  const normals = o.events - anomalies;
  const real = anomalies * o.recall;
  const false_ = normals * o.falseAlarmRate;
  const alerts = real + false_;
  return { anomalies, real, falseAlerts: false_, alerts, precision: alerts > 0 ? real / alerts : 1 };
}

/** The highest precision a detector can have by Bayes' rule, from recall, false alarm rate and base rate. Same as `alertsPerDay(...).precision`. */
export const precisionFromRates = (recall: number, falseAlarmRate: number, anomalyRate: number): number =>
  alertsPerDay({ events: 1, anomalyRate, recall, falseAlarmRate }).precision;

/* ------------------------------------------------------------------ scenarios */

export type AnomalyKind = 'blob' | 'two' | 'loud';
export type AnomalyData = { points: Pt[]; labels: number[] };

/**
 * Example data, deterministic for a seed. `blob`: one correlated group, anomalies scattered around it (a few land near its edge).
 * `two`: two groups, with half the anomalies in the gap between them (and the rest scattered around). `loud`: one group with anomalies far off to every side,
 * so many large values drag the ordinary mean and standard deviation upwards ("masking").
 */
export function makeAnomalyData(kind: AnomalyKind, seed: number, n = 1000, rate = 0.02): AnomalyData {
  const rng = mulberry32(seed);
  const nAnom = Math.max(1, Math.round(n * rate));
  const points: Pt[] = [];
  const labels: number[] = [];
  const normal = (): Pt => {
    if (kind === 'two') return [(rng() < 0.5 ? -5 : 5) + gauss(rng), gauss(rng)];
    const x = gauss(rng);
    const rho = kind === 'blob' ? 0.6 : 0.3;
    return [x, rho * x + Math.sqrt(1 - rho * rho) * gauss(rng)];
  };
  for (let i = 0; i < n - nAnom; i++) {
    points.push(normal());
    labels.push(0);
  }
  for (let i = 0; i < nAnom; i++) {
    let p: Pt;
    if (kind === 'blob') {
      do p = [(rng() * 2 - 1) * 7, (rng() * 2 - 1) * 7];
      while (Math.hypot(p[0], p[1]) < 2.6);
    } else if (kind === 'two') {
      if (i % 2 === 0) p = [(rng() * 2 - 1) * 1.6, (rng() * 2 - 1) * 2.5];
      else {
        do p = [(rng() * 2 - 1) * 10, (rng() * 2 - 1) * 6];
        while (Math.min(Math.hypot(p[0] + 5, p[1]), Math.hypot(p[0] - 5, p[1])) < 3.2);
      }
    } else {
      const r = 5 + rng() * 15;
      const a = rng() * 2 * Math.PI;
      p = [r * Math.cos(a), r * Math.sin(a)];
    }
    points.push(p);
    labels.push(1);
  }
  // Shuffle so that anomalies are not all at the end.
  for (let i = points.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [points[i], points[j]] = [points[j], points[i]];
    [labels[i], labels[j]] = [labels[j], labels[i]];
  }
  return { points: points.map((p) => [r4(p[0]), r4(p[1])] as Pt), labels };
}

/* ------------------------------------------------------------------ seasonal series */

/** Hourly example series for 7 days: a daily cycle (quiet at 03:00, busy at 15:00) plus noise, with three injected anomalies. */
export function makeSeasonalSeries(seed: number): { values: number[]; anomalies: { index: number; why: string }[]; period: number } {
  const rng = mulberry32(seed);
  const period = 24;
  const values: number[] = [];
  for (let h = 0; h < 7 * period; h++) values.push(100 + 70 * Math.sin((2 * Math.PI * ((h % period) - 9)) / period) + 6 * gauss(rng));
  const anomalies = [
    { index: 1 * period + 15, why: 'a spike at 15:00 on day 2' },
    { index: 3 * period + 3, why: 'a normal daytime level at 03:00 on day 4' },
    { index: 5 * period + 15, why: 'a dip at 15:00 on day 6' },
  ];
  values[anomalies[0].index] = 270;
  values[anomalies[1].index] = 100;
  values[anomalies[2].index] = 100;
  return { values: values.map((v) => Math.round(v * 10) / 10), anomalies, period };
}

/** Subtract, from every value, the median of all values at the same position in the cycle (the same hour on every day). */
export function seasonalResiduals(values: number[], period: number): number[] {
  const med: number[] = [];
  for (let p = 0; p < period; p++) med.push(median(values.filter((_, i) => i % period === p)));
  return values.map((v, i) => v - med[i % period]);
}

/** Two ways to score a seasonal series: the classic z-score of the raw values, or the robust score of the seasonal residuals. */
export function seasonalScores(values: number[], period: number, method: 'global' | 'seasonal'): number[] {
  return (method === 'global' ? zScores(values) : modifiedZ(seasonalResiduals(values, period))).map(Math.abs);
}
