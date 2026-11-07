import { describe, expect, it } from "vitest";
import {
  DEFAULT_ROWS,
  FOLDS,
  REPEATS,
  crossValidate,
  holdout,
  makeRows,
  mean,
  predict,
  sd,
  shuffled,
  splitSeed,
  study,
} from "./no-cross-validation";

describe("no cross-validation what-if", () => {
  it("rows are deterministic and growing the dataset keeps the first rows", () => {
    const a = makeRows(60);
    expect(makeRows(60)).toEqual(a);
    expect(makeRows(100).slice(0, 60)).toEqual(a);
  });

  it("predict: hand-checked 5-nearest-neighbours vote", () => {
    const train = [
      { x: 0, y: 0, label: 1 },
      { x: 0.1, y: 0, label: 1 },
      { x: 0.2, y: 0, label: 1 },
      { x: 5, y: 5, label: 0 },
      { x: 5.1, y: 5, label: 0 },
      { x: 5.2, y: 5, label: 0 },
    ] as const;
    // the 5 closest to (0,0) are the three 1s and two 0s: 3 against 2
    expect(predict([...train], { x: 0, y: 0, label: 0 })).toBe(1);
    expect(predict([...train], { x: 5, y: 5, label: 1 })).toBe(0);
  });

  it("a shuffle is a permutation and the same seed gives the same one", () => {
    const p = shuffled(30, 7);
    expect([...p].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 30 }, (_, i) => i),
    );
    expect(shuffled(30, 7)).toEqual(p);
    expect(shuffled(30, 8)).not.toEqual(p);
  });

  it("a holdout split tests exactly a fifth of the rows and score = right / tested", () => {
    const rows = makeRows(60);
    const h = holdout(rows, 5);
    expect(h.test).toHaveLength(12);
    expect(new Set(h.test).size).toBe(12);
    expect(h.accuracy).toBe(h.correct.filter(Boolean).length / 12);
  });

  it("5-fold tests every row exactly once, in five equal parts, and the mean is the mean of the folds", () => {
    const rows = makeRows(60);
    const cv = crossValidate(rows, 11);
    expect(cv.folds).toHaveLength(FOLDS);
    const all = cv.folds.flatMap((f) => f.test).sort((a, b) => a - b);
    expect(all).toEqual(Array.from({ length: 60 }, (_, i) => i));
    for (const f of cv.folds) expect(f.test).toHaveLength(12);
    expect(cv.mean).toBeCloseTo(mean(cv.folds.map((f) => f.accuracy)), 12);
    // with equal folds the average of fold scores is the share of all rows predicted right
    const right = cv.folds.reduce(
      (s, f) => s + f.correct.filter(Boolean).length,
      0,
    );
    expect(cv.mean).toBeCloseTo(right / 60, 12);
  });

  it("mean and sample standard deviation", () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
    expect(sd([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(Math.sqrt(32 / 7), 12);
  });

  it("on the default 60 rows, single splits swing widely and cross-validation averages are steadier", () => {
    const s = study(makeRows(DEFAULT_ROWS));
    expect(s.single).toHaveLength(REPEATS);
    expect(s.cvMeans).toHaveLength(REPEATS);
    expect(Math.max(...s.single) - Math.min(...s.single)).toBeGreaterThan(0.3);
    expect(Math.max(...s.cvMeans) - Math.min(...s.cvMeans)).toBeLessThan(0.2);
    expect(sd(s.single)).toBeGreaterThan(2 * sd(s.cvMeans));
    // the real accuracy sits inside both ranges
    expect(s.truth).toBeGreaterThan(Math.min(...s.single));
    expect(s.truth).toBeLessThan(Math.max(...s.single));
    expect(s.truth).toBeGreaterThan(0.6);
    expect(s.truth).toBeLessThan(0.8);
  });

  it("more rows shrink the spread of single-split scores", () => {
    const small = study(makeRows(40));
    const big = study(makeRows(160));
    expect(sd(big.single)).toBeLessThan(sd(small.single));
    expect(sd(small.single)).toBeGreaterThan(0.1);
  });

  it("seeds for the splits are distinct", () => {
    expect(
      new Set(Array.from({ length: REPEATS }, (_, i) => splitSeed(i))).size,
    ).toBe(REPEATS);
  });
});
