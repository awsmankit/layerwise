import { describe, expect, it } from 'vitest';
import { bestRound, boost, boostPredict, earlyStopRound, fitRegTree, lossCurve, makeCurveData, predictReg, target, treeSteps } from './boosting';

/* The five-row example from the lesson: x = 1..5, y = 3, 5, 4, 9, 11, one-split trees, learning rate 0.5. */
const FIVE = [
  { x: 1, y: 3 },
  { x: 2, y: 5 },
  { x: 3, y: 4 },
  { x: 4, y: 9 },
  { x: 5, y: 11 },
];

describe('fitRegTree', () => {
  it('splits at 3.5 and predicts the mean of each side', () => {
    const t = fitRegTree([1, 2, 3, 4, 5], [-3.4, -1.4, -2.4, 2.6, 4.6], 1);
    expect(t.leaf).toBe(false);
    if (!t.leaf) {
      expect(t.threshold).toBe(3.5);
      expect(predictReg(t, 2)).toBeCloseTo(-2.4, 10);
      expect(predictReg(t, 5)).toBeCloseTo(3.6, 10);
    }
  });

  it('depth 0 is a single leaf holding the mean', () => {
    const t = fitRegTree([1, 2, 3], [2, 4, 9], 0);
    expect(t.leaf && t.value).toBeCloseTo(5, 10);
  });

  it('cannot split between equal x values', () => {
    const t = fitRegTree([1, 1, 1], [1, 2, 3], 3);
    expect(t.leaf).toBe(true);
  });

  it('a deeper tree fits at least as closely', () => {
    const d = makeCurveData(3, 40);
    const xs = d.map((p) => p.x);
    const ys = d.map((p) => p.y);
    const err = (depth: number) => {
      const t = fitRegTree(xs, ys, depth);
      return xs.reduce((s, x, i) => s + (ys[i] - predictReg(t, x)) ** 2, 0);
    };
    expect(err(1)).toBeLessThan(err(0));
    expect(err(3)).toBeLessThan(err(1));
  });

  it('treeSteps tiles the range', () => {
    const t = fitRegTree([1, 2, 3, 4, 5], [1, 1, 5, 5, 9], 2);
    const s = treeSteps(t, 0, 10);
    expect(s[0].x0).toBe(0);
    expect(s[s.length - 1].x1).toBe(10);
    for (let i = 1; i < s.length; i++) expect(s[i].x0).toBe(s[i - 1].x1);
  });
});

describe('boost (hand-checkable)', () => {
  const at = (rounds: number) => boost(FIVE, { rounds, learningRate: 0.5, depth: 1 });
  const preds = (m: ReturnType<typeof at>) => FIVE.map((p) => boostPredict(m, p.x));

  it('round 0 predicts the mean, 6.4, with residuals -3.4, -1.4, -2.4, 2.6, 4.6', () => {
    const m = at(0);
    expect(m.base).toBeCloseTo(6.4, 10);
    FIVE.forEach((p, i) => expect(p.y - boostPredict(m, p.x)).toBeCloseTo([-3.4, -1.4, -2.4, 2.6, 4.6][i], 10));
  });

  it('round 1 predicts 5.2, 5.2, 5.2, 8.2, 8.2', () => {
    const p = preds(at(1));
    [5.2, 5.2, 5.2, 8.2, 8.2].forEach((v, i) => expect(p[i]).toBeCloseTo(v, 10));
  });

  it('round 2 predicts 4.6, 4.6, 4.6, 9.1, 9.1 and leaves residuals -1.6, 0.4, -0.6, -0.1, 1.9', () => {
    const m = at(2);
    const p = preds(m);
    [4.6, 4.6, 4.6, 9.1, 9.1].forEach((v, i) => expect(p[i]).toBeCloseTo(v, 10));
    FIVE.forEach((q, i) => expect(q.y - p[i]).toBeCloseTo([-1.6, 0.4, -0.6, -0.1, 1.9][i], 10));
  });

  it('boostPredict with fewer rounds matches a model trained for fewer rounds', () => {
    const m = at(3);
    for (const r of [0, 1, 2]) for (const p of FIVE) expect(boostPredict(m, p.x, r)).toBeCloseTo(boostPredict(at(r), p.x), 10);
  });

  it('training error falls with every round', () => {
    const c = lossCurve(boost(FIVE, { rounds: 8, learningRate: 0.5, depth: 1 }), FIVE);
    for (let i = 1; i < c.length; i++) expect(c[i]).toBeLessThan(c[i - 1]);
    expect(c[0]).toBeCloseTo((3.4 ** 2 + 1.4 ** 2 + 2.4 ** 2 + 2.6 ** 2 + 4.6 ** 2) / 5, 10);
  });
});

describe('learning rate, rounds and early stopping', () => {
  const train = makeCurveData(3, 40);
  const valid = makeCurveData(53, 40);

  it('lossCurve has rounds + 1 entries and starts at the loss of the mean', () => {
    const m = boost(train, { rounds: 10, learningRate: 0.1, depth: 2 });
    const c = lossCurve(m, train);
    expect(c).toHaveLength(11);
    expect(c[0]).toBeGreaterThan(c[10]);
  });

  it('a small learning rate needs more rounds to reach the same training error', () => {
    const slow = lossCurve(boost(train, { rounds: 30, learningRate: 0.05, depth: 2 }), train);
    const fast = lossCurve(boost(train, { rounds: 30, learningRate: 0.5, depth: 2 }), train);
    expect(fast[30]).toBeLessThan(slow[30]);
  });

  it('validation error bottoms out and then rises while training error keeps falling', () => {
    const m = boost(train, { rounds: 200, learningRate: 0.1, depth: 3 });
    const tr = lossCurve(m, train);
    const va = lossCurve(m, valid);
    const best = bestRound(va);
    expect(best).toBeGreaterThan(5);
    expect(best).toBeLessThan(150);
    expect(va[200]).toBeGreaterThan(va[best] + 0.02);
    expect(tr[200]).toBeLessThan(tr[best]);
  });

  it('early stopping with patience 10 stops at the best round seen so far', () => {
    const va = [5, 4, 3, 2.5, 2.4, 2.45, 2.5, 2.6, 2.3, 2.7];
    expect(bestRound(va)).toBe(8);
    expect(earlyStopRound(va, 3)).toBe(4);
    expect(earlyStopRound(va, 5)).toBe(8);
  });
});

describe('demo data', () => {
  it('is repeatable and sorted by x inside 0..10', () => {
    const a = makeCurveData(3, 40);
    expect(a).toEqual(makeCurveData(3, 40));
    for (let i = 1; i < a.length; i++) expect(a[i].x).toBeGreaterThanOrEqual(a[i - 1].x);
    expect(a.every((p) => p.x >= 0 && p.x <= 10)).toBe(true);
    expect(Math.abs(a[0].y - target(a[0].x))).toBeLessThan(2.5);
  });
});
