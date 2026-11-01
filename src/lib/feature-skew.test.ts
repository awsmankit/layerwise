import { describe, expect, it } from 'vitest';
import { THRESHOLD, evaluate, makeCustomers, score, SKEWS, type Customer } from './feature-skew';

describe('feature-skew', () => {
  it('is deterministic for a seed', () => {
    expect(makeCustomers(50, 3)).toEqual(makeCustomers(50, 3));
    expect(makeCustomers(50, 3)).not.toEqual(makeCustomers(50, 4));
  });

  it('scores with the fixed model: orders=2, basket=40 gives logit -1.4+1+0.6=0.2', () => {
    expect(score({ orders: 2, basket: 40 })).toBeCloseTo(1 / (1 + Math.exp(-0.2)), 12);
    expect(score({ orders: 0, basket: 0 })).toBeLessThan(THRESHOLD);
  });

  it('shows no skew when the two paths share one definition', () => {
    const r = evaluate(makeCustomers(300, 11), 'none');
    expect(r.skewedAny).toBe(0);
    expect(r.meanAbsScoreGap).toBe(0);
    expect(r.flips).toBe(0);
  });

  it('shows skew for every one of the four causes', () => {
    const cs = makeCustomers(300, 11);
    for (const s of SKEWS.filter((x) => x.id !== 'none')) {
      const r = evaluate(cs, s.id);
      expect(r.skewedAny, s.id).toBeGreaterThan(0);
      expect(r.meanAbsScoreGap, s.id).toBeGreaterThan(0);
    }
  });

  it('a hand-built customer: window edges differ by the orders placed today', () => {
    // prediction at hour 24*15+10 = 370 (day 15, 10:00). Today started at hour 360.
    // Orders: hour 365 (today, 5h ago), hour 100 (inside the whole-day window [192, 360)? no, 100 < 192), hour 300 (inside both).
    const c: Customer = {
      id: 1,
      asOf: 370,
      orders: [
        { t: 100, value: 10, lag: 0 },
        { t: 300, value: 20, lag: 0 },
        { t: 365, value: 30, lag: 0 },
      ],
    };
    const r = evaluate([c], 'window').rows[0];
    // serving: rolling [202, 370) -> orders at 300 and 365 -> 2 orders, mean 25
    expect(r.serve).toEqual({ orders: 2, basket: 25 });
    // training: [192, 360) -> only the order at 300 -> 1 order, mean 20
    expect(r.train).toEqual({ orders: 1, basket: 20 });
  });

  it('a hand-built customer: a late-arriving order is in training but not at serving', () => {
    const c: Customer = { id: 2, asOf: 400, orders: [{ t: 390, value: 50, lag: 20 }, { t: 350, value: 10, lag: 0 }] };
    const r = evaluate([c], 'late').rows[0];
    expect(r.serve.orders).toBe(1);
    expect(r.train.orders).toBe(2);
  });

  it('blank handling and clipping only affect the cases they should', () => {
    const quiet: Customer = { id: 3, asOf: 400, orders: [] };
    const big: Customer = { id: 4, asOf: 400, orders: [{ t: 380, value: 160, lag: 0 }] };
    const m = evaluate([quiet], 'missing').rows[0];
    expect(m.train.basket).toBe(0);
    expect(m.serve.basket).toBe(42);
    expect(evaluate([big], 'missing').skewedAny).toBe(0);
    const k = evaluate([big], 'clip').rows[0];
    expect(k.train.basket).toBe(160);
    expect(k.serve.basket).toBe(100);
    expect(evaluate([quiet], 'clip').skewedAny).toBe(0);
  });
});
