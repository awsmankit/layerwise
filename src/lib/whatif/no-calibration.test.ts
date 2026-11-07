import { describe, expect, it } from 'vitest';
import {
  BINS,
  N_TEST,
  TRUE_T,
  accuracy,
  atThreshold,
  confidence,
  ece,
  fitTemperature,
  fittedT,
  makeSamples,
  meanConfidence,
  nll,
  reliability,
  sigmoid,
  test,
  validation,
} from './no-calibration';

describe('no calibration what-if', () => {
  it('sigmoid and confidence are as expected', () => {
    expect(sigmoid(0)).toBe(0.5);
    expect(sigmoid(Math.log(9))).toBeCloseTo(0.9, 12); // a score of ln 9 is 90% confidence
    expect(confidence({ logit: Math.log(9), correct: true }, 1)).toBeCloseTo(0.9, 12);
    // dividing the score by T = 2 pulls 90% down to 75%
    expect(confidence({ logit: Math.log(9), correct: true }, 2)).toBeCloseTo(0.75, 12);
  });
  it('is deterministic', () => {
    expect(makeSamples(5, 50)).toEqual(makeSamples(5, 50));
    expect(fittedT()).toBe(fittedT());
  });
  it('ECE by hand on a tiny set: two examples in one bin', () => {
    // both at confidence sigmoid(ln 9) = 0.9, one right and one wrong: accuracy 0.5, gap 0.4, all weight in the 0.9-1.0 bin
    const s = [
      { logit: Math.log(9), correct: true },
      { logit: Math.log(9), correct: false },
    ];
    expect(ece(s, 1)).toBeCloseTo(0.4, 12);
    const bins = reliability(s, 1);
    expect(bins[BINS - 1].n).toBe(2);
    expect(bins[BINS - 1].acc).toBe(0.5);
  });
  it('the raw model is overconfident: it says more than it delivers, in every bin above 60%', () => {
    const bins = reliability(test(), 1);
    expect(bins.reduce((a, b) => a + b.n, 0)).toBe(N_TEST);
    for (const b of bins.slice(1)) expect(b.conf).toBeGreaterThan(b.acc);
    // the 80 to 90 percent bin: says about 85, is right about 2 in 3
    expect(bins[3].conf).toBeGreaterThan(0.83);
    expect(bins[3].conf).toBeLessThan(0.88);
    expect(bins[3].acc).toBeGreaterThan(0.6);
    expect(bins[3].acc).toBeLessThan(0.75);
    expect(meanConfidence(test(), 1)).toBeGreaterThan(accuracy(test()) + 0.08);
  });
  it('temperature scaling recovers the true temperature and shrinks ECE by an order of magnitude', () => {
    const T = fittedT();
    expect(Math.abs(T - TRUE_T)).toBeLessThan(0.3);
    const raw = ece(test(), 1);
    const fixed = ece(test(), T);
    expect(raw).toBeGreaterThan(0.1);
    expect(fixed).toBeLessThan(0.03);
    expect(raw / fixed).toBeGreaterThan(5);
    expect(Math.abs(meanConfidence(test(), T) - accuracy(test()))).toBeLessThan(0.02);
  });
  it('the fitted T has the lowest validation loss on the grid, and the loss rises either side', () => {
    const T = fitTemperature(validation());
    expect(nll(validation(), T)).toBeLessThan(nll(validation(), 1));
    expect(nll(validation(), T)).toBeLessThan(nll(validation(), T + 0.6));
    expect(nll(validation(), T)).toBeLessThan(nll(validation(), T - 0.6));
  });
  it('temperature scaling keeps the order of confidences, so it cannot change which answers rank above others', () => {
    const s = test();
    // the pick depends on the sign of the score, which T never changes; confidence stays above 0.5 and keeps its order
    for (let i = 1; i < s.length; i++) {
      const a = confidence(s[i - 1], 1) <= confidence(s[i], 1);
      const b = confidence(s[i - 1], 2.6) <= confidence(s[i], 2.6);
      expect(a).toBe(b);
    }
  });
  it('a 90% threshold on raw confidence lets through many more mistakes than promised; calibrated it keeps its promise', () => {
    const raw = atThreshold(test(), 1, 0.9);
    const fixed = atThreshold(test(), fittedT(), 0.9);
    expect(1 - raw.accuracy).toBeGreaterThan(0.1); // promised 10% wrong at most, got more
    expect(raw.promised).toBeGreaterThan(raw.accuracy + 0.08);
    expect(1 - fixed.accuracy).toBeLessThan(0.1);
    expect(Math.abs(fixed.promised - fixed.accuracy)).toBeLessThan(0.04);
    // the honest threshold acts on fewer cases
    expect(fixed.accepted).toBeLessThan(raw.accepted);
  });
  it('a higher threshold lets through fewer, more accurate cases (monotone)', () => {
    let prevN = Infinity;
    let prevAcc = 0;
    for (const t of [0.6, 0.7, 0.8, 0.9, 0.95]) {
      const r = atThreshold(test(), 1, t);
      expect(r.accepted).toBeLessThanOrEqual(prevN);
      expect(r.accuracy).toBeGreaterThanOrEqual(prevAcc - 0.01);
      prevN = r.accepted;
      prevAcc = r.accuracy;
    }
  });
});
