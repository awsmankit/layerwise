import { describe, expect, it } from 'vitest';
import {
  CASES_PER_GROUP,
  FLOOR,
  RELEASES,
  blocked,
  cases,
  firstBlocked,
  flips,
  groupPass,
  groups,
  intervalsOverlap,
  mulberry32,
  overallRate,
  passes,
  pct,
  totalPass,
  wilson,
} from './no-evals';

describe('no-evals', () => {
  it('has 40 cases, 8 per group', () => {
    expect(cases).toHaveLength(40);
    for (const g of groups) expect(cases.filter((c) => c.group === g.id)).toHaveLength(CASES_PER_GROUP);
  });

  it('the random generator is repeatable', () => {
    const a = mulberry32(5);
    const b = mulberry32(5);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(mulberry32(5)()).not.toBe(mulberry32(6)());
  });

  it('wilson interval matches the hand calculation for 30 of 40', () => {
    // p = 0.75, z = 1.96: centre 0.72811, half width 0.13004
    const w = wilson(30, 40);
    expect(w.lo).toBeCloseTo(0.598, 3);
    expect(w.hi).toBeCloseTo(0.858, 3);
  });

  it('wilson interval edge cases and behaviour', () => {
    expect(wilson(0, 0)).toEqual({ lo: 0, hi: 1 });
    expect(wilson(0, 40).lo).toBe(0);
    expect(wilson(40, 40).hi).toBe(1);
    const small = wilson(15, 20);
    const big = wilson(150, 200);
    expect(big.hi - big.lo).toBeLessThan(small.hi - small.lo);
    for (const k of [0, 5, 20, 40]) {
      const w = wilson(k, 40);
      expect(w.lo).toBeLessThanOrEqual(k / 40);
      expect(w.hi).toBeGreaterThanOrEqual(k / 40);
    }
  });

  it('the average creeps up while the important group collapses', () => {
    const totals = Array.from({ length: RELEASES }, (_, i) => totalPass(i + 1));
    expect(totals).toEqual([27, 28, 29, 29, 30, 30]);
    const refund = Array.from({ length: RELEASES }, (_, i) => groupPass('refund', i + 1));
    expect(refund).toEqual([7, 8, 8, 8, 3, 3]);
    expect(overallRate(5)).toBeGreaterThan(overallRate(4));
    expect(groupPass('refund', 5)).toBeLessThan(groupPass('refund', 4));
  });

  it('group counts add up to the total', () => {
    for (let r = 1; r <= RELEASES; r++) {
      expect(groups.reduce((a, g) => a + groupPass(g.id, r), 0)).toBe(totalPass(r));
    }
  });

  it('release 5 broke five refund cases and fixed six others, so the net is plus one', () => {
    const f = flips(5);
    expect(f.broke.map((c) => c.id)).toEqual(['refund-1', 'refund-3', 'refund-4', 'refund-5', 'refund-7']);
    expect(f.fixed).toHaveLength(6);
    expect(f.fixed.length - f.broke.length).toBe(totalPass(5) - totalPass(4));
    expect(flips(1)).toEqual({ broke: [], fixed: [] });
  });

  it('a case that passes at a lower skill still passes at a higher one (monotone)', () => {
    // refund skill rises R1 to R2, so nothing that passed in R1 can fail in R2
    expect(flips(2).broke).toHaveLength(0);
    expect(cases.filter((c) => passes(c, 1)).every((c) => passes(c, 2))).toBe(true);
  });

  it('the ship gate blocks release 5 and stays blocked while the group is below the floor', () => {
    expect([1, 2, 3, 4, 5, 6].map((r) => blocked(r))).toEqual([false, false, false, false, true, true]);
    expect(firstBlocked()).toBe(5);
    expect(groupPass('refund', 5)).toBeLessThan(FLOOR);
  });

  it('the overall interval always overlaps the one before, so the average alone cannot show the change', () => {
    for (let r = 2; r <= RELEASES; r++) expect(intervalsOverlap(r)).toBe(true);
  });

  it('formats percentages', () => {
    expect(pct(0.725)).toBe('72.5%');
    expect(pct(30 / 40)).toBe('75.0%');
  });
});
