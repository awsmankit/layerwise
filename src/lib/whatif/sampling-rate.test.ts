import { describe, expect, it } from 'vitest';
import { aliasHz, isFaithful, minRate, nyquist, sampleSine, samplesPerCycle, signedAlias, sinePoints } from './sampling-rate';

describe('sampling rate what-if', () => {
  it('keeps a tone below half the sampling rate', () => {
    expect(nyquist(16000)).toBe(8000);
    expect(isFaithful(1000, 8000)).toBe(true);
    expect(aliasHz(1000, 8000)).toBe(1000);
  });
  it('folds a tone above half the rate down to a lower one', () => {
    // 1,000 Hz sampled at 1,300 Hz sounds like 300 Hz
    expect(isFaithful(1000, 1300)).toBe(false);
    expect(aliasHz(1000, 1300)).toBe(300);
    expect(signedAlias(1000, 1300)).toBe(-300);
    // 700 Hz sampled at 1,000 Hz sounds like 300 Hz
    expect(aliasHz(700, 1000)).toBe(300);
  });
  it('a tone equal to the sampling rate collapses to silence-like flat line (0 Hz)', () => {
    expect(aliasHz(1000, 1000)).toBe(0);
    expect(aliasHz(2000, 1000)).toBe(0);
  });
  it('the alias is never above half the rate', () => {
    for (let f = 50; f <= 4000; f += 50) {
      for (const fs of [400, 700, 1000, 1300, 2500, 8000]) {
        expect(aliasHz(f, fs)).toBeLessThanOrEqual(fs / 2 + 1e-9);
      }
    }
  });
  it('the alias fits every sample exactly (same samples as the real tone)', () => {
    const f = 1000;
    const fs = 1300;
    const a = signedAlias(f, fs);
    for (const s of sampleSine(f, fs, 8)) {
      expect(Math.sin(2 * Math.PI * a * s.t)).toBeCloseTo(s.y, 9);
    }
  });
  it('is monotone: faster sampling never makes the alias worse once above twice the tone', () => {
    expect(aliasHz(1000, 2001)).toBe(1000);
    for (const fs of [2100, 3000, 5000, 8000]) expect(aliasHz(1000, fs)).toBe(1000);
  });
  it('counts samples per cycle and the minimum rate', () => {
    expect(samplesPerCycle(1000, 8000)).toBe(8);
    expect(samplesPerCycle(1000, 1300)).toBeCloseTo(1.3, 10);
    expect(minRate(1000)).toBe(2000);
  });
  it('produces the right number of samples and curve points', () => {
    // 8 ms at 1,000 Hz: samples at 0..8 ms, 9 points
    expect(sampleSine(300, 1000, 8)).toHaveLength(9);
    const c = sinePoints(500, 8, 5);
    expect(c).toHaveLength(5);
    expect(c[0].t).toBe(0);
    expect(c[4].t).toBeCloseTo(0.008, 12);
  });
});
