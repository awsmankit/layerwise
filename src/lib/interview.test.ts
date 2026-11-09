import { describe, expect, it } from 'vitest';
import { rng, shuffle } from './interview';

describe('shuffle and seeds', () => {
  it('is deterministic for a seed and differs across seeds', () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(shuffle(x, 's1')).toEqual(shuffle(x, 's1'));
    expect(shuffle(x, 's1')).not.toEqual(shuffle(x, 's2'));
    expect([...shuffle(x, 's1')].sort((a, b) => a - b)).toEqual(x);
    expect(x).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
  it('gives numbers in [0, 1)', () => {
    const r = rng('seed');
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
