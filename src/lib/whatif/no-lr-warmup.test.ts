import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RATE, DEFAULT_WARMUP, STEPS, WARM_MAX, hessian, loss, minTrainingWarmup, output, outcome, rateAt, sharpness, simulate, stableLimit,
} from './no-lr-warmup';

describe('no lr warmup what-if', () => {
  it('starts at f = 8 and loss 24.5 with all weights at 2', () => {
    expect(output([2, 2, 2])).toBe(8);
    expect(loss([2, 2, 2])).toBe(24.5);
    expect(loss([1, 1, 1])).toBe(0);
  });
  it('hessian at (2,2,2): diagonal 16, off-diagonal 30, so the sharpness is 16 + 2 * 30 = 76', () => {
    const H = hessian([2, 2, 2]);
    expect(H[0][0]).toBe(16);
    expect(H[0][1]).toBe(30);
    expect(sharpness([2, 2, 2])).toBeCloseTo(76, 3);
    expect(stableLimit([2, 2, 2])).toBeCloseTo(2 / 76, 4);
  });
  it('near the answer (1,1,1) the sharpness is 3, so the stable rate is 2/3', () => {
    expect(sharpness([1, 1, 1])).toBeCloseTo(3, 3);
    expect(stableLimit([1, 1, 1])).toBeCloseTo(2 / 3, 3);
  });
  it('the warmup ramp is linear up to the peak and then constant', () => {
    expect(rateAt(0, 0.3, 0)).toBe(0.3);
    expect(rateAt(0, 0.3, 10)).toBeCloseTo(0.03, 10);
    expect(rateAt(4, 0.3, 10)).toBeCloseTo(0.15, 10);
    expect(rateAt(9, 0.3, 10)).toBeCloseTo(0.3, 10);
    expect(rateAt(25, 0.3, 10)).toBeCloseTo(0.3, 10);
  });
  it('first step by hand: rate 0.3 from weights 2 gives w = 2 - 0.3 * 7 * 4 = -6.4 and a loss of 0.5 * (-262.144 - 1)^2', () => {
    const r = simulate(0.3, 0);
    expect(r.loss[0]).toBe(24.5);
    expect(r.loss[1]).toBeCloseTo(0.5 * (-262.144 - 1) ** 2, 2);
  });
  it('at full rate 0.3 the loss blows up at step 2; with a 10 step warmup it is trained by step 6', () => {
    const bad = simulate(DEFAULT_RATE, 0);
    expect(outcome(bad)).toBe('blown-up');
    expect(bad.blownUpAt).toBe(2);
    const good = simulate(DEFAULT_RATE, DEFAULT_WARMUP);
    expect(outcome(good)).toBe('trained');
    expect(good.trainedAt).toBe(6);
    expect(good.blownUpAt).toBeNull();
    expect(good.loss).toHaveLength(STEPS + 1);
  });
  it('a gentle peak rate needs no warmup, and a bigger one needs a longer warmup', () => {
    expect(outcome(simulate(0.05, 0))).toBe('trained');
    expect(minTrainingWarmup(0.05)).toBe(0);
    const need = [0.15, 0.2, 0.3, 0.4, 0.5].map((p) => minTrainingWarmup(p) as number);
    expect(need.every((n) => n !== null)).toBe(true);
    for (let i = 1; i < need.length; i++) expect(need[i]).toBeGreaterThanOrEqual(need[i - 1]);
    expect(minTrainingWarmup(0.3)).toBe(5);
  });
  it('a too short warmup can still fail: 0.3 with only 3 warmup steps ends stuck, not trained', () => {
    expect(outcome(simulate(0.3, 3))).toBe('stuck');
    expect(minTrainingWarmup(0.3)).toBeLessThanOrEqual(WARM_MAX);
  });
  it('is deterministic', () => {
    expect(simulate(0.3, 10)).toEqual(simulate(0.3, 10));
  });
});
