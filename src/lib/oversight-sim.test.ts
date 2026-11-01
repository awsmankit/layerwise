import { describe, expect, it } from 'vitest';
import {
  ATTENTION_FLOOR,
  BASE_CATCH,
  COMFORTABLE_ITEMS,
  TIERS,
  TIER_SHARE,
  attention,
  catchProbability,
  effectiveBias,
  expected,
  makeRng,
  missedShare,
  reviewShare,
  simulate,
  tierErrorRates,
  type Params,
} from './oversight-sim';

const base: Params = { n: 400, errorRate: 0.08, bias: 0.3, forcing: false, policy: { kind: 'all' } };

describe('tier error rates', () => {
  it('keep the overall error rate the learner chose', () => {
    for (const overall of [0.02, 0.08, 0.2]) {
      const r = tierErrorRates(overall);
      const mean = TIERS.reduce((s, t) => s + TIER_SHARE[t] * r[t], 0);
      expect(mean).toBeCloseTo(overall, 10);
    }
  });
  it('put the errors in the low-confidence tier', () => {
    const r = tierErrorRates(0.08);
    expect(r.low).toBeGreaterThan(r.medium);
    expect(r.medium).toBeGreaterThan(r.high);
    // hand check: base = 0.08 / 1.375, low = 4 x base
    expect(r.low).toBeCloseTo((0.08 / 1.375) * 4, 10);
  });
});

describe('attention', () => {
  it('is full up to the comfortable load', () => {
    expect(attention(0)).toBe(1);
    expect(attention(COMFORTABLE_ITEMS)).toBe(1);
  });
  it('falls linearly to the floor at four times the load', () => {
    expect(attention(4 * COMFORTABLE_ITEMS)).toBeCloseTo(ATTENTION_FLOOR, 10);
    expect(attention(10 * COMFORTABLE_ITEMS)).toBeCloseTo(ATTENTION_FLOOR, 10);
    // 80 items: one third of the way from 40 to 160 -> 1 - 0.6 / 3 = 0.8
    expect(attention(80)).toBeCloseTo(0.8, 10);
  });
});

describe('catch probability', () => {
  it('is the base chance with no bias and a light load', () => {
    expect(catchProbability(0, false, 10)).toBeCloseTo(BASE_CATCH, 10);
  });
  it('is lowered by bias and by load', () => {
    expect(catchProbability(0.3, false, 80)).toBeCloseTo(0.9 * 0.7 * 0.8, 10);
  });
  it('is raised by making the reviewer commit first', () => {
    expect(effectiveBias(0.4, true)).toBeCloseTo(0.2, 10);
    expect(catchProbability(0.4, true, 10)).toBeGreaterThan(catchProbability(0.4, false, 10));
  });
});

describe('review shares', () => {
  it('follow the policy', () => {
    expect(reviewShare({ kind: 'all' }, 'high')).toBe(1);
    expect(reviewShare({ kind: 'low' }, 'low')).toBe(1);
    expect(reviewShare({ kind: 'low' }, 'medium')).toBe(0);
    expect(reviewShare({ kind: 'lowmed' }, 'medium')).toBe(1);
    expect(reviewShare({ kind: 'lowmed' }, 'high')).toBe(0);
    expect(reviewShare({ kind: 'sample', fraction: 0.25 }, 'high')).toBe(0.25);
    expect(reviewShare({ kind: 'sample', fraction: 3 }, 'high')).toBe(1);
  });
});

describe('expected outcome', () => {
  it('reproduces the lesson example for review-everything (400 items, 8% wrong, 30% bias)', () => {
    const o = expected(base);
    expect(o.reviewed).toBe(400);
    expect(o.errors).toBeCloseTo(32, 10);
    expect(o.catchProb).toBeCloseTo(0.9 * 0.7 * 0.4, 10); // 0.252
    expect(o.caught).toBeCloseTo(32 * 0.252, 10); // 8.064
    expect(o.missedUnreviewed).toBeCloseTo(0, 10);
    expect(o.hours).toBeCloseTo(10, 10); // 400 x 1.5 minutes
  });
  it('reproduces the lesson example for low-confidence-only', () => {
    const o = expected({ ...base, policy: { kind: 'low' } });
    const lowRate = (0.08 / 1.375) * 4;
    expect(o.reviewed).toBeCloseTo(80, 10);
    expect(o.errors).toBeCloseTo(32, 10);
    expect(o.catchProb).toBeCloseTo(0.9 * 0.7 * 0.8, 10); // 0.504
    expect(o.caught).toBeCloseTo(80 * lowRate * 0.504, 10);
    expect(o.missedUnreviewed).toBeCloseTo(32 - 80 * lowRate, 10);
    expect(o.hours).toBeCloseTo(2, 10);
  });
  it('shows that an overloaded reviewer can catch less by reviewing everything', () => {
    const all = expected(base);
    const low = expected({ ...base, policy: { kind: 'low' } });
    expect(low.caught).toBeGreaterThan(all.caught);
    expect(low.hours).toBeLessThan(all.hours);
  });
  it('shows that reviewing everything wins when the load is light', () => {
    const light = { ...base, n: 40 };
    const all = expected(light);
    const low = expected({ ...light, policy: { kind: 'low' } });
    expect(all.caught).toBeGreaterThan(low.caught);
  });
  it('splits the errors without losing any', () => {
    for (const policy of [{ kind: 'all' }, { kind: 'low' }, { kind: 'lowmed' }, { kind: 'sample', fraction: 0.3 }] as const) {
      const o = expected({ ...base, policy });
      expect(o.caught + o.missedReviewed + o.missedUnreviewed).toBeCloseTo(o.errors, 9);
    }
  });
  it('gets worse as bias rises and better with forcing', () => {
    const lo = expected({ ...base, bias: 0.1 }).caught;
    const hi = expected({ ...base, bias: 0.6 }).caught;
    const forced = expected({ ...base, bias: 0.6, forcing: true }).caught;
    expect(lo).toBeGreaterThan(hi);
    expect(forced).toBeGreaterThan(hi);
  });
});

describe('simulation', () => {
  it('is repeatable for a seed and differs between seeds', () => {
    const a = simulate(base, 7);
    const b = simulate(base, 7);
    const c = simulate(base, 8);
    expect(a.outcome).toEqual(b.outcome);
    expect(a.items.map((i) => i.wrong)).toEqual(b.items.map((i) => i.wrong));
    expect(a.items.map((i) => i.wrong)).not.toEqual(c.items.map((i) => i.wrong));
  });
  it('accounts for every error exactly once', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { items, outcome } = simulate({ ...base, policy: { kind: 'sample', fraction: 0.4 } }, seed);
      expect(outcome.caught + outcome.missedReviewed + outcome.missedUnreviewed).toBe(outcome.errors);
      expect(items.filter((i) => i.wrong).length).toBe(outcome.errors);
      expect(items.filter((i) => i.caught).length).toBe(outcome.caught);
      expect(items.filter((i) => i.reviewed).length).toBe(outcome.reviewed);
    }
  });
  it('averages close to the expected outcome', () => {
    const p: Params = { ...base, policy: { kind: 'lowmed' } };
    const e = expected(p);
    let caught = 0;
    let errors = 0;
    const runs = 300;
    for (let seed = 1; seed <= runs; seed++) {
      const o = simulate(p, seed * 31).outcome;
      caught += o.caught;
      errors += o.errors;
    }
    expect(errors / runs).toBeCloseTo(e.errors, 0);
    expect(Math.abs(caught / runs - e.caught)).toBeLessThan(0.6);
  });
  it('never catches anything that was not reviewed', () => {
    const { items } = simulate({ ...base, policy: { kind: 'low' } }, 3);
    expect(items.every((i) => !i.caught || i.reviewed)).toBe(true);
  });
});

describe('helpers', () => {
  it('computes the share of errors that get through', () => {
    expect(missedShare({ reviewed: 0, errors: 0, caught: 0, missedReviewed: 0, missedUnreviewed: 0, catchProb: 0, hours: 0 })).toBe(0);
    expect(missedShare({ reviewed: 10, errors: 10, caught: 4, missedReviewed: 3, missedUnreviewed: 3, catchProb: 0.5, hours: 1 })).toBeCloseTo(0.6, 10);
  });
  it('makeRng stays in [0, 1)', () => {
    const r = makeRng(1);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
