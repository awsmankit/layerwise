import { describe, expect, it } from 'vitest';
import { cacheBytesPerToken, cacheMiB, positionsComputed, slowdown, totalComputed } from './kv-cache';

describe('kv cache what-if', () => {
  it('with a cache, each new token costs one position after the prompt is read', () => {
    expect(positionsComputed(10, 4, true)).toEqual([10, 1, 1, 1]);
    expect(totalComputed(10, 4, true)).toBe(13);
  });
  it('without a cache, every step recomputes the whole context', () => {
    expect(positionsComputed(10, 4, false)).toEqual([10, 11, 12, 13]);
    expect(totalComputed(10, 4, false)).toBe(46);
  });
  it('the slowdown grows with the length of the reply', () => {
    expect(slowdown(10, 4)).toBeCloseTo(46 / 13, 10);
    expect(slowdown(500, 500)).toBeGreaterThan(slowdown(500, 50));
    // 500-token prompt, 500-token reply: 500 + sum(501..999) against 500 + 499
    expect(totalComputed(500, 500, false)).toBe(500 + (501 + 999) * 499 / 2);
    expect(totalComputed(500, 500, true)).toBe(999);
  });
  it('costs 128 KiB of cache per token for the example model, 500 MiB for 4,000 tokens', () => {
    expect(cacheBytesPerToken()).toBe(131072);
    expect(cacheMiB(4000)).toBeCloseTo(500, 5);
  });
});
