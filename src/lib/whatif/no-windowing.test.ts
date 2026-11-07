import { describe, expect, it } from 'vitest';
import { FLOOR_DB, LAST_BIN, N, QUIET_BIN, fitsBlock, magnitudes, makeBlock, spectrumDb, stats, toDb, windowValues } from './no-windowing';

describe('no windowing what-if', () => {
  it('a tone that fits the block lands in one bin with either window', () => {
    for (const kind of ['rect', 'hann'] as const) {
      const m = magnitudes(makeBlock(8, false), kind);
      expect(m[8]).toBeCloseTo(1, 9);
      expect(toDb(m[8])).toBeCloseTo(0, 6);
    }
    const rect = magnitudes(makeBlock(8, false), 'rect');
    expect(rect.filter((v, k) => k !== 8 && v > 1e-9)).toHaveLength(0);
  });
  it('Hann puts a whole-number tone in 3 bins at most: the tone and its two neighbours at half height', () => {
    const m = magnitudes(makeBlock(8, false), 'hann');
    expect(m[7]).toBeCloseTo(0.5, 9);
    expect(m[9]).toBeCloseTo(0.5, 9);
    expect(m[12]).toBeLessThan(1e-9);
  });
  it('a plain cut of a half-bin tone smears energy: hand-checked against the sinc formula', () => {
    // for a tone 3.5 bins above bin 9 the rectangular response is about 1/(pi x 3.5) of full height
    const m = magnitudes(makeBlock(8.5, false), 'rect');
    expect(m[12]).toBeGreaterThan(0.08);
    expect(m[12]).toBeLessThan(0.15);
    expect(stats(8.5, 'rect').farEnergy).toBeGreaterThan(0.09);
  });
  it('Hann gives a much taller peak over the leakage when the tone does not fit', () => {
    const rect = stats(8.5, 'rect');
    const hann = stats(8.5, 'hann');
    expect(rect.peakToLeakDb).toBeGreaterThan(14);
    expect(rect.peakToLeakDb).toBeLessThan(18);
    expect(hann.peakToLeakDb).toBeGreaterThan(38);
    expect(hann.peakToLeakDb - rect.peakToLeakDb).toBeGreaterThan(20);
    expect(hann.farEnergy).toBeLessThan(rect.farEnergy / 50);
  });
  it('the price of the window: the peak reads lower at half a bin (scalloping) for the plain cut, and wider', () => {
    // half-bin tone: plain cut reads about -3.9 dB, Hann about -1.4 dB
    expect(stats(8.5, 'rect').peakDb).toBeGreaterThan(-4);
    expect(stats(8.5, 'rect').peakDb).toBeLessThan(-3.5);
    expect(stats(8.5, 'hann').peakDb).toBeGreaterThan(-1.6);
    expect(stats(8.5, 'hann').peakDb).toBeLessThan(-1.2);
  });
  it('the quiet tone 40 dB down is buried by plain-cut leakage but visible with Hann', () => {
    expect(stats(8.5, 'rect').quietSeen).toBe(false);
    expect(stats(8.5, 'hann').quietSeen).toBe(true);
    // when the tone fits, even the plain cut shows it
    expect(stats(8, 'rect').quietSeen).toBe(true);
    expect(stats(8.5, 'hann').quietBinDb).toBeCloseTo(-40, 0);
  });
  it('leakage grows as the tone moves from a whole bin toward a half bin', () => {
    let prev = -1;
    for (const k of [8, 8.1, 8.2, 8.3, 8.4, 8.5]) {
      const s = stats(k, 'rect').farEnergy;
      expect(s).toBeGreaterThanOrEqual(prev);
      prev = s;
    }
  });
  it('is deterministic and has the right shape', () => {
    expect(spectrumDb(8.5, true, 'hann')).toEqual(spectrumDb(8.5, true, 'hann'));
    expect(spectrumDb(8.5, false, 'rect')).toHaveLength(LAST_BIN + 1);
    expect(Math.min(...spectrumDb(8, false, 'rect'))).toBe(FLOOR_DB);
    expect(QUIET_BIN).toBeLessThanOrEqual(LAST_BIN);
  });
  it('the Hann window starts at zero, peaks in the middle and the plain cut is all ones', () => {
    const h = windowValues('hann');
    expect(h[0]).toBe(0);
    expect(h[N / 2]).toBeCloseTo(1, 12);
    expect(windowValues('rect').every((v) => v === 1)).toBe(true);
    expect(fitsBlock(8)).toBe(true);
    expect(fitsBlock(8.5)).toBe(false);
  });
});
