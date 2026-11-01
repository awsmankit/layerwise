import { describe, expect, it } from 'vitest';
import { analyse, ci95, mean, mulberry32, normal, repeatTests, sd, simulateTest, tCdf, tQuantile, type SimParams } from './mos';

/* Reference values were computed offline with scipy 1.18.1 (scipy.stats.t, ttest_ind). */

describe("Student's t", () => {
  it('matches the 97.5th percentiles from scipy', () => {
    const ref: [number, number][] = [[1, 12.706205], [2, 4.302653], [5, 2.570582], [9, 2.262157], [29, 2.04523], [99, 1.984217], [198, 1.972017]];
    for (const [df, v] of ref) expect(tQuantile(0.975, df)).toBeCloseTo(v, 4);
  });
  it('matches other percentiles and the cdf', () => {
    expect(tQuantile(0.995, 7)).toBeCloseTo(3.499483, 4);
    expect(tQuantile(0.9, 3)).toBeCloseTo(1.637744, 4);
    expect(tQuantile(0.025, 9)).toBeCloseTo(-2.262157, 4);
    expect(tCdf(1.5, 6)).toBeCloseTo(0.90786, 5);
    expect(tCdf(-2, 12)).toBeCloseTo(0.034328, 5);
    expect(tCdf(0, 5)).toBeCloseTo(0.5, 12);
  });
  it('handles bad inputs', () => {
    expect(tQuantile(0, 5)).toBeNaN();
    expect(tQuantile(0.9, 0)).toBeNaN();
  });
});

describe('summary statistics', () => {
  const a = [3, 4, 4, 5, 2, 4, 3, 4];
  const b = [4, 4, 5, 5, 3, 4, 4, 5];
  it('gives the mean and a 95% t interval, as scipy does', () => {
    const c = ci95(a);
    expect(c.mean).toBeCloseTo(3.625, 12);
    expect(sd(a)).toBeCloseTo(0.9161253813, 9);
    expect(c.half).toBeCloseTo(0.7658999856, 8);
    expect(c.lo).toBeCloseTo(2.8591000144, 8);
    expect(c.hi).toBeCloseTo(4.3908999856, 8);
  });
  it('analyses a pair of systems: paired and unpaired interval half-widths', () => {
    const r = analyse({ a, b });
    expect(r.paired.mean).toBeCloseTo(0.625, 12);
    expect(r.paired.half).toBeCloseTo(0.43268193367973784, 8);
    expect(r.unpairedHalf).toBeCloseTo(0.8775577988318718, 8);
    expect(r.verdict).toBe('B');
  });
  it('says none when the interval includes zero', () => {
    expect(analyse({ a: [3, 4, 3, 4, 3, 4], b: [4, 3, 4, 3, 4, 3] }).verdict).toBe('none');
  });
  it('mean of a list', () => {
    expect(mean([1, 2, 3])).toBe(2);
  });
});

describe('the random generator', () => {
  it('is repeatable and stays in [0, 1)', () => {
    const r1 = mulberry32(7);
    const r2 = mulberry32(7);
    for (let i = 0; i < 100; i++) {
      const v = r1();
      expect(v).toBe(r2());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('draws normal numbers with about zero mean and unit spread', () => {
    const r = mulberry32(3);
    const xs = Array.from({ length: 20000 }, () => normal(r));
    expect(Math.abs(mean(xs))).toBeLessThan(0.03);
    expect(Math.abs(sd(xs) - 1)).toBeLessThan(0.03);
  });
});

describe('the simulated listening test', () => {
  const p: SimParams = { trueA: 3.4, trueB: 3.8, listeners: 20, biasSd: 0.6, noiseSd: 0.8 };
  it('gives whole-star ratings from 1 to 5, one per listener per system, and repeats for the same seed', () => {
    const r = simulateTest(p, 5);
    expect(r.a).toHaveLength(20);
    expect(r.b).toHaveLength(20);
    for (const v of [...r.a, ...r.b]) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(5);
    }
    expect(simulateTest(p, 5)).toEqual(r);
    expect(simulateTest(p, 6)).not.toEqual(r);
  });
  it('with no spread at all, every rating is the true quality rounded', () => {
    const r = simulateTest({ trueA: 3.4, trueB: 4.6, listeners: 5, biasSd: 0, noiseSd: 0 }, 1);
    expect(r.a).toEqual([3, 3, 3, 3, 3]);
    expect(r.b).toEqual([5, 5, 5, 5, 5]);
  });
  it('the interval gets narrower as listeners are added', () => {
    const half = (n: number) => analyse(simulateTest({ ...p, listeners: n }, 11)).a.half;
    expect(half(100)).toBeLessThan(half(10));
  });
  it('a paired comparison is tighter than separate groups when listeners differ in harshness', () => {
    const r = analyse(simulateTest({ ...p, listeners: 40, biasSd: 0.9 }, 2));
    expect(r.paired.half).toBeLessThan(r.unpairedHalf);
  });
  it('more listeners find a real difference more often', () => {
    const few = repeatTests({ ...p, listeners: 5 }, 300);
    const many = repeatTests({ ...p, listeners: 80 }, 300);
    expect(many.B).toBeGreaterThan(few.B);
    expect(few.A + few.B + few.none).toBe(300);
    expect(many.A).toBeLessThanOrEqual(few.A + 3);
  });
  it('has fixed detection rates for the example used in the lesson (seed base 1000, 200 tests)', () => {
    const base: SimParams = { trueA: 3.4, trueB: 3.8, listeners: 10, biasSd: 0.6, noiseSd: 0.8 };
    const rate = (n: number) => repeatTests({ ...base, listeners: n }, 200).B;
    expect([5, 10, 20, 40, 80, 160].map(rate)).toEqual([10, 30, 59, 112, 161, 199]);
  });
  it('finds nothing when the two systems are equal, in about 95% of tests', () => {
    const t = repeatTests({ ...p, trueB: p.trueA, listeners: 30 }, 400);
    expect(t.none / 400).toBeGreaterThan(0.9);
  });
});
