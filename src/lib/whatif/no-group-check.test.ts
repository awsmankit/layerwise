import { describe, expect, it } from 'vitest';
import { errorDots, evaluate, groupSizes, largestSharePassing, passesEveryGroup, passesOverall, wilson } from './no-group-check';

describe('no group check what-if', () => {
  it('splits 1000 people by minority share', () => {
    expect(groupSizes(10)).toEqual({ nA: 900, nB: 100 });
    expect(groupSizes(0)).toEqual({ nA: 999, nB: 1 });
    expect(groupSizes(100)).toEqual({ nA: 1, nB: 999 });
  });
  it('at 10 percent minority the overall accuracy is 93.6 percent while group B is at 72 percent', () => {
    const s = evaluate(10);
    // A: 900 people, 4 percent wrong = 36 errors. B: 100 people, 28 errors. Correct = 864 + 72 = 936.
    expect(s.A.errors).toBe(36);
    expect(s.B.errors).toBe(28);
    expect(s.overall).toBeCloseTo(0.936, 10);
    expect(s.A.accuracy).toBeCloseTo(0.96, 10);
    expect(s.B.accuracy).toBeCloseTo(0.72, 10);
    expect(s.gap).toBeCloseTo(0.216, 10);
    // B positives = 30, missed = round(30 * 0.4) = 12
    expect(s.B.positives).toBe(30);
    expect(s.B.missed).toBe(12);
    expect(s.B.missShare).toBeCloseTo(0.4, 10);
    expect(s.A.missShare).toBeCloseTo(11 / 270, 10);
  });
  it('the overall rule passes while the per-group rule fails', () => {
    const s = evaluate(10);
    expect(passesOverall(s)).toBe(true);
    expect(passesEveryGroup(s)).toBe(false);
  });
  it('the overall rule passes up to a 25 percent minority share, then fails', () => {
    // overall = 0.96 - 0.24 * share >= 0.9  =>  share <= 0.25
    expect(largestSharePassing()).toBe(25);
    expect(passesOverall(evaluate(26))).toBe(false);
  });
  it('the overall number falls as the minority share grows, the group B accuracy does not move', () => {
    let prev = 2;
    for (let p = 2; p <= 50; p += 4) {
      const s = evaluate(p);
      expect(s.overall).toBeLessThan(prev);
      prev = s.overall;
      expect(s.B.accuracy).toBeGreaterThan(0.69);
      expect(s.B.accuracy).toBeLessThan(0.75);
    }
  });
  it('the interval for the small group is wider, and shrinks as it grows', () => {
    const w = (p: number) => {
      const [lo, hi] = evaluate(p).B.accuracyCI;
      return hi - lo;
    };
    expect(w(2)).toBeGreaterThan(w(10));
    expect(w(10)).toBeGreaterThan(w(50));
    const [lo, hi] = evaluate(10).B.accuracyCI;
    expect(lo).toBeLessThan(0.72);
    expect(hi).toBeGreaterThan(0.72);
  });
  it('wilson works at the edges', () => {
    expect(wilson(0, 0)).toEqual([0, 1]);
    const [lo, hi] = wilson(50, 100);
    expect(lo).toBeCloseTo(0.4038, 3);
    expect(hi).toBeCloseTo(0.5962, 3);
    expect(wilson(0, 20)[0]).toBe(0);
  });
  it('error dots are spread evenly and add up', () => {
    const d = errorDots(100, 28);
    expect(d.filter(Boolean)).toHaveLength(28);
    expect(errorDots(10, 0).some(Boolean)).toBe(false);
    expect(errorDots(10, 10).every(Boolean)).toBe(true);
  });
});
