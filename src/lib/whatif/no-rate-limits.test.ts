import { describe, expect, it } from 'vitest';
import { arrivals, config, deadlineQueue, fairShare, noisyChoices, rng, simulate, summarise, type Config } from './no-rate-limits';

const at = (noisyRate: number): Config => ({ ...config, noisyRate });
const run = (p: 'open' | 'limited', rate = 100) => summarise(simulate(p, at(rate)), at(rate));

describe('no rate limits what-if', () => {
  it('the seeded generator repeats', () => {
    const a = rng(5);
    const b = rng(5);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it('arrivals: ordinary users send 1 or 2 a tick, the noisy user sends the burst rate during the burst only', () => {
    const arr = arrivals(at(100));
    expect(arr).toHaveLength(80);
    for (const row of arr) for (let u = 0; u < 10; u++) expect([1, 2]).toContain(row[u]);
    expect(arr[19][10]).toBeLessThanOrEqual(2);
    expect(arr[20][10]).toBe(100);
    expect(arr[59][10]).toBe(100);
    expect(arr[60][10]).toBeLessThanOrEqual(2);
    const mean = arr.reduce((a, r) => a + r.slice(0, 10).reduce((x, y) => x + y, 0), 0) / (80 * 10);
    expect(mean).toBeGreaterThan(1.35);
    expect(mean).toBeLessThan(1.65);
  });
  it('both policies see exactly the same requests', () => {
    expect(run('open').normalSent).toBe(run('limited').normalSent);
    expect(run('open').noisySent).toBe(run('limited').noisySent);
  });
  it('limits: the noisy user gets 6 tokens, then 2 per tick, so 6 + 39 x 2 = 84 get in over a 40-tick burst', () => {
    // sent over the whole run = 40 burst ticks x 100 + 40 ordinary ticks of 1 or 2
    const s = run('limited');
    const admitted = s.noisySent - s.noisyRejected;
    // an ordinary-rate noisy user (1 or 2 a tick) is never limited, so only the burst can be rejected
    expect(s.noisySent - 4000).toBeLessThanOrEqual(80 * 2);
    expect(s.noisyRejected).toBe(4000 - 84);
    expect(admitted).toBe(s.noisySent - 3916);
  });
  it('limits: ordinary users (at most 2 a tick against a refill of 2) are never rejected and always finished in time', () => {
    const s = run('limited');
    expect(s.normalServedShare).toBe(1);
    expect(s.normalTimedOut).toBe(0);
    expect(s.normalAvgWait).toBeLessThan(0.5);
    expect(s.peakQueue).toBeLessThan(10);
  });
  it('without limits: the noisy user takes most of the server and ordinary requests time out', () => {
    const s = run('open');
    expect(s.noisyShareInBurst).toBeGreaterThan(0.8);
    expect(s.normalServedShare).toBeLessThan(0.65);
    expect(s.normalTimedOut).toBeGreaterThan(400);
    expect(s.peakQueue).toBeGreaterThan(deadlineQueue());
    expect(s.perUserInBurst.noisy).toBeGreaterThan(8 * fairShare());
  });
  it('the ordinary users lose more the harder the noisy user pushes', () => {
    const shares = noisyChoices.map((r) => run('open', r).normalServedShare);
    for (let i = 1; i < shares.length; i++) expect(shares[i]).toBeLessThanOrEqual(shares[i - 1]);
    expect(shares[0]).toBeGreaterThan(shares[shares.length - 1]);
  });
  it('with limits the result does not depend on how hard the noisy user pushes', () => {
    for (const r of noisyChoices) {
      expect(run('limited', r).normalServedShare).toBe(1);
      expect(run('limited', r).noisyShareInBurst).toBeCloseTo(run('limited', 100).noisyShareInBurst, 6);
    }
  });
  it('requests finished never exceed capacity per tick and every request is accounted for', () => {
    for (const p of ['open', 'limited'] as const) {
      const r = simulate(p, config);
      const served = r.users.reduce((a, u) => a + u.served, 0);
      expect(served).toBeLessThanOrEqual(config.capacity * config.ticks);
      for (const u of r.users) expect(u.served + u.timedOut + u.rejected).toBeLessThanOrEqual(u.sent);
    }
  });
  it('fair share is capacity over users, and the deadline queue is capacity x deadline', () => {
    expect(fairShare()).toBeCloseTo(20 / 11, 12);
    expect(deadlineQueue()).toBe(100);
  });
  it('an ordinary-rate noisy user (rate 1) changes nothing: no limits needed', () => {
    const calm = run('open', 1);
    expect(calm.normalServedShare).toBe(1);
  });
});

describe('what each user asks for during the burst', () => {
  it('the noisy user asks for exactly the burst rate; ordinary users ask for about 1.5', () => {
    const s = summarise(simulate('open', at(100)), at(100));
    expect(s.askedInBurst.noisy).toBe(100);
    for (const a of s.askedInBurst.normal) {
      expect(a).toBeGreaterThanOrEqual(1);
      expect(a).toBeLessThanOrEqual(2);
    }
  });
  it('with limits every ordinary user is served everything they asked for during the burst', () => {
    const s = summarise(simulate('limited', at(100)), at(100));
    s.perUserInBurst.normal.forEach((v, i) => expect(v).toBeCloseTo(s.askedInBurst.normal[i], 9));
  });
});
