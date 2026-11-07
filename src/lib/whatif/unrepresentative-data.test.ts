import { describe, expect, it } from 'vitest';
import { USER_SHARE_B, accuracyAt, atShare, bestShareForUsers, curve, learnedCutoff, mixDots } from './unrepresentative-data';

describe('unrepresentative data what-if', () => {
  it('trained only on group A, the cut-off sits at group A boundary and group B does much worse', () => {
    const p = atShare(0);
    expect(p.cutoff).toBeCloseTo(0, 1);
    expect(p.accA).toBeGreaterThan(0.88);
    expect(p.accB).toBeLessThan(0.7);
    expect(p.gap).toBeGreaterThan(0.2);
  });
  it('trained only on group B, the cut-off sits at group B boundary and group A does worse', () => {
    const p = atShare(100);
    expect(p.cutoff).toBeCloseTo(1, 1);
    expect(p.accB).toBeGreaterThan(0.92);
    expect(p.accA).toBeLessThan(0.7);
  });
  it('the cut-off never moves backwards as group B grows, and group B accuracy never falls', () => {
    const c = curve();
    expect(c).toHaveLength(21);
    for (let i = 1; i < c.length; i++) {
      expect(c[i].cutoff).toBeGreaterThanOrEqual(c[i - 1].cutoff);
      expect(c[i].accB).toBeGreaterThanOrEqual(c[i - 1].accB - 1e-9);
      expect(c[i].accA).toBeLessThanOrEqual(c[i - 1].accA + 1e-9);
    }
  });
  it('the two groups cross over near the middle', () => {
    const c = curve();
    const lo = c.find((p) => p.accB >= p.accA)!;
    expect(lo.f).toBeGreaterThanOrEqual(40);
    expect(lo.f).toBeLessThanOrEqual(50);
  });
  it('at the example user share, group B is still behind', () => {
    const p = atShare(USER_SHARE_B * 100);
    expect(p.accA).toBeGreaterThan(p.accB + 0.1);
  });
  it('the best training share for the example users is about their own share', () => {
    expect(bestShareForUsers()).toBe(30);
    expect(atShare(30).users).toBeCloseTo(0.7 * atShare(30).accA + 0.3 * atShare(30).accB, 3);
  });
  it('accuracy is a probability and the learned cut-off is deterministic', () => {
    expect(learnedCutoff(0.5)).toBe(learnedCutoff(0.5));
    for (const g of ['A', 'B'] as const) for (const t of [-4, 0, 0.5, 1, 4]) {
      const a = accuracyAt(g, t);
      expect(a).toBeGreaterThan(0);
      expect(a).toBeLessThan(1);
    }
  });
  it('mix dots count the group B share', () => {
    expect(mixDots(30).filter(Boolean)).toHaveLength(30);
    expect(mixDots(0).some(Boolean)).toBe(false);
    expect(mixDots(100).every(Boolean)).toBe(true);
  });
});
