import { describe, expect, it } from 'vitest';
import { DATA_SEED, LAMBDAS, MAX_DEGREE, NOISE, SIZES, TEST, crossValidate, decompose, errorsByDegree, fit, learningCurve, predict, rmse, sample, truth } from './biasvariance';

describe('sample', () => {
  it('is repeatable and the smaller set is the start of the larger one', () => {
    expect(sample(3, 20)).toEqual(sample(3, 20));
    expect(sample(3, 40).slice(0, 20)).toEqual(sample(3, 20));
  });
  it('keeps x between 0 and 1', () => {
    expect(sample(1, 200).every((p) => p.x >= 0 && p.x <= 1)).toBe(true);
  });
  it('has noise of about the stated size around the truth', () => {
    const s = TEST.reduce((a, p) => a + (p.y - truth(p.x)) ** 2, 0) / TEST.length;
    expect(Math.sqrt(s)).toBeGreaterThan(NOISE * 0.85);
    expect(Math.sqrt(s)).toBeLessThan(NOISE * 1.15);
  });
});

describe('fit', () => {
  it('recovers a noise-free quadratic', () => {
    const pts = Array.from({ length: 12 }, (_, i) => ({ x: i / 11, y: 1 - 2 * (i / 11) + 3 * (i / 11) ** 2 }));
    const f = fit(pts, 2, 0);
    expect(rmse(f, pts)).toBeLessThan(1e-4);
    expect(predict(f, 0.5)).toBeCloseTo(1 - 1 + 0.75, 3);
  });
  it('gives a flatter curve as the penalty grows', () => {
    const pts = sample(DATA_SEED, 24);
    const wiggle = (l: number) => {
      const f = fit(pts, 12, l);
      const ys = Array.from({ length: 101 }, (_, i) => predict(f, i / 100));
      return Math.max(...ys) - Math.min(...ys);
    };
    expect(wiggle(LAMBDAS[5])).toBeLessThan(wiggle(LAMBDAS[1]));
  });
});

describe('capacity', () => {
  const pts = sample(DATA_SEED, 24);
  const e = errorsByDegree(pts, 0);
  it('training error never rises as the degree grows (small slack for rounding)', () => {
    for (let i = 1; i < e.length; i++) expect(e[i].train).toBeLessThanOrEqual(e[i - 1].train + 1e-6);
  });
  it('test error is high for a straight line, lowest in the middle, and high again for a wiggly curve', () => {
    const best = e.reduce((b, x) => (x.test < b.test ? x : b));
    expect(best.degree).toBeGreaterThan(2);
    expect(best.degree).toBeLessThan(9);
    expect(e[0].test).toBeGreaterThan(best.test * 1.4);
    expect(e[MAX_DEGREE - 1].test).toBeGreaterThan(best.test * 5);
  });
  it('a ridge penalty cuts the test error of a wiggly fit', () => {
    expect(errorsByDegree(pts, LAMBDAS[4])[11].test).toBeLessThan(e[11].test / 5);
  });
});

describe('bias and variance', () => {
  it('a straight line is wrong on average (bias), a wiggly curve is unsteady (variance)', () => {
    const line = decompose(48, 1, 0, 30);
    const wiggly = decompose(48, 14, 0, 30);
    expect(line.bias2).toBeGreaterThan(line.variance * 3);
    expect(wiggly.variance).toBeGreaterThan(wiggly.bias2 * 3);
  });
  it('more data shrinks variance', () => {
    expect(decompose(SIZES[3], 9, 0, 30).variance).toBeLessThan(decompose(SIZES[0], 9, 0, 30).variance / 10);
  });
  it('bias, variance and noise add up to roughly the test error', () => {
    const d = decompose(96, 5, 0, 60);
    const sum = d.bias2 + d.variance + d.noise;
    expect(Math.abs(sum - d.meanTestMse) / d.meanTestMse).toBeLessThan(0.15);
  });
});

describe('learning curve', () => {
  it('test error falls and training error rises with more data, and they meet near the noise floor for a good fit', () => {
    const c = learningCurve(3, 0, SIZES, 8);
    expect(c[c.length - 1].test).toBeLessThan(c[0].test);
    expect(c[c.length - 1].train).toBeGreaterThan(c[0].train);
    expect(c[c.length - 1].test - c[c.length - 1].train).toBeLessThan(0.05);
  });
  it('a too-simple model plateaus well above the noise floor', () => {
    const c = learningCurve(1, 0, SIZES, 8);
    expect(c[c.length - 1].test).toBeGreaterThan(NOISE * 1.5);
    expect(c[c.length - 1].test - c[c.length - 1].train).toBeLessThan(0.05);
  });
});

describe('cross-validation', () => {
  it('agrees with the test set about which degree is better', () => {
    const pts = sample(DATA_SEED, 48);
    expect(crossValidate(pts, 3, 0)).toBeLessThan(crossValidate(pts, 1, 0));
    expect(crossValidate(pts, 3, 0)).toBeLessThan(crossValidate(pts, 15, 0));
  });
});
