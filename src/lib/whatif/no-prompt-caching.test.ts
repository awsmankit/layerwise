import { describe, expect, it } from 'vitest';
import { breakEvenHitRate, example, hitPattern, hits, inputCost, tokensFresh, tokensFromCache, tokensSent } from './no-prompt-caching';

describe('no prompt caching what-if', () => {
  it('without a cache every call pays for the whole prompt: 1,000 x 20,500 tokens at $3 per million is $61.50', () => {
    expect(tokensSent(20000)).toBe(20_500_000);
    expect(inputCost(20000, 0.9, false)).toBeCloseTo(61.5, 9);
    expect(tokensFresh(20000, 0.9, false)).toBe(20_500_000);
    expect(tokensFromCache(20000, 0.9, false)).toBe(0);
  });
  it('with a 90 percent hit rate: 900 reads at 0.1x and 100 writes at 1.25x', () => {
    // per call 500 new tokens; prefix 20,000: 900*20000*0.1 + 100*20000*1.25 = 1.8M + 2.5M; plus 0.5M new = 4.8M token-equivalents
    expect(inputCost(20000, 0.9, true)).toBeCloseTo((4_800_000 * 3) / 1e6, 9);
    expect(inputCost(20000, 0.9, true)).toBeCloseTo(14.4, 9);
    expect(tokensFromCache(20000, 0.9, true)).toBe(18_000_000);
    expect(tokensFresh(20000, 0.9, true)).toBe(100 * 20000 + 1000 * 500);
  });
  it('cost falls as the hit rate rises', () => {
    let prev = Infinity;
    for (const h of [0, 0.25, 0.5, 0.75, 1]) {
      const c = inputCost(20000, h, true);
      expect(c).toBeLessThan(prev);
      prev = c;
    }
  });
  it('a perfect hit rate costs the new tokens plus the cheap reads', () => {
    expect(inputCost(20000, 1, true)).toBeCloseTo((1000 * 500 + 1000 * 20000 * 0.1) * 3e-6, 9);
  });
  it('a hit rate of zero is worse than no cache, because every call pays to write', () => {
    expect(inputCost(20000, 0, true)).toBeGreaterThan(inputCost(20000, 0, false));
    expect(inputCost(20000, 0, true)).toBeCloseTo((1000 * 500 + 1000 * 20000 * 1.25) * 3e-6, 9);
  });
  it('break-even hit rate is 0.25 / 1.15, about 21.7 percent, and the costs match there', () => {
    const h = breakEvenHitRate();
    expect(h).toBeCloseTo(0.25 / 1.15, 12);
    // use a custom call count that makes the hits an exact integer
    const s = { calls: 10_000_000 };
    expect(inputCost(20000, h, true, s) - inputCost(20000, h, false, s)).toBeCloseTo(0, -3);
    expect(inputCost(20000, 0.5, true)).toBeLessThan(inputCost(20000, 0.5, false));
    expect(inputCost(20000, 0.1, true)).toBeGreaterThan(inputCost(20000, 0.1, false));
  });
  it('a longer prefix saves more', () => {
    const save = (p: number) => inputCost(p, 0.9, false) - inputCost(p, 0.9, true);
    expect(save(40000)).toBeGreaterThan(save(10000));
  });
  it('rounds hits and builds an even 100-square pattern', () => {
    expect(hits(1000, 0.9)).toBe(900);
    expect(hits(1000, 1.5)).toBe(1000);
    for (const h of [0, 0.01, 0.37, 0.5, 0.9, 1]) expect(hitPattern(h).filter(Boolean).length).toBe(Math.round(h * 100));
    expect(hitPattern(0.5).slice(0, 4)).toEqual([false, true, false, true]);
  });
  it('uses the stated example constants', () => {
    expect(example.readMultiplier).toBe(0.1);
    expect(example.writeMultiplier).toBe(1.25);
  });
});
