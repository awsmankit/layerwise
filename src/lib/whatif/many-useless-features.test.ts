import { describe, expect, it } from 'vitest';
import { MAX_NOISE, N_TEST, N_TRAIN, REAL, STEPS, curve, fitLasso, lambdaFor, makeData, nearestNeighbour, scoreAt } from './many-useless-features';

describe('many useless features what-if', () => {
  it('builds balanced, deterministic data with 2 real columns and 500 noise columns', () => {
    const a = makeData(N_TRAIN, 3);
    expect(a.X[0]).toHaveLength(REAL + MAX_NOISE);
    expect(a.y.filter((v) => v === 1)).toHaveLength(N_TRAIN / 2);
    expect(makeData(N_TRAIN, 3)).toEqual(a);
    // the real columns separate the classes: the class means differ by roughly twice the signal
    const big = makeData(2000, 4);
    const mean = (label: number) => big.X.filter((_, i) => big.y[i] === label).reduce((s, r) => s + r[0], 0) / 1000;
    expect(mean(1) - mean(0)).toBeGreaterThan(2.7);
    // adding noise columns never changes the real ones: the first columns stay put
    expect(makeData(N_TRAIN, 3).X[5].slice(0, 2)).toEqual(a.X[5].slice(0, 2));
  });
  it('1-nearest-neighbour copies the label of the closest training row (hand-checked)', () => {
    const train = { X: [[0, 0], [10, 10]], y: [0, 1] };
    const test = { X: [[1, 1], [9, 8], [4, 4]], y: [0, 1, 1] };
    // 4,4 is closer to 0,0 so it is called 0 and is wrong; the other two are right
    expect(nearestNeighbour(train, test, 0)).toBeCloseTo(2 / 3, 10);
  });
  it('lasso soft-thresholds: weight 1 with no penalty, 0.6 with penalty 0.4, 0 with a big penalty', () => {
    const train = { X: [[-1, 0], [1, 0]], y: [0, 1] };
    expect(fitLasso(train, 0, 0).w[0]).toBeCloseTo(1, 10);
    expect(fitLasso(train, 0, 0.4).w[0]).toBeCloseTo(0.6, 10);
    expect(fitLasso(train, 0, 2).w[0]).toBe(0);
  });
  it('the penalty rule grows slowly with the number of columns', () => {
    expect(lambdaFor(500)).toBeGreaterThan(lambdaFor(0));
    expect(lambdaFor(500)).toBeCloseTo(0.5 * Math.sqrt((2 * Math.log(502)) / N_TRAIN), 10);
  });
  it('the flexible model decays as useless columns are added; the regularised one holds', () => {
    const c = curve(STEPS, 4);
    for (let i = 1; i < c.length; i++) expect(c[i].nn).toBeLessThan(c[i - 1].nn + 0.01);
    expect(c[0].nn).toBeGreaterThan(0.93);
    expect(c[c.length - 1].nn).toBeLessThan(0.75);
    expect(c[0].nn - c[c.length - 1].nn).toBeGreaterThan(0.2);
    expect(c[c.length - 1].lasso).toBeGreaterThan(c[0].lasso - 0.03);
    expect(c[c.length - 1].lasso).toBeGreaterThan(c[c.length - 1].nn + 0.2);
  });
  it('the regularised model keeps both real columns and almost no useless ones', () => {
    const p = scoreAt(500, 4);
    expect(p.keptReal).toBeGreaterThan(1.9);
    expect(p.keptNoise).toBeLessThan(2);
  });
  it('uses a fresh test set of the stated size', () => {
    expect(makeData(N_TEST, 900).X).toHaveLength(N_TEST);
  });
});
