import { describe, expect, it } from 'vitest';
import { activationSizes, describeDrift, drift, layerNorm, ratioLabel, rms } from './no-normalisation';

describe('no normalisation what-if', () => {
  it('rms of a hand-checked batch', () => {
    expect(rms([[3, 4]])).toBeCloseTo(Math.sqrt(12.5), 10);
    expect(rms([[2, 2], [2, 2]])).toBe(2);
  });

  it('layer norm gives mean 0 and spread 1', () => {
    const v = layerNorm([1, 2, 3, 4, 5]);
    expect(v.reduce((a, b) => a + b, 0) / 5).toBeCloseTo(0, 10);
    expect(v.reduce((a, b) => a + b * b, 0) / 5).toBeCloseTo(1, 3);
    // hand check: mean 3, variance 2, so the first value is -2 / sqrt(2)
    expect(v[0]).toBeCloseTo(-2 / Math.sqrt(2), 3);
  });

  it('is deterministic', () => {
    expect(activationSizes(10, 1.2, false)).toEqual(activationSizes(10, 1.2, false));
  });

  it('starts at about 1 and has depth + 1 entries', () => {
    const s = activationSizes(8, 1, false);
    expect(s).toHaveLength(9);
    expect(s[0]).toBeGreaterThan(0.9);
    expect(s[0]).toBeLessThan(1.1);
  });

  it('weights that are a little too big make the numbers explode, and a little too small make them vanish', () => {
    const big = activationSizes(24, 1.3, false);
    const small = activationSizes(24, 0.7, false);
    expect(drift(big)).toBeGreaterThan(100);
    expect(drift(small)).toBeLessThan(0.001);
    expect(describeDrift(drift(big))).toBe('blowing up');
    expect(describeDrift(drift(small))).toBe('fading away');
  });

  it('the size grows with depth when weights are too big (monotonic) and each layer multiplies by about the scale', () => {
    const s = activationSizes(24, 1.3, false);
    for (let i = 1; i < s.length; i++) expect(s[i]).toBeGreaterThan(s[i - 1] * 0.9);
    expect(Math.pow(drift(s), 1 / 24)).toBeGreaterThan(1.2);
    expect(Math.pow(drift(s), 1 / 24)).toBeLessThan(1.4);
  });

  it('carefully tuned weights keep the size steady even without normalisation', () => {
    expect(describeDrift(drift(activationSizes(24, 1, false)))).toBe('steady');
  });

  it('with layer norm the size stays the same at every depth whatever the weight scale', () => {
    const ref = activationSizes(24, 1, true);
    for (const scale of [0.5, 0.7, 1.3, 1.5]) {
      const s = activationSizes(24, scale, true);
      for (let l = 1; l < s.length; l++) {
        expect(s[l]).toBeGreaterThan(0.6);
        expect(s[l]).toBeLessThan(0.8);
        expect(s[l]).toBeCloseTo(ref[l], 1);
      }
    }
  });

  it('describes ratios in plain words', () => {
    expect(ratioLabel(327)).toBe('327 times bigger than the input');
    expect(ratioLabel(2.5)).toBe('2.5 times bigger than the input');
    expect(ratioLabel(1.1)).toBe('about the same size as the input');
    expect(ratioLabel(1 / 8600)).toBe('8,600 times smaller than the input');
  });
});
