import { describe, expect, it } from "vitest";
import {
  FEATURES,
  N_TRAIN,
  POOL,
  TEST_SIZES,
  accuracyOf,
  correctness,
  diffInterval,
  makeRows,
  report,
  testPool,
  trainAll,
  trainRows,
  verdict,
  wilson,
} from "./no-baseline";

describe("no baseline what-if", () => {
  it("rows are deterministic and faults are rare (about one in nine)", () => {
    const a = trainRows();
    expect(a).toHaveLength(N_TRAIN);
    expect(trainRows()).toEqual(a);
    expect(a[0].x).toHaveLength(FEATURES);
    const share = a.filter((r) => r.y === 1).length / a.length;
    expect(share).toBeGreaterThan(0.07);
    expect(share).toBeLessThan(0.16);
    expect(testPool()).toHaveLength(POOL);
    // the test pool is separate from the training rows
    expect(testPool()[0]).not.toEqual(a[0]);
  });

  it("the majority baseline predicts the common label and scores the share of that label", () => {
    const t = trainAll();
    const majority = t.models[0];
    expect(majority.id).toBe("majority");
    expect(majority.predict(makeRows(1, 1)[0].x)).toBe(0);
    const test = testPool().slice(0, 400);
    const right = test.filter((r) => r.y === 0).length / 400;
    expect(accuracyOf(correctness(t.models, 400)[0])).toBeCloseTo(right, 12);
  });

  it("Wilson interval: hand-checked for 50 of 100 and sane at the edges", () => {
    const [lo, hi] = wilson(50, 100);
    expect(lo).toBeCloseTo(0.4038, 3);
    expect(hi).toBeCloseTo(0.5962, 3);
    const [l0, h0] = wilson(0, 50);
    expect(l0).toBeCloseTo(0, 10);
    expect(h0).toBeGreaterThan(0.05);
    expect(wilson(100, 100)[1]).toBeCloseTo(1, 10);
  });

  it("paired bootstrap interval: no disagreement gives a zero-width interval at 0; one-sided disagreement gives a positive one", () => {
    const same = Array.from({ length: 100 }, (_, i) => i % 3 !== 0);
    expect(diffInterval(same, same)).toEqual({ diff: 0, lo: 0, hi: 0 });
    // A is right on 100 rows, B is wrong on 10 of them: A is better by 10 points, always
    const a = new Array(100).fill(true);
    const b = a.map((_, i) => i >= 10);
    const d = diffInterval(a, b);
    expect(d.diff).toBeCloseTo(0.1, 12);
    expect(d.lo).toBeGreaterThan(0.03);
    expect(d.hi).toBeLessThan(0.2);
    expect(d.lo).toBeLessThanOrEqual(d.diff);
    expect(d.hi).toBeGreaterThanOrEqual(d.diff);
  });

  it("a bigger test set narrows the interval on the difference (same disagreement rate)", () => {
    const mk = (n: number) => {
      const a = new Array(n).fill(false).map((_, i) => i % 20 < 12);
      const b = new Array(n).fill(false).map((_, i) => i % 20 < 10);
      return diffInterval(a, b);
    };
    const small = mk(100);
    const big = mk(800);
    expect(big.hi - big.lo).toBeLessThan((small.hi - small.lo) * 0.6);
  });

  it("verdicts: the four cases", () => {
    expect(verdict(0.035, 0.06, 0.03)).toBe("worth-it");
    expect(verdict(0.01, 0.05, 0.03)).toBe("small");
    expect(verdict(-0.01, 0.04, 0.03)).toBe("cannot-tell");
    expect(verdict(0, 0.02, 0)).toBe("cannot-tell");
    expect(verdict(-0.05, -0.01, 0)).toBe("worse");
    expect(verdict(0.001, 0.02, 0)).toBe("worth-it");
  });

  it("the headline: a fancy model near 90% against a baseline near 89%, and the gain is not clearly large", () => {
    const t = trainAll();
    const r = report(t, 400);
    expect(r.acc[r.fancy]).toBeGreaterThan(0.89);
    expect(r.acc[r.fancy]).toBeLessThan(0.93);
    expect(r.acc[r.best]).toBeGreaterThan(0.87);
    expect(r.acc[r.fancy] - r.acc[r.best]).toBeLessThan(0.03);
    expect(r.diff.diff).toBeCloseTo(r.acc[r.fancy] - r.acc[r.best], 12);
    expect(r.diff.lo).toBeLessThan(0.01);
    // the "strongest simple model" is picked on training rows and is never the fancy one
    expect(t.models[r.best].fancy).toBe(false);
  });

  it("the fancy model fits the training rows better than the baselines (it can memorise some), which is not the same as being better", () => {
    const t = trainAll();
    const r = report(t, 400);
    expect(r.trainAcc[r.fancy]).toBeGreaterThan(r.trainAcc[0] + 0.02);
    expect(r.acc[r.fancy] - r.acc[0]).toBeLessThan(
      r.trainAcc[r.fancy] - r.trainAcc[0],
    );
  });

  it("every test size gives an interval that contains the observed gain", () => {
    const t = trainAll();
    for (const m of TEST_SIZES) {
      const r = report(t, m);
      expect(r.m).toBe(m);
      expect(r.diff.lo).toBeLessThanOrEqual(r.diff.diff + 1e-12);
      expect(r.diff.hi).toBeGreaterThanOrEqual(r.diff.diff - 1e-12);
      for (const [lo, hi] of r.ci) {
        expect(lo).toBeLessThan(hi);
      }
    }
    expect(report(t, 800).diff.hi - report(t, 800).diff.lo).toBeLessThan(
      report(t, 100).diff.hi - report(t, 100).diff.lo + 0.02,
    );
  });

  it("the one-sensor rule never beats always-the-common-answer on these rare faults, so it falls back to it", () => {
    const t = trainAll();
    expect(t.ruleInfo.feature).toBe(-1);
    const probe = makeRows(50, 3);
    for (const r of probe)
      expect(t.models[1].predict(r.x)).toBe(t.models[0].predict(r.x));
  });
});
