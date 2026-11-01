import { describe, expect, it } from 'vitest';
import {
  boostedChangeForecast,
  boostedLevelForecast,
  forecast,
  holtWintersForecast,
  leakDemo,
  mae,
  makeSeries,
  mape,
  mase,
  meanForecast,
  meanOf,
  METHODS,
  naiveForecast,
  naiveScale,
  olsFit,
  olsPredict,
  rmse,
  rollingOrigins,
  seasonalNaiveForecast,
} from './forecasting';

describe('makeSeries', () => {
  it('is deterministic, has the requested length, and without noise or trend averages 100 over a year', () => {
    const a = makeSeries({ trend: 0.5, season: 1, noise: 4, seed: 1 });
    expect(makeSeries({ trend: 0.5, season: 1, noise: 4, seed: 1 })).toEqual(a);
    expect(a).toHaveLength(108);
    const flat = makeSeries({ trend: 0, season: 1, noise: 0, seed: 1 });
    expect(meanOf(flat.slice(0, 12))).toBeCloseTo(100, 8);
    expect(flat[12]).toBeCloseTo(flat[0], 8);
  });
});

describe('error measures', () => {
  it('computes MAE, RMSE and MAPE by hand', () => {
    const actual = [100, 50];
    const fc = [50, 100];
    expect(mae(actual, fc)).toBe(50);
    expect(rmse(actual, fc)).toBe(50);
    // the same absolute error of 50 is 50% of one actual and 100% of the other
    expect(mape(actual, fc)).toBeCloseTo(75, 10);
    expect(mape([100], [50])).toBeCloseTo(50, 10);
    expect(mape([50], [100])).toBeCloseTo(100, 10);
  });
  it('MAPE is infinite when an actual value is zero', () => {
    expect(mape([0, 10], [1, 10])).toBe(Infinity);
  });
  it('MASE divides by the training seasonal-naive error', () => {
    const train = [10, 20, 12, 22, 14, 24]; // season length 2: differences |12-10|, |22-20|, |14-12|, |24-22| are all 2
    expect(naiveScale(train, 2)).toBe(2);
    expect(mase([30], [33], train, 2)).toBeCloseTo(1.5, 10);
  });
});

describe('simple forecasts', () => {
  const train = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  it('naive repeats the last value', () => expect(naiveForecast(train, 3)).toEqual([14, 14, 14]));
  it('seasonal naive repeats the same month last year and cycles beyond one year', () => {
    expect(seasonalNaiveForecast(train, 3)).toEqual([3, 4, 5]);
    expect(seasonalNaiveForecast(train, 14).slice(12)).toEqual([3, 4]);
  });
  it('mean of 12 is flat', () => expect(meanForecast(train, 2)).toEqual([8.5, 8.5]));
});

describe('Holt-Winters', () => {
  it('forecasts a noise-free trend plus season almost exactly', () => {
    const s = makeSeries({ trend: 0.5, season: 1, noise: 0, seed: 1 });
    const fc = holtWintersForecast(s.slice(0, 84), 12);
    expect(mae(s.slice(84, 96), fc)).toBeLessThan(0.5);
  });
  it('falls back to seasonal naive with under two years of data', () => {
    const s = makeSeries({ trend: 0.5, season: 1, noise: 1, seed: 2 }).slice(0, 20);
    expect(holtWintersForecast(s, 3)).toEqual(seasonalNaiveForecast(s, 3));
  });
});

describe('boosted trees on lags', () => {
  it('the level model cannot go above the range it was trained on, the change model can follow a trend', () => {
    const s = makeSeries({ trend: 2, season: 1, noise: 0, seed: 1 });
    const train = s.slice(0, 84);
    const hi = Math.max(...train);
    const level = boostedLevelForecast(train, 24);
    expect(Math.max(...level)).toBeLessThan(hi + 1);
    const change = boostedChangeForecast(train, 24);
    expect(Math.max(...change)).toBeGreaterThan(hi + 10);
    expect(mae(s.slice(84, 108), change)).toBeLessThan(mae(s.slice(84, 108), level));
  });
  it('is deterministic', () => {
    const s = makeSeries({ trend: 0.5, season: 1, noise: 4, seed: 3 }).slice(0, 84);
    expect(boostedLevelForecast(s, 6)).toEqual(boostedLevelForecast(s, 6));
  });
});

describe('rolling-origin backtest', () => {
  const s = makeSeries({ trend: 0.5, season: 1, noise: 4, seed: 1 });
  it('uses 9 origins for 108 months, first at 48, then every 6, with a 12-month horizon', () => {
    const o = rollingOrigins(s, 'snaive', { initial: 48, horizon: 12, step: 6 });
    expect(o.map((x) => x.origin)).toEqual([48, 54, 60, 66, 72, 78, 84, 90, 96]);
  });
  it('a forecast at an origin does not depend on anything after it', () => {
    const changed = s.slice();
    for (let t = 60; t < changed.length; t++) changed[t] += 1000;
    for (const id of ['naive', 'snaive', 'hw', 'gbChange'] as const) {
      const a = rollingOrigins(s, id, { initial: 48, horizon: 12, step: 6 })[2].forecast; // origin 60
      const b = rollingOrigins(changed, id, { initial: 48, horizon: 12, step: 6 })[2].forecast;
      expect(b).toEqual(a);
    }
  });
  it('the seasonal-naive method is its own baseline', () => {
    const o = rollingOrigins(s, 'snaive', { initial: 48, horizon: 12, step: 6 });
    o.forEach((x) => expect(x.mae).toBeCloseTo(x.baselineMae, 10));
  });
});

describe('OLS', () => {
  it('recovers an exact linear rule', () => {
    const X = [[1, 2], [2, 1], [3, 5], [4, 3], [5, 9]];
    const y = X.map(([a, b]) => 1 + 2 * a - 3 * b);
    const w = olsFit(X, y);
    expect(w[0]).toBeCloseTo(1, 5);
    expect(w[1]).toBeCloseTo(2, 5);
    expect(w[2]).toBeCloseTo(-3, 5);
    expect(olsPredict(w, [10, 1])).toBeCloseTo(18, 5);
  });
});

describe('leakDemo', () => {
  it('a feature that includes the month itself looks perfect under a shuffled split, and honest numbers are far worse', () => {
    const s = makeSeries({ trend: 0.5, season: 1, noise: 4, seed: 1 });
    const r = leakDemo(s, 1);
    expect(r.leakyRandomSplitMae).toBeLessThan(0.01);
    expect(r.randomSplitMae).toBeGreaterThan(2);
    expect(r.honestMae).toBeGreaterThan(2);
    expect(r.honestMae).toBeLessThan(r.naiveMae);
  });
});

describe('the rolling-origin backtest figures quoted in the lesson (default series, 9 origins)', () => {
  it('Holt-Winters averages about 4.0 against 6.7 for seasonal naive; the boosted trees about 5.5', () => {
    const s = makeSeries({ trend: 0.5, season: 1, noise: 4, seed: 1 });
    const avg = (id: 'snaive' | 'hw' | 'gbLevel' | 'gbChange') => meanOf(rollingOrigins(s, id, { initial: 48, horizon: 12, step: 6 }).map((o) => o.mae));
    const train = s.slice(0, 84);
    const test = s.slice(84, 96);
    expect(naiveScale(train)).toBeCloseTo(7.22, 1);
    expect(mae(test, forecast('hw', train, 12))).toBeCloseTo(3.1, 1);
    expect(mase(test, forecast('hw', train, 12), train)).toBeCloseTo(0.43, 2);
    expect(avg('snaive')).toBeCloseTo(6.74, 1);
    expect(avg('hw')).toBeCloseTo(3.98, 1);
    expect(avg('gbLevel')).toBeCloseTo(5.47, 1);
    expect(avg('gbChange')).toBeCloseTo(5.51, 1);
    const r = leakDemo(s, 1);
    expect(r.randomSplitMae).toBeCloseTo(4.8, 1);
    expect(r.honestMae).toBeCloseTo(4.6, 1);
    expect(r.naiveMae).toBeCloseTo(10.0, 1);
  });
});

describe('figures quoted in the lesson (100 invented series, trend 0.5, season 1, noise 4, 84 months of training, 12-month horizon)', () => {
  it('Holt-Winters and the change-model beat seasonal naive on average; naive and the flat average do not', () => {
    const scores: Record<string, number[]> = {};
    for (let seed = 1; seed <= 100; seed++) {
      const s = makeSeries({ trend: 0.5, season: 1, noise: 4, seed });
      const train = s.slice(0, 84);
      const test = s.slice(84, 96);
      for (const m of METHODS) (scores[m.id] ||= []).push(mase(test, forecast(m.id, train, 12), train));
    }
    const avg = Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, meanOf(v)]));
    expect(avg.hw).toBeLessThan(avg.snaive);
    expect(avg.gbChange).toBeLessThan(avg.snaive);
    expect(avg.gbLevel).toBeLessThan(avg.snaive);
    expect(avg.naive).toBeGreaterThan(avg.snaive);
    expect(avg.mean12).toBeGreaterThan(avg.snaive);
    expect(avg.snaive).toBeGreaterThan(0.9);
    expect(avg.snaive).toBeLessThan(1.15);
    expect(avg.hw).toBeLessThan(0.65);
  });
});
