import { describe, expect, it } from 'vitest';
import { accuracy, bestSplit, bootstrap, buildForest, buildTree, evaluateCounts, evaluateSplit, forestImportance, forestVote, impurity, leafCount, makeDataset, mulberry32, treeDepth, treeImportance, treeProb, treeRegions, type Sample } from './trees';

/*
 * The ten-student table from the lesson. Revised = "revised at least 4 hours", Slept = "slept 8 hours".
 *   1-3: revised, slept, pass     4-5: revised, not slept, pass     6: revised, slept, fail
 *   7: not revised, slept, fail   8-10: not revised, not slept, fail
 */
describe('impurity by hand', () => {
  it('Gini of a 5/5 group is 0.5, of a pure group 0, of 5 in 6 is 0.2778', () => {
    expect(impurity(5, 5)).toBeCloseTo(0.5, 10);
    expect(impurity(0, 4)).toBe(0);
    expect(impurity(1, 5)).toBeCloseTo(1 - 25 / 36 - 1 / 36, 10);
    expect(impurity(1, 5)).toBeCloseTo(0.2778, 4);
    expect(impurity(0, 0)).toBe(0);
  });

  it('entropy of a 5/5 group is 1 bit, of a pure group 0, of 1 in 6 is 0.650', () => {
    expect(impurity(5, 5, 'entropy')).toBeCloseTo(1, 10);
    expect(impurity(0, 4, 'entropy')).toBe(0);
    expect(impurity(1, 5, 'entropy')).toBeCloseTo(0.65, 3);
  });

  it('question "revised at least 4 hours": left 1 fail + 5 pass, right 4 fail', () => {
    const e = evaluateCounts([1, 5], [4, 0]);
    expect(e.parent).toBeCloseTo(0.5, 10);
    expect(e.weighted).toBeCloseTo(0.6 * 0.2778, 3);
    expect(e.weighted).toBeCloseTo(0.1667, 4);
    expect(e.drop).toBeCloseTo(0.3333, 4);
    const h = evaluateCounts([1, 5], [4, 0], 'entropy');
    expect(h.weighted).toBeCloseTo(0.39, 3);
    expect(h.drop).toBeCloseTo(0.61, 3);
  });

  it('question "slept 8 hours": 2 fail + 3 pass versus 3 fail + 2 pass, barely helps', () => {
    const e = evaluateCounts([2, 3], [3, 2]);
    expect(e.impLeft).toBeCloseTo(0.48, 10);
    expect(e.weighted).toBeCloseTo(0.48, 10);
    expect(e.drop).toBeCloseTo(0.02, 10);
    expect(evaluateCounts([2, 3], [3, 2], 'entropy').drop).toBeCloseTo(0.029, 3);
  });

  it('a split that changes nothing has a zero drop', () => {
    expect(evaluateCounts([2, 2], [3, 3]).drop).toBeCloseTo(0, 10);
  });
});

const TINY: Sample[] = [
  { x: 1, y: 5, c: 0 },
  { x: 2, y: 1, c: 0 },
  { x: 3, y: 6, c: 0 },
  { x: 7, y: 2, c: 1 },
  { x: 8, y: 7, c: 1 },
  { x: 9, y: 4, c: 1 },
];

describe('bestSplit', () => {
  it('finds the clean cut between the classes along x', () => {
    const s = bestSplit(TINY)!;
    expect(s.feature).toBe('x');
    expect(s.threshold).toBeCloseTo(5, 10);
    expect(s.eval.drop).toBeCloseTo(0.5, 10);
    expect(s.eval.weighted).toBe(0);
  });

  it('returns null when nothing can help', () => {
    expect(bestSplit([{ x: 1, y: 1, c: 0 }, { x: 1, y: 1, c: 1 }])).toBeNull();
    expect(bestSplit([])).toBeNull();
  });

  it('counts rows with value <= threshold on the left', () => {
    const e = evaluateSplit(TINY, 'x', 3);
    expect(e.left).toEqual([3, 0]);
    expect(e.right).toEqual([0, 3]);
  });

  it('respects a minimum leaf size', () => {
    const s = bestSplit(TINY, 'gini', ['x'], 3)!;
    expect(s.threshold).toBeCloseTo(5, 10);
    expect(bestSplit(TINY, 'gini', ['x'], 4)).toBeNull();
  });
});

describe('buildTree', () => {
  it('depth 0 is one leaf with the class mix', () => {
    const t = buildTree(TINY, { maxDepth: 0 });
    expect(t.kind).toBe('leaf');
    expect(treeProb(t, 0, 0)).toBe(0.5);
  });

  it('depth 1 separates the tiny set perfectly', () => {
    const t = buildTree(TINY, { maxDepth: 3 });
    expect(treeDepth(t)).toBe(1);
    expect(leafCount(t)).toBe(2);
    expect(accuracy((x, y) => treeProb(t, x, y), TINY)).toBe(1);
  });

  it('a deep tree memorises noisy training data and depth never exceeds the limit', () => {
    const train = makeDataset(4, 50);
    const t = buildTree(train, { maxDepth: 12 });
    expect(accuracy((x, y) => treeProb(t, x, y), train)).toBe(1);
    expect(treeDepth(buildTree(train, { maxDepth: 3 }))).toBeLessThanOrEqual(3);
  });

  it('a deep tree does worse on fresh points than a shallow one (the overfitting story)', () => {
    const train = makeDataset(4, 50);
    const fresh = makeDataset(104, 2000);
    const shallow = buildTree(train, { maxDepth: 2 });
    const deep = buildTree(train, { maxDepth: 12 });
    const a = accuracy((x, y) => treeProb(shallow, x, y), fresh);
    const b = accuracy((x, y) => treeProb(deep, x, y), fresh);
    expect(a).toBeGreaterThan(b);
  });

  it('regions tile the square exactly', () => {
    const t = buildTree(makeDataset(4, 50), { maxDepth: 4 });
    const area = treeRegions(t, { x0: 0, x1: 10, y0: 0, y1: 10 }).reduce((s, r) => s + (r.x1 - r.x0) * (r.y1 - r.y0), 0);
    expect(area).toBeCloseTo(100, 8);
    expect(treeRegions(t, { x0: 0, x1: 10, y0: 0, y1: 10 })).toHaveLength(leafCount(t));
  });

  it('feature importance adds to 1 and puts everything on x for the tiny set', () => {
    const t = buildTree(TINY, { maxDepth: 3 });
    const imp = treeImportance(t);
    expect(imp.x).toBeCloseTo(1, 10);
    expect(imp.y).toBe(0);
    const imp2 = treeImportance(buildTree(makeDataset(4, 50), { maxDepth: 5 }));
    expect(imp2.x + imp2.y).toBeCloseTo(1, 10);
  });
});

describe('forests', () => {
  it('bootstrap draws the same number of rows, with repeats, from the original', () => {
    const rows = makeDataset(4, 50);
    const b = bootstrap(rows, mulberry32(3));
    expect(b).toHaveLength(50);
    expect(new Set(b).size).toBeLessThan(50);
    expect(b.every((r) => rows.includes(r))).toBe(true);
  });

  it('is repeatable for the same seed and different for another', () => {
    const rows = makeDataset(4, 50);
    const a = buildForest(rows, { nTrees: 5, maxDepth: 6, seed: 1, maxFeatures: 1 });
    const b = buildForest(rows, { nTrees: 5, maxDepth: 6, seed: 1, maxFeatures: 1 });
    const c = buildForest(rows, { nTrees: 5, maxDepth: 6, seed: 2, maxFeatures: 1 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c));
  });

  it('votes are shares between 0 and 1, and an empty forest says 0.5', () => {
    const f = buildForest(makeDataset(4, 50), { nTrees: 11, maxDepth: 6, seed: 1, maxFeatures: 1 });
    for (const [x, y] of [[1, 1], [5, 5], [9, 9], [2, 8]]) {
      const v = forestVote(f, x, y);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(forestVote([], 1, 1)).toBe(0.5);
  });

  it('a forest of fully grown trees beats one fully grown tree on fresh points (several datasets)', () => {
    let forestWins = 0;
    const seeds = [1, 2, 4, 5, 6, 8, 11, 12];
    for (const seed of seeds) {
      const train = makeDataset(seed, 50);
      const fresh = makeDataset(seed + 100, 2000);
      const one = buildTree(train, { maxDepth: 12 });
      const forest = buildForest(train, { nTrees: 50, maxDepth: 12, seed: 9, maxFeatures: 1 });
      const a = accuracy((x, y) => treeProb(one, x, y), fresh);
      const b = accuracy((x, y) => forestVote(forest, x, y), fresh);
      if (b > a) forestWins++;
    }
    expect(forestWins).toBeGreaterThanOrEqual(6);
  });

  it('forest importance adds to 1', () => {
    const f = buildForest(makeDataset(4, 50), { nTrees: 9, maxDepth: 5, seed: 1, maxFeatures: 1 });
    const i = forestImportance(f);
    expect(i.x + i.y).toBeCloseTo(1, 10);
  });
});

describe('makeDataset', () => {
  it('is repeatable, stays inside the square, and has both classes', () => {
    const a = makeDataset(4, 50);
    expect(a).toEqual(makeDataset(4, 50));
    expect(a.every((p) => p.x >= 0 && p.x <= 10 && p.y >= 0 && p.y <= 10)).toBe(true);
    const ones = a.filter((p) => p.c === 1).length;
    expect(ones).toBeGreaterThan(15);
    expect(ones).toBeLessThan(35);
  });
});
