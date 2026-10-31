import { describe, expect, it } from 'vitest';
import { LAYERS, makeSetup, signalSizes } from './signal';

const setup = makeSetup(3);
const last = (a: number[]) => a[a.length - 1];

describe('signal size through 20 layers', () => {
  it('is deterministic', () => {
    expect(signalSizes(setup, 1.4, 'relu')).toEqual(signalSizes(makeSetup(3), 1.4, 'relu'));
    expect(signalSizes(setup, 1, 'tanh').length).toBe(LAYERS);
  });

  it('with ReLU, He scaling (gain sqrt 2) keeps the size steady, within a factor of 3', () => {
    const s = signalSizes(setup, Math.SQRT2, 'relu');
    for (const v of s) {
      expect(v).toBeGreaterThan(0.3);
      expect(v).toBeLessThan(3);
    }
  });

  it('with ReLU, a gain of 1 shrinks the signal by about half the variance per layer', () => {
    const s = signalSizes(setup, 1, 'relu');
    expect(last(s)).toBeLessThan(0.01);
    expect(last(s)).toBeGreaterThan(1e-5);
  });

  it('with ReLU, a gain of 2 makes the signal explode', () => {
    expect(last(signalSizes(setup, 2, 'relu'))).toBeGreaterThan(100);
  });

  it('with ReLU, a tiny gain makes the signal vanish', () => {
    expect(last(signalSizes(setup, 0.3, 'relu'))).toBeLessThan(1e-8);
  });

  it('with tanh, a gain of 1 stays steady and a large gain saturates near 1', () => {
    const ok = signalSizes(setup, 1, 'tanh');
    expect(last(ok)).toBeGreaterThan(0.1);
    expect(last(ok)).toBeLessThan(1);
    const big = signalSizes(setup, 3, 'tanh');
    expect(last(big)).toBeGreaterThan(0.7);
    expect(last(big)).toBeLessThanOrEqual(1);
    // a small gain shrinks it towards zero
    expect(last(signalSizes(setup, 0.4, 'tanh'))).toBeLessThan(0.01);
  });
});
