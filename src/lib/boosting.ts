/** Gradient boosting with squared error on one input: each small tree is fitted to what the model so far still gets wrong. */

import { mulberry32 } from './trees';

export type Pt = { x: number; y: number };

export type RegNode = { leaf: true; value: number } | { leaf: false; threshold: number; left: RegNode; right: RegNode };

const mean = (v: number[]) => (v.length ? v.reduce((s, a) => s + a, 0) / v.length : 0);

/**
 * A small regression tree: split where the two sides' means leave the least squared error,
 * repeat to maxDepth, and predict the mean target in each leaf.
 */
export function fitRegTree(xs: number[], targets: number[], maxDepth: number, minLeaf = 1): RegNode {
  const idx = xs.map((_, i) => i).sort((a, b) => xs[a] - xs[b]);
  const build = (ids: number[], depth: number): RegNode => {
    const vals = ids.map((i) => targets[i]);
    const leaf: RegNode = { leaf: true, value: mean(vals) };
    if (depth >= maxDepth || ids.length < 2 * minLeaf) return leaf;
    const total = vals.reduce((s, a) => s + a, 0);
    let sumL = 0;
    let best = -Infinity;
    let cut = -1;
    // Maximising sumL^2/nL + sumR^2/nR is the same as minimising the squared error of the two means.
    for (let k = 0; k + 1 < ids.length; k++) {
      sumL += targets[ids[k]];
      const nL = k + 1;
      const nR = ids.length - nL;
      if (xs[ids[k]] === xs[ids[k + 1]] || nL < minLeaf || nR < minLeaf) continue;
      const sumR = total - sumL;
      const score = (sumL * sumL) / nL + (sumR * sumR) / nR;
      if (score > best + 1e-12) {
        best = score;
        cut = k;
      }
    }
    if (cut < 0) return leaf;
    const threshold = (xs[ids[cut]] + xs[ids[cut + 1]]) / 2;
    return { leaf: false, threshold, left: build(ids.slice(0, cut + 1), depth + 1), right: build(ids.slice(cut + 1), depth + 1) };
  };
  return build(idx, 0);
}

export function predictReg(node: RegNode, x: number): number {
  let n = node;
  while (!n.leaf) n = x <= n.threshold ? n.left : n.right;
  return n.value;
}

/** The thresholds and leaf values of a tree as a step function, left to right, for drawing. */
export function treeSteps(node: RegNode, lo: number, hi: number): { x0: number; x1: number; value: number }[] {
  if (node.leaf) return [{ x0: lo, x1: hi, value: node.value }];
  return [...treeSteps(node.left, lo, node.threshold), ...treeSteps(node.right, node.threshold, hi)];
}

export type BoostModel = { base: number; learningRate: number; trees: RegNode[] };

export type BoostOptions = { rounds: number; learningRate: number; depth: number; minLeaf?: number };

/** Start from the mean, then add `rounds` trees, each scaled by the learning rate and fitted to the current residuals. */
export function boost(train: Pt[], o: BoostOptions): BoostModel {
  const xs = train.map((p) => p.x);
  const base = mean(train.map((p) => p.y));
  const pred = xs.map(() => base);
  const trees: RegNode[] = [];
  for (let r = 0; r < o.rounds; r++) {
    const res = train.map((p, i) => p.y - pred[i]);
    const t = fitRegTree(xs, res, o.depth, o.minLeaf ?? 1);
    trees.push(t);
    for (let i = 0; i < xs.length; i++) pred[i] += o.learningRate * predictReg(t, xs[i]);
  }
  return { base, learningRate: o.learningRate, trees };
}

/** Prediction using only the first `rounds` trees (all of them if omitted). */
export function boostPredict(m: BoostModel, x: number, rounds = m.trees.length): number {
  let v = m.base;
  for (let r = 0; r < Math.min(rounds, m.trees.length); r++) v += m.learningRate * predictReg(m.trees[r], x);
  return v;
}

/** Mean squared error of the model after 0, 1, ..., trees.length rounds. One pass over the trees. */
export function lossCurve(m: BoostModel, pts: Pt[]): number[] {
  const pred = pts.map(() => m.base);
  const out = [mseOf(pts, pred)];
  for (const t of m.trees) {
    for (let i = 0; i < pts.length; i++) pred[i] += m.learningRate * predictReg(t, pts[i].x);
    out.push(mseOf(pts, pred));
  }
  return out;
}

function mseOf(pts: Pt[], pred: number[]) {
  if (!pts.length) return 0;
  let s = 0;
  for (let i = 0; i < pts.length; i++) s += (pts[i].y - pred[i]) ** 2;
  return s / pts.length;
}

/** The round (0 = just the mean) with the lowest loss; the earliest one on a tie. */
export function bestRound(curve: number[]): number {
  let b = 0;
  for (let i = 1; i < curve.length; i++) if (curve[i] < curve[b] - 1e-12) b = i;
  return b;
}

/**
 * Early stopping: the round at which to stop, given a patience. Training stops once the validation loss
 * has not improved for `patience` rounds in a row; the answer is the best round seen up to that point.
 */
export function earlyStopRound(valCurve: number[], patience: number): number {
  let best = 0;
  for (let r = 1; r < valCurve.length; r++) {
    if (valCurve[r] < valCurve[best] - 1e-12) best = r;
    else if (r - best >= patience) break;
  }
  return best;
}

/* ---------- the demo data ---------- */

/** The hidden curve the demo is trying to recover. */
export const target = (x: number) => 1.6 * Math.sin(0.95 * x) + 0.28 * x;

function gauss(rng: () => number) {
  const u = Math.max(1e-9, rng());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/** n noisy points from the curve on x in [0, 10]. Same seed, same points. */
export function makeCurveData(seed: number, n: number, noise = 0.45): Pt[] {
  const rng = mulberry32(seed);
  return Array.from({ length: n }, () => {
    const x = rng() * 10;
    return { x, y: target(x) + gauss(rng) * noise };
  }).sort((a, b) => a.x - b.x);
}
