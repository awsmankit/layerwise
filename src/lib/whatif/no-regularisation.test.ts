import { describe, expect, it } from 'vitest';
import { bestIndex, DEGREE, fit, LAMBDAS, makeData, N_TEST, N_TRAIN, NOISE, predict, rmse, run, solve, truth, weightNorm } from './no-regularisation';

const data = makeData();

describe('no regularisation what-if (toy)', () => {
  it('solves a small linear system by hand: [[2,1],[1,3]] x = [5,10] gives (1, 3)', () => {
    const x = solve([[2, 1], [1, 3]], [5, 10]);
    expect(x[0]).toBeCloseTo(1, 12);
    expect(x[1]).toBeCloseTo(3, 12);
  });

  it('is deterministic and has the promised sizes', () => {
    expect(makeData()).toEqual(makeData());
    expect(data.train).toHaveLength(N_TRAIN);
    expect(data.test).toHaveLength(N_TEST);
    expect(DEGREE + 1).toBe(N_TRAIN); // exactly enough weights to hit every training point
    for (const p of data.train) expect(Math.abs(p.x)).toBeLessThan(1);
  });

  it('predict is a polynomial: w = (1, 2, 3) at x = 2 gives 1 + 4 + 12 = 17', () => {
    expect(predict([1, 2, 3], 2)).toBe(17);
  });

  it('with no regularisation the curve passes through every training point (zero training error)', () => {
    const r = run(data, 0);
    expect(r.trainError).toBeLessThan(1e-4);
  });

  it('the unregularised fit has huge weights and a held-out error far above the noise level', () => {
    const r = run(data, 0);
    expect(r.maxWeight).toBeGreaterThan(100);
    expect(r.testError).toBeGreaterThan(5 * NOISE);
  });

  it('weight decay shrinks the weights at every step up the slider', () => {
    let prev = Infinity;
    for (const l of LAMBDAS) {
      const n = run(data, l).norm;
      expect(n).toBeLessThan(prev);
      prev = n;
    }
  });

  it('weight decay never lowers training error, because the fit is worse on the training data', () => {
    let prev = -1;
    for (const l of LAMBDAS) {
      const e = run(data, l).trainError;
      expect(e).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = e;
    }
  });

  it('a middle strength has the lowest held-out error, close to the noise level; too much underfits', () => {
    const best = bestIndex(data);
    expect(best).toBeGreaterThan(0);
    expect(best).toBeLessThan(LAMBDAS.length - 1);
    const e = run(data, LAMBDAS[best]).testError;
    expect(e).toBeLessThan(run(data, 0).testError / 5);
    expect(e).toBeLessThan(2 * NOISE);
    expect(run(data, LAMBDAS[LAMBDAS.length - 1]).testError).toBeGreaterThan(e);
  });

  it('a gigantic penalty flattens the curve to the average of the training targets', () => {
    const w = fit(data.train, 1e12);
    const mean = data.train.reduce((s, p) => s + p.y, 0) / N_TRAIN;
    expect(w[0]).toBeCloseTo(mean, 3);
    expect(weightNorm(w)).toBeLessThan(1e-3);
  });

  it('rmse of the true curve against noisy points is about the noise level', () => {
    const w = [0];
    // compare the truth directly: held-out points are truth + noise with sd NOISE
    const e = Math.sqrt(data.test.reduce((s, p) => s + (truth(p.x) - p.y) ** 2, 0) / N_TEST);
    expect(e).toBeGreaterThan(0.1);
    expect(e).toBeLessThan(0.4);
    expect(rmse(w, [{ x: 0, y: 3 }])).toBe(3);
  });
});
