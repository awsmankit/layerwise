import { describe, expect, it } from 'vitest';
import { MAX_ATTEMPTS, ORDERS, amountCents, dollars, idempotencyKey, networkScript, rng, run, summarise } from './no-idempotency';

describe('no idempotency what-if', () => {
  it('the random generator is deterministic and in [0, 1)', () => {
    const a = rng(5);
    const b = rng(5);
    for (let i = 0; i < 50; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
  it('the network script is the same every time: 20 orders, at most 3 calls, stop at the first ok', () => {
    const s = networkScript();
    expect(s).toEqual(networkScript());
    expect(s).toHaveLength(ORDERS);
    for (const nets of s) {
      expect(nets.length).toBeGreaterThanOrEqual(1);
      expect(nets.length).toBeLessThanOrEqual(MAX_ATTEMPTS);
      expect(nets.slice(0, -1).every((n) => n !== 'ok')).toBe(true);
    }
  });
  it('amounts are in cents, between 15 and 35 dollars', () => {
    for (let i = 1; i <= ORDERS; i++) {
      expect(amountCents(i)).toBeGreaterThanOrEqual(1500);
      expect(amountCents(i)).toBeLessThanOrEqual(3500);
    }
    expect(dollars(1750)).toBe('$17.50');
    expect(idempotencyKey(7)).toBe('order-7');
  });
  it('without keys, a dropped reply followed by a retry charges twice (order 13) or three times (orders 9 and 16)', () => {
    const o = run(false);
    expect(o[12].attempts.map((a) => a.net)).toEqual(['reply-lost', 'ok']);
    expect(o[12].charges).toBe(2);
    expect(o[8].charges).toBe(3);
    expect(o[15].charges).toBe(3);
  });
  it('a lost request is not a duplicate: it never reached the server', () => {
    const o = run(false);
    expect(o[3].attempts.map((a) => a.net)).toEqual(['request-lost', 'request-lost', 'ok']);
    expect(o[3].charges).toBe(1);
    expect(o[2].charges).toBe(0); // all three calls lost: never charged
  });
  it('without keys the summary is 4 duplicate orders, 6 extra charges, $137.50 too much', () => {
    const s = summarise(run(false));
    expect(s).toMatchObject({ orders: 20, charged: 19, duplicates: 4, extraCharges: 6, neverCharged: 1, replays: 0 });
    // order 9: 2 extra x 1500, order 13: 1 x 2500, order 16: 2 x 3250, order 19: 1 x 1750
    expect(s.extraCents).toBe(2 * 1500 + 2500 + 2 * 3250 + 1750);
    expect(s.extraCents).toBe(13750);
    expect(s.totalCents - s.rightCents).toBe(s.extraCents);
    expect(s.totalCents).toBe(60250);
  });
  it('with keys the same run has no duplicates and the server recognises 6 retries', () => {
    const s = summarise(run(true));
    expect(s).toMatchObject({ duplicates: 0, extraCharges: 0, extraCents: 0, replays: 6, neverCharged: 1, charged: 19 });
    expect(s.totalCents).toBe(s.rightCents);
    for (const o of run(true)) expect(o.charges).toBeLessThanOrEqual(1);
  });
  it('a key does not change what the network did or the right total', () => {
    const a = run(false);
    const b = run(true);
    expect(a.map((o) => o.attempts.map((x) => x.net))).toEqual(b.map((o) => o.attempts.map((x) => x.net)));
    expect(summarise(a).rightCents).toBe(summarise(b).rightCents);
  });
  it('replays equal the extra charges that were avoided', () => {
    expect(summarise(run(true)).replays).toBe(summarise(run(false)).extraCharges);
  });
});
