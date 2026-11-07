import { describe, expect, it } from 'vitest';
import { MISS_HEALTHY, N_TEST, N_TRAIN, compare, fitLogistic, makeRows, probability, train } from './missing-values';

describe('missing values what-if', () => {
  it('builds the same rows every time, with gaps that depend on the outcome', () => {
    const a = makeRows(N_TRAIN, 0.6, 5);
    expect(makeRows(N_TRAIN, 0.6, 5)).toEqual(a);
    const test = makeRows(N_TEST, 0.6, 6);
    const share = (y: 0 | 1) => test.filter((r) => r.y === y && r.missing).length / test.filter((r) => r.y === y).length;
    expect(share(1)).toBeGreaterThan(0.55);
    expect(share(1)).toBeLessThan(0.65);
    expect(share(0)).toBeGreaterThan(MISS_HEALTHY - 0.03);
    expect(share(0)).toBeLessThan(MISS_HEALTHY + 0.03);
  });
  it('the logistic fit recovers a known rule on hand-made data', () => {
    // y = 1 exactly when x > 0, with some overlap so the fit stays finite
    const X = [[1, -2], [1, -1], [1, -0.2], [1, 0.3], [1, 1], [1, 2], [1, 0.1], [1, -0.1]];
    const y = [0, 0, 0, 1, 1, 1, 0, 1];
    const w = fitLogistic(X, y);
    expect(w[1]).toBeGreaterThan(1);
    expect(Math.abs(w[0])).toBeLessThan(0.5);
  });
  it('dropping rows loses far more of the people who need follow-up', () => {
    const { out } = compare(0.6);
    const d = out.drop.model.dropped;
    expect(d.sick).toBeGreaterThan(0.5);
    expect(d.healthy).toBeLessThan(0.15);
    expect(d.all).toBeGreaterThan(0.25);
  });
  it('with gaps that depend on the outcome, the flag beats both careless ways', () => {
    const { out } = compare(0.6);
    expect(out.flag.result.accuracy).toBeGreaterThan(out.drop.result.accuracy + 0.1);
    expect(out.flag.result.accuracy).toBeGreaterThan(out.mean.result.accuracy + 0.15);
    expect(out.flag.result.recall).toBeGreaterThan(0.8);
    expect(out.drop.result.recall).toBeLessThan(0.4);
    // the careless ways under-flag people who need follow-up; the flag does not
    expect(out.drop.result.bias).toBeLessThan(-15);
    expect(out.mean.result.bias).toBeLessThan(-8);
    expect(Math.abs(out.flag.result.bias)).toBeLessThan(8);
  });
  it('mean fill weakens the learned effect of x; the flag keeps it', () => {
    const { out, referenceWeight } = compare(0.6);
    expect(out.mean.model.w[1]).toBeLessThan(referenceWeight * 0.7);
    expect(out.flag.model.w[1]).toBeGreaterThan(referenceWeight * 0.85);
  });
  it('the model that was shown the flag says a missing result probably means follow-up', () => {
    const { out } = compare(0.6);
    expect(out.flag.result.pMissing).toBeGreaterThan(0.7);
    expect(out.mean.result.pMissing).toBeLessThan(0.5);
    expect(out.drop.result.pMissing).toBeLessThan(0.5);
  });
  it('when the gaps do not depend on the outcome, all three handlers tie', () => {
    const { out } = compare(MISS_HEALTHY);
    expect(out.drop.result.accuracy).toBeCloseTo(out.flag.result.accuracy, 2);
    expect(out.mean.result.accuracy).toBeCloseTo(out.flag.result.accuracy, 2);
  });
  it('the gap between the flag and mean fill grows as the gaps depend more on the outcome', () => {
    let last = -1;
    for (const m of [0.1, 0.3, 0.5, 0.7]) {
      const { out } = compare(m);
      const gap = out.flag.result.accuracy - out.mean.result.accuracy;
      expect(gap).toBeGreaterThan(last);
      last = gap;
    }
  });
  it('mean fill uses the average of the x values that were seen', () => {
    const rows = [
      { x: 1, y: 0 as const, missing: false },
      { x: 3, y: 1 as const, missing: false },
      { x: 99, y: 1 as const, missing: true },
      { x: -2, y: 0 as const, missing: false },
    ];
    const m = train(rows, 'mean');
    expect(m.fill).toBeCloseTo(2 / 3, 10);
    expect(probability(m, rows[2])).toBeCloseTo(probability(m, { x: 2 / 3, y: 0, missing: false }), 10);
  });
});
