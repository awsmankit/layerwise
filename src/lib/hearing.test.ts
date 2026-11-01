import { describe, expect, it } from 'vitest';
import { SPEED_OF_SOUND, frontBackDb, internalDelayUs, nullAngleDeg, onAxisDb, patternGain, polar, totalDelayMs, waveNumber, windowMs } from './hearing';

const D = 0.01; // 10 mm
const LOW = 50; // Hz, well below the point where the gap matters

describe('two-microphone directional pattern', () => {
  it('a cardioid (r = 1) has its null straight behind', () => {
    const k = waveNumber(LOW, D);
    expect(patternGain(k, 1, Math.PI)).toBeLessThan(1e-9);
    expect(patternGain(k, 1, 0)).toBeGreaterThan(0);
    expect(nullAngleDeg(1)).toBeCloseTo(180, 9);
  });
  it('a figure of eight (r = 0) is equal front and back and zero at the sides', () => {
    const k = waveNumber(LOW, D);
    expect(patternGain(k, 0, 0)).toBeCloseTo(patternGain(k, 0, Math.PI), 12);
    expect(patternGain(k, 0, Math.PI / 2)).toBeLessThan(1e-9);
  });
  it('the hypercardioid (r = 1/3) and supercardioid (r = 0.577) place their nulls where first-order theory says', () => {
    expect(nullAngleDeg(1 / 3)).toBeCloseTo(109.47, 1);
    expect(nullAngleDeg(0.57735)).toBeCloseTo(125.26, 1);
    const k = waveNumber(LOW, D);
    expect(patternGain(k, 1 / 3, (109.4712 * Math.PI) / 180)).toBeLessThan(1e-4);
  });
  it('with r above 1 there is no null', () => {
    expect(nullAngleDeg(1.3)).toBeNull();
  });
  it('on-axis level falls by 6 dB for each octave down at low frequencies', () => {
    expect(onAxisDb(100, D, 1) - onAxisDb(200, D, 1)).toBeCloseTo(-6.02, 1);
    expect(onAxisDb(50, D, 1) - onAxisDb(100, D, 1)).toBeCloseTo(-6.02, 1);
  });
  it('a larger gap means a smaller low-frequency loss, a smaller gap a bigger one', () => {
    expect(onAxisDb(200, 0.012, 1)).toBeGreaterThan(onAxisDb(200, 0.005, 1));
  });
  it('front to back ratio is huge for a cardioid at low frequency and 0 dB for a figure of eight', () => {
    expect(frontBackDb(LOW, D, 1)).toBeGreaterThan(60);
    expect(frontBackDb(LOW, D, 0)).toBeCloseTo(0, 9);
  });
  it('normalised pattern peaks at 1', () => {
    const pts = polar(1000, D, 1);
    expect(Math.max(...pts.map((p) => p.g))).toBeCloseTo(1, 12);
    expect(pts.length).toBe(91);
  });
  it('the internal delay for a cardioid is the time sound takes to cross the gap', () => {
    expect(internalDelayUs(D, 1)).toBeCloseTo((D / SPEED_OF_SOUND) * 1e6, 9);
    expect(internalDelayUs(D, 1)).toBeCloseTo(29.15, 1);
  });
});

describe('delay budget', () => {
  it('a 512 sample window at 16 kHz takes 32 ms to collect', () => {
    expect(windowMs(512, 16000)).toBe(32);
    expect(windowMs(64, 16000)).toBe(4);
  });
  it('adds the parts', () => {
    expect(totalDelayMs(37, 3, 1)).toBe(41);
  });
});
