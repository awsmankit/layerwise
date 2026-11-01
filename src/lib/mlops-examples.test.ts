import { describe, expect, it } from 'vitest';
import { cohenKappa } from './kappa';

/*
 * Worked examples quoted in the lessons From notebook to production and Data pipelines and data quality.
 * They are invented example numbers; the tests make sure the arithmetic in the lesson text is right.
 */

describe('standard error of a daily mean (data pipelines lesson)', () => {
  const se = (sd: number, n: number) => sd / Math.sqrt(n);
  it('four standard errors is about 4.4 pounds on 120 rows and 5 pence on a million rows', () => {
    expect(4 * se(12, 120)).toBeCloseTo(4.38, 2);
    expect((4 * se(12, 120)) / 42).toBeCloseTo(0.104, 3);
    expect(4 * se(12, 1_000_000)).toBeCloseTo(0.048, 3);
    expect((4 * se(12, 1_000_000)) / 42).toBeCloseTo(0.0011, 4);
  });
});

describe('agreement between two labellers (data pipelines lesson)', () => {
  it('before the guideline fix: 80% agreement is kappa about 0.52', () => {
    const k = cohenKappa([
      [10, 5],
      [5, 30],
    ]);
    expect(k.n).toBe(50);
    expect(k.po).toBeCloseTo(0.8, 10);
    expect(k.pe).toBeCloseTo(0.58, 10);
    expect(k.kappa).toBeCloseTo(0.524, 3);
  });

  it('after the fix: 94% agreement is kappa about 0.85', () => {
    const k = cohenKappa([
      [12, 1],
      [2, 35],
    ]);
    expect(k.po).toBeCloseTo(0.94, 10);
    expect(k.pe).toBeCloseTo(0.6056, 4);
    expect(k.kappa).toBeCloseTo(0.848, 3);
  });

  it('an LLM labeller with 94% agreement on a 10% positive class still misses 40% of positives', () => {
    // rows: gold (urgent, not urgent); columns: LLM (urgent, not urgent). 200 items, 20 urgent.
    const table = [
      [12, 8],
      [4, 176],
    ];
    const k = cohenKappa(table);
    expect(k.po).toBeCloseTo(0.94, 10);
    expect(k.kappa).toBeCloseTo(0.634, 3);
    const precision = 12 / (12 + 4);
    const recall = 12 / (12 + 8);
    expect(precision).toBeCloseTo(0.75, 10);
    expect(recall).toBeCloseTo(0.6, 10);
  });
});

describe('point-in-time feature (data pipelines lesson)', () => {
  const orderDays = [1, 10, 25];
  const countAsOf = (days: number[], t: number) => days.filter((d) => d <= t).length;
  it('a snapshot taken on day 10 sees 2 orders, but the latest table says 3', () => {
    expect(countAsOf(orderDays, 10)).toBe(2);
    expect(countAsOf(orderDays, 40)).toBe(3);
  });
});
