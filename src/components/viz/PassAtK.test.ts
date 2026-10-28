import { describe, expect, it } from 'vitest';
import { passAtK, passHatK } from './PassAtK';

describe('pass@k and pass^k', () => {
  it('match the worked numbers: 75% over 3 trials gives pass^3 of about 42%', () => {
    expect(passHatK(0.75, 3)).toBeCloseTo(0.4219, 4);
    expect(passAtK(0.75, 3)).toBeCloseTo(0.9844, 4);
  });

  it('match the table in the lesson for an 80% task', () => {
    expect(passAtK(0.8, 1)).toBeCloseTo(0.8, 6);
    expect(passHatK(0.8, 1)).toBeCloseTo(0.8, 6);
    expect(passAtK(0.8, 3)).toBeCloseTo(0.992, 6);
    expect(passHatK(0.8, 3)).toBeCloseTo(0.512, 6);
    expect(passAtK(0.8, 10)).toBeGreaterThan(0.9999);
    expect(passHatK(0.8, 10)).toBeCloseTo(0.1074, 4);
  });

  it('pass@k never falls and pass^k never rises as k grows', () => {
    for (const p of [0.1, 0.5, 0.9]) {
      for (let k = 1; k < 10; k++) {
        expect(passAtK(p, k + 1)).toBeGreaterThanOrEqual(passAtK(p, k));
        expect(passHatK(p, k + 1)).toBeLessThanOrEqual(passHatK(p, k));
      }
    }
  });
});
