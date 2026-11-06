import { describe, expect, it } from 'vitest';
import { chartMax, config, newArrivals, rng, served, simulate, stalledFrom, summarise } from './no-backoff';

const totalArrivals = Array.from({ length: config.ticks }, (_, t) => newArrivals(t)).reduce((a, b) => a + b, 0);

describe('no backoff what-if', () => {
  it('serves everything up to capacity, and wastes work on the rest', () => {
    expect(served(14)).toBe(14);
    expect(served(20)).toBe(20);
    expect(served(40)).toBe(17); // floor((20 - 4) / 0.9)
    expect(served(63)).toBe(15); // floor((20 - 6.3) / 0.9)
    expect(served(100)).toBe(11);
    expect(served(200)).toBe(0);
    expect(served(1000)).toBe(0);
  });
  it('served work shrinks as the offered load grows past capacity', () => {
    let prev = Infinity;
    for (let l = 21; l <= 220; l += 7) {
      const s = served(l);
      expect(s).toBeLessThanOrEqual(prev);
      prev = s;
    }
  });
  it('new arrivals are 14 per tick with a burst of 40 for five ticks', () => {
    expect(newArrivals(0)).toBe(14);
    expect(newArrivals(5)).toBe(40);
    expect(newArrivals(9)).toBe(40);
    expect(newArrivals(10)).toBe(14);
    expect(totalArrivals).toBe(14 * 75 + 40 * 5);
  });
  it('the generator is deterministic and between 0 and 1', () => {
    const a = rng(7);
    const b = rng(7);
    const xs = Array.from({ length: 5 }, () => a());
    expect(xs).toEqual(Array.from({ length: 5 }, () => b()));
    for (const x of xs) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
  it('the same inputs give the same run', () => {
    expect(simulate('backoff')).toEqual(simulate('backoff'));
    expect(simulate('immediate')).toEqual(simulate('immediate'));
  });
  it('before the burst nothing is turned away; in the burst tick the retries follow immediately', () => {
    for (const s of ['immediate', 'backoff'] as const) {
      const run = simulate(s);
      for (let t = 0; t < 5; t++) expect(run[t]).toMatchObject({ offered: 14, served: 14, rejected: 0, waiting: 0 });
      expect(run[5]).toMatchObject({ offered: 40, served: 17, rejected: 23, waiting: 23 });
    }
    expect(simulate('immediate')[6].offered).toBe(23 + 40);
  });
  it('every request is accounted for: finished, given up, or still waiting', () => {
    for (const s of ['immediate', 'backoff'] as const) {
      const last = simulate(s)[config.ticks - 1];
      expect(last.done + last.gaveUp + last.waiting).toBe(totalArrivals);
    }
  });
  it('immediate retries explode: the offered load climbs far past capacity and the server finishes nothing', () => {
    const run = simulate('immediate');
    const sum = summarise(run);
    expect(sum.peakOffered).toBeGreaterThan(20 * config.capacity);
    expect(sum.finalServed).toBe(0);
    expect(sum.recoveredAt).toBeNull();
    expect(run.slice(-20).every((t) => t.served === 0)).toBe(true);
    // offered load is increasing through the first 40 ticks
    for (let t = 16; t < 40; t++) expect(run[t].offered).toBeGreaterThan(run[t - 1].offered);
  });
  it('backoff with jitter recovers: the load stays modest, nobody gives up, and nothing is turned away at the end', () => {
    const run = simulate('backoff');
    const sum = summarise(run);
    expect(sum.peakOffered).toBeLessThan(5 * config.capacity);
    expect(sum.gaveUp).toBe(0);
    expect(sum.recoveredAt).not.toBeNull();
    expect(sum.recoveredAt!).toBeLessThan(config.ticks);
    expect(sum.finalServed).toBe(config.baseArrivals);
    expect(run[config.ticks - 1].waiting).toBe(0);
  });
  it('backoff beats immediate retries on every measure', () => {
    const a = summarise(simulate('immediate'));
    const b = summarise(simulate('backoff'));
    expect(b.done).toBeGreaterThan(5 * a.done);
    expect(b.peakOffered).toBeLessThan(a.peakOffered / 5);
    expect(b.gaveUp).toBeLessThan(a.gaveUp);
  });
  it('with no burst and arrivals under capacity there is nothing to retry', () => {
    const calm = { ...config, spikeArrivals: config.baseArrivals };
    for (const s of ['immediate', 'backoff'] as const) expect(simulate(s, calm).every((t) => t.rejected === 0)).toBe(true);
  });
  it('finds when the server stalls, and the chart limit rounds the peak up to 100', () => {
    const imm = simulate('immediate');
    const from = stalledFrom(imm);
    expect(from).not.toBeNull();
    expect(imm.slice(from!).every((t) => t.served === 0)).toBe(true);
    expect(from! > 0 && imm[from! - 1].served > 0).toBe(true);
    expect(stalledFrom(simulate('backoff'))).toBeNull();
    const peak = summarise(imm).peakOffered;
    expect(chartMax([imm, simulate('backoff')])).toBe(Math.ceil(peak / 100) * 100);
  });
});
