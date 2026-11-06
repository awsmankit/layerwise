import { describe, expect, it } from 'vitest';
import { argmin, curve, fit, legendre, MAX_DEGREE, mse, NOISE_FLOOR, N_CHECK, N_TEST, N_TRAIN, predict, run, sample, solve, winners } from './no-validation-set';

describe('no validation set what-if', () => {
  it('legendre polynomials match hand values', () => {
    expect(legendre(0.5, 3)[0]).toBe(1);
    expect(legendre(0.5, 3)[1]).toBe(0.5);
    expect(legendre(0.5, 3)[2]).toBeCloseTo(-0.125, 12); // (3 * 0.25 - 1) / 2
    expect(legendre(0.5, 3)[3]).toBeCloseTo(-0.4375, 12); // (5 * 0.125 - 3 * 0.5) / 2
  });

  it('solves a small linear system', () => {
    // 2a + b = 5, a + 3b = 10  ->  a = 1, b = 3
    const [a, b] = solve([[2, 1], [1, 3]], [5, 10]);
    expect(a).toBeCloseTo(1, 10);
    expect(b).toBeCloseTo(3, 10);
  });

  it('recovers a straight line exactly from noise-free points', () => {
    const pts = [0, 0.25, 0.5, 0.75, 1].map((x) => ({ x, y: 2 * x + 1 }));
    const c = fit(pts, 1);
    expect(predict(c, 0.3)).toBeCloseTo(1.6, 6);
    expect(mse(c, pts)).toBeLessThan(1e-12);
  });

  it('data is deterministic and the right size', () => {
    expect(sample(5, 1)).toEqual(sample(5, 1));
    const e = run();
    expect(e.train).toHaveLength(N_TRAIN);
    expect(e.check).toHaveLength(N_CHECK);
    expect(e.test).toHaveLength(N_TEST);
    expect(e.coefs).toHaveLength(MAX_DEGREE + 1);
  });

  it('training error never rises as the model grows, and reaches almost zero when it can pass through every point', () => {
    const e = run();
    for (let d = 1; d <= MAX_DEGREE; d++) expect(e.trainErr[d]).toBeLessThanOrEqual(e.trainErr[d - 1] + 1e-9);
    expect(e.trainErr[MAX_DEGREE]).toBeLessThan(1e-4); // 12 points, 12 coefficients
  });

  it('error on unseen points turns up: the biggest model is far worse than a middle one', () => {
    const e = run();
    const best = argmin(e.testErr);
    expect(best).toBeGreaterThanOrEqual(3);
    expect(best).toBeLessThanOrEqual(5);
    expect(e.testErr[MAX_DEGREE]).toBeGreaterThan(100 * e.testErr[best]);
    expect(e.testErr[best]).toBeGreaterThan(NOISE_FLOOR * 0.9); // nothing beats the noise
  });

  it('picking by training error chooses the biggest model, picking by the held-out check does not', () => {
    const e = run();
    const w = winners(e);
    expect(w.withoutCheck).toBe(MAX_DEGREE);
    expect(w.withCheck).toBeLessThan(MAX_DEGREE - 3);
    expect(e.testErr[w.withCheck]).toBeLessThan(e.testErr[w.withoutCheck]);
  });

  it('argmin prefers the larger index on a tie', () => {
    expect(argmin([3, 1, 1, 2])).toBe(2);
    expect(argmin([0, 5])).toBe(0);
  });

  it('a curve has the requested number of points', () => {
    expect(curve(run().coefs[3], 10)).toHaveLength(11);
  });
});
