/** Decision trees and random forests on a small 2D, two-class dataset. Pure functions, no DOM. */

export type Cls = 0 | 1;
export type Sample = { x: number; y: number; c: Cls };
export type Feature = 'x' | 'y';
export type Criterion = 'gini' | 'entropy';

/** Small seeded random number generator so every visit draws the same data. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Impurity of a group with n0 of class 0 and n1 of class 1. Gini: 1 - sum p^2. Entropy: -sum p log2 p (in bits). */
export function impurity(n0: number, n1: number, criterion: Criterion = 'gini'): number {
  const n = n0 + n1;
  if (n === 0) return 0;
  const p0 = n0 / n;
  const p1 = n1 / n;
  if (criterion === 'gini') return 1 - p0 * p0 - p1 * p1;
  const h = (p: number) => (p > 0 ? -p * Math.log2(p) : 0);
  return h(p0) + h(p1);
}

export type SplitEval = {
  left: [number, number];
  right: [number, number];
  parent: number;
  impLeft: number;
  impRight: number;
  /** Impurity of the two children, weighted by how many rows each holds. */
  weighted: number;
  /** parent minus weighted: how much cleaner the split makes the groups. */
  drop: number;
};

/** Score a split from the class counts of its two sides. */
export function evaluateCounts(left: [number, number], right: [number, number], criterion: Criterion = 'gini'): SplitEval {
  const nl = left[0] + left[1];
  const nr = right[0] + right[1];
  const n = nl + nr;
  const parent = impurity(left[0] + right[0], left[1] + right[1], criterion);
  const impLeft = impurity(left[0], left[1], criterion);
  const impRight = impurity(right[0], right[1], criterion);
  const weighted = n === 0 ? 0 : (nl / n) * impLeft + (nr / n) * impRight;
  return { left, right, parent, impLeft, impRight, weighted, drop: parent - weighted };
}

/** Rows with value <= threshold go left. */
export function evaluateSplit(points: Sample[], feature: Feature, threshold: number, criterion: Criterion = 'gini'): SplitEval {
  const left: [number, number] = [0, 0];
  const right: [number, number] = [0, 0];
  for (const p of points) (p[feature] <= threshold ? left : right)[p.c]++;
  return evaluateCounts(left, right, criterion);
}

export type BestSplit = { feature: Feature; threshold: number; eval: SplitEval };

/** The split with the biggest impurity drop on the given features; ties go to the earlier feature and the lower threshold. */
export function bestSplit(points: Sample[], criterion: Criterion = 'gini', features: Feature[] = ['x', 'y'], minLeaf = 1): BestSplit | null {
  let best: BestSplit | null = null;
  for (const feature of features) {
    const vals = [...new Set(points.map((p) => p[feature]))].sort((a, b) => a - b);
    for (let i = 0; i + 1 < vals.length; i++) {
      const threshold = (vals[i] + vals[i + 1]) / 2;
      const ev = evaluateSplit(points, feature, threshold, criterion);
      if (ev.left[0] + ev.left[1] < minLeaf || ev.right[0] + ev.right[1] < minLeaf) continue;
      if (ev.drop > 1e-12 && (!best || ev.drop > best.eval.drop + 1e-12)) best = { feature, threshold, eval: ev };
    }
  }
  return best;
}

export type Leaf = { kind: 'leaf'; n0: number; n1: number; p1: number };
export type SplitNode = { kind: 'split'; feature: Feature; threshold: number; n0: number; n1: number; drop: number; left: TreeNode; right: TreeNode };
export type TreeNode = Leaf | SplitNode;

export type TreeOptions = {
  maxDepth: number;
  criterion?: Criterion;
  minLeaf?: number;
  /** How many features each split may look at (random choice). Omit to look at all. */
  maxFeatures?: number;
  rng?: () => number;
};

function leafOf(points: Sample[]): Leaf {
  const n1 = points.filter((p) => p.c === 1).length;
  const n0 = points.length - n1;
  return { kind: 'leaf', n0, n1, p1: points.length ? n1 / points.length : 0.5 };
}

export function buildTree(points: Sample[], opts: TreeOptions, depth = 0): TreeNode {
  const { maxDepth, criterion = 'gini', minLeaf = 1, maxFeatures, rng } = opts;
  const leaf = leafOf(points);
  if (depth >= maxDepth || leaf.n0 === 0 || leaf.n1 === 0 || points.length < 2 * minLeaf) return leaf;

  const all: Feature[] = ['x', 'y'];
  let order = all;
  if (maxFeatures !== undefined && maxFeatures < all.length && rng) order = rng() < 0.5 ? ['x', 'y'] : ['y', 'x'];
  const pick = maxFeatures !== undefined && rng ? order.slice(0, Math.max(1, maxFeatures)) : all;
  let split = bestSplit(points, criterion, pick, minLeaf);
  if (!split && pick.length < all.length) split = bestSplit(points, criterion, all, minLeaf);
  if (!split) return leaf;

  const l = points.filter((p) => p[split!.feature] <= split!.threshold);
  const r = points.filter((p) => p[split!.feature] > split!.threshold);
  return {
    kind: 'split',
    feature: split.feature,
    threshold: split.threshold,
    n0: leaf.n0,
    n1: leaf.n1,
    drop: split.eval.drop,
    left: buildTree(l, opts, depth + 1),
    right: buildTree(r, opts, depth + 1),
  };
}

/** Share of class 1 in the leaf this point lands in. */
export function treeProb(node: TreeNode, x: number, y: number): number {
  let n = node;
  while (n.kind === 'split') n = (n.feature === 'x' ? x : y) <= n.threshold ? n.left : n.right;
  return n.p1;
}

export const treeDepth = (n: TreeNode): number => (n.kind === 'leaf' ? 0 : 1 + Math.max(treeDepth(n.left), treeDepth(n.right)));
export const leafCount = (n: TreeNode): number => (n.kind === 'leaf' ? 1 : leafCount(n.left) + leafCount(n.right));

export type Bounds = { x0: number; x1: number; y0: number; y1: number };
export type Region = Bounds & { p1: number; n0: number; n1: number };

/** The rectangles a tree cuts the plane into, each with the class mix of its training rows. */
export function treeRegions(node: TreeNode, b: Bounds): Region[] {
  if (node.kind === 'leaf') return [{ ...b, p1: node.p1, n0: node.n0, n1: node.n1 }];
  if (node.feature === 'x') return [...treeRegions(node.left, { ...b, x1: node.threshold }), ...treeRegions(node.right, { ...b, x0: node.threshold })];
  return [...treeRegions(node.left, { ...b, y1: node.threshold }), ...treeRegions(node.right, { ...b, y0: node.threshold })];
}

/** Impurity-based feature importance: each split's drop times the rows it handled, summed per feature, then scaled to add to 1. */
export function treeImportance(node: TreeNode): Record<Feature, number> {
  const raw: Record<Feature, number> = { x: 0, y: 0 };
  const walk = (n: TreeNode) => {
    if (n.kind === 'leaf') return;
    raw[n.feature] += n.drop * (n.n0 + n.n1);
    walk(n.left);
    walk(n.right);
  };
  walk(node);
  const total = raw.x + raw.y;
  return total > 0 ? { x: raw.x / total, y: raw.y / total } : { x: 0, y: 0 };
}

/* ---------- forests ---------- */

export function bootstrap(points: Sample[], rng: () => number): Sample[] {
  return points.map(() => points[Math.floor(rng() * points.length)]);
}

export type ForestOptions = { nTrees: number; maxDepth: number; seed: number; maxFeatures?: number; criterion?: Criterion; minLeaf?: number };

/** Each tree sees a bootstrap resample of the rows and, at each split, a random subset of the features. */
export function buildForest(points: Sample[], o: ForestOptions): TreeNode[] {
  const rng = mulberry32(o.seed);
  return Array.from({ length: o.nTrees }, () => buildTree(bootstrap(points, rng), { maxDepth: o.maxDepth, criterion: o.criterion, minLeaf: o.minLeaf, maxFeatures: o.maxFeatures, rng }));
}

/** Share of trees that vote for class 1 (each tree votes for its leaf's majority class). */
export function forestVote(forest: TreeNode[], x: number, y: number): number {
  if (!forest.length) return 0.5;
  let v = 0;
  for (const t of forest) v += treeProb(t, x, y) >= 0.5 ? 1 : 0;
  return v / forest.length;
}

export function forestImportance(forest: TreeNode[]): Record<Feature, number> {
  const out: Record<Feature, number> = { x: 0, y: 0 };
  for (const t of forest) {
    const i = treeImportance(t);
    out.x += i.x;
    out.y += i.y;
  }
  const total = out.x + out.y;
  return total > 0 ? { x: out.x / total, y: out.y / total } : { x: 0, y: 0 };
}

/** Fraction of points where the prediction (probability >= 0.5) matches the label. */
export function accuracy(prob: (x: number, y: number) => number, points: Sample[]): number {
  if (!points.length) return 0;
  return points.filter((p) => (prob(p.x, p.y) >= 0.5 ? 1 : 0) === p.c).length / points.length;
}

/* ---------- the demo data ---------- */

function gauss(rng: () => number) {
  const u = Math.max(1e-9, rng());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

const clip = (v: number) => Math.min(9.8, Math.max(0.2, v));

/**
 * Four lumps on a 10 by 10 square, two per class, so the border between the classes runs diagonally. A staircase
 * of straight cuts has to follow it. About one label in twelve is flipped so no tree can be perfect on fresh
 * points. Same seed, same points.
 */
export function makeDataset(seed: number, n: number, flip = 0.08, spread = 1.35): Sample[] {
  const rng = mulberry32(seed);
  const centres: { c: Cls; x: number; y: number }[] = [
    { c: 0, x: 6, y: 2.4 },
    { c: 1, x: 2, y: 4.6 },
    { c: 0, x: 8, y: 5.6 },
    { c: 1, x: 4, y: 7.8 },
  ];
  return Array.from({ length: n }, (_, i) => {
    const k = centres[i % 4];
    const x = clip(k.x + gauss(rng) * spread);
    const y = clip(k.y + gauss(rng) * spread);
    const c = (rng() < flip ? 1 - k.c : k.c) as Cls;
    return { x, y, c };
  });
}
