import { describe, expect, it } from 'vitest';
import { MAX_GAMMA, SIM_ROUNDS, acceptedIn, expectedTokens, passesFor, rounds, simulatedMean, speedup } from './speculative-decoding';

describe('speculative decoding what-if', () => {
  it('expected tokens match the closed form, checked by hand', () => {
    // alpha 0.7, gamma 4: 1 + .7 + .49 + .343 + .2401 = 2.7731
    expect(expectedTokens(0.7, 4)).toBeCloseTo(2.7731, 6);
    // alpha 0.5, gamma 3: 1 + .5 + .25 + .125 = 1.875
    expect(expectedTokens(0.5, 3)).toBeCloseTo(1.875, 6);
  });
  it('is the same as the sum of powers', () => {
    for (const alpha of [0.1, 0.3, 0.6, 0.9]) for (let g = 1; g <= MAX_GAMMA; g++) {
      let sum = 0;
      for (let i = 0; i <= g; i++) sum += Math.pow(alpha, i);
      expect(expectedTokens(alpha, g)).toBeCloseTo(sum, 5);
    }
  });
  it('edge cases: nothing accepted gives 1, everything accepted gives gamma + 1', () => {
    expect(expectedTokens(0, 5)).toBe(1);
    expect(expectedTokens(1, 5)).toBe(6);
    expect(expectedTokens(0.999999, 5)).toBeCloseTo(6, 3);
  });
  it('grows with the acceptance rate and with the draft length', () => {
    for (let g = 1; g <= MAX_GAMMA; g++) {
      let prev = 0;
      for (let a = 0; a <= 20; a++) {
        const e = expectedTokens(a / 20, g);
        expect(e).toBeGreaterThanOrEqual(prev);
        prev = e;
      }
    }
    for (let g = 1; g < MAX_GAMMA; g++) expect(expectedTokens(0.6, g + 1)).toBeGreaterThan(expectedTokens(0.6, g));
  });
  it('the speed-up follows Theorem 3.8 and can fall below 1 when drafts are poor and costly', () => {
    expect(speedup(0.7, 4, 0)).toBeCloseTo(2.7731, 6);
    expect(speedup(0.7, 4, 0.05)).toBeCloseTo(2.7731 / 1.2, 5);
    expect(speedup(0.1, 8, 0.3)).toBeLessThan(1);
  });
  it('the simulation is deterministic and agrees with the closed form', () => {
    expect(simulatedMean(0.7, 4)).toBe(simulatedMean(0.7, 4));
    for (const [alpha, g] of [[0.7, 4], [0.5, 3], [0.9, 8], [0.3, 2]] as const) {
      expect(Math.abs(simulatedMean(alpha, g) - expectedTokens(alpha, g))).toBeLessThan(0.04 * expectedTokens(alpha, g));
    }
  });
  it('each simulated pass writes between 1 and gamma + 1 tokens, and a higher alpha never accepts fewer', () => {
    for (const r of rounds(0.6, 5, 20)) {
      expect(r.tokens).toBeGreaterThanOrEqual(1);
      expect(r.tokens).toBeLessThanOrEqual(6);
      expect(r.rejected).toBe(r.accepted < 5);
    }
    for (let r = 0; r < 200; r++) {
      expect(acceptedIn(r, 0.8, 6)).toBeGreaterThanOrEqual(acceptedIn(r, 0.5, 6));
      expect(acceptedIn(r, 1, 6)).toBe(6);
      expect(acceptedIn(r, 0, 6)).toBe(0);
    }
    expect(SIM_ROUNDS).toBeGreaterThan(1000);
  });
  it('passes needed: n alone, fewer with drafting', () => {
    expect(passesFor(100, 0.7, 4, false)).toBe(100);
    expect(passesFor(100, 0.7, 4, true)).toBeCloseTo(100 / 2.7731, 4);
    expect(passesFor(100, 0, 4, true)).toBe(100);
  });
});
