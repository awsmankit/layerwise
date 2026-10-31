import { describe, expect, it } from 'vitest';
import { signTestP, bootstrapDifference, bootstrapRate, casesPerGroup, chanceOfAFalseAlarm, drawResults, interval, judge, mean, mulberry32, naturalFrequencies, observedDifference, pairsNeeded, percentile, runExperiments, standardError } from './difference';

const ones = (n: number, k: number) => Uint8Array.from({ length: n }, (_, i) => (i < k ? 1 : 0));

describe('percentile and interval', () => {
  it('interpolates', () => {
    expect(percentile([1, 2, 3, 4, 5], 0.5)).toBe(3);
    expect(percentile([0, 10], 0.25)).toBe(2.5);
  });
  it('takes the middle of the numbers', () => {
    const v = Array.from({ length: 101 }, (_, i) => i);
    const [lo, hi] = interval(v, 0.9);
    expect(lo).toBeCloseTo(5, 9);
    expect(hi).toBeCloseTo(95, 9);
  });
});

describe('seeded results', () => {
  it('repeat exactly for one seed', () => {
    const a = drawResults(50, 0.7, 0.8, 0.5, mulberry32(9));
    const b = drawResults(50, 0.7, 0.8, 0.5, mulberry32(9));
    expect(Array.from(a.a)).toEqual(Array.from(b.a));
    expect(Array.from(a.b)).toEqual(Array.from(b.b));
  });
  it('pass at about the requested rates, however much the cases are shared', () => {
    for (const shared of [0, 0.6, 1]) {
      const r = drawResults(20000, 0.7, 0.8, shared, mulberry32(2));
      expect(mean(r.a)).toBeCloseTo(0.7, 1);
      expect(mean(r.b)).toBeCloseTo(0.8, 1);
    }
  });
  it('with everything shared, the better model never loses a case the other passes', () => {
    const r = drawResults(2000, 0.7, 0.8, 1, mulberry32(5));
    expect(Array.from(r.a).every((x, i) => x <= r.b[i])).toBe(true);
  });
});

describe('bootstrap', () => {
  it('gives a pass-rate interval around the observed rate: 80 of 100 is about 72% to 87%', () => {
    const [lo, hi] = interval(bootstrapRate(ones(100, 80), 5000, mulberry32(1)));
    expect(lo).toBeGreaterThan(0.7);
    expect(lo).toBeLessThan(0.74);
    expect(hi).toBeGreaterThan(0.86);
    expect(hi).toBeLessThan(0.9);
  });
  it('is wide for 8 of 10: it reaches 100% and drops to about 50%', () => {
    const [lo, hi] = interval(bootstrapRate(ones(10, 8), 5000, mulberry32(1)));
    expect(lo).toBeLessThanOrEqual(0.5);
    expect(hi).toBe(1);
  });
  it('narrows as the number of cases grows, by about the square root', () => {
    const w = (n: number) => {
      const [lo, hi] = interval(bootstrapRate(ones(n, Math.round(n * 0.8)), 3000, mulberry32(3)));
      return hi - lo;
    };
    expect(w(400) / w(100)).toBeGreaterThan(0.4);
    expect(w(400) / w(100)).toBeLessThan(0.6);
  });
  it('is centred on the observed difference', () => {
    const r = drawResults(300, 0.6, 0.7, 0.6, mulberry32(8));
    expect(mean(bootstrapDifference(r, 3000, mulberry32(1)))).toBeCloseTo(observedDifference(r), 1);
  });
  it('pairing gives a tighter interval when the models agree on most cases', () => {
    const r = drawResults(200, 0.7, 0.75, 0.9, mulberry32(6));
    const width = (paired: boolean) => {
      const [lo, hi] = interval(bootstrapDifference(r, 3000, mulberry32(1), paired));
      return hi - lo;
    };
    expect(width(true)).toBeLessThan(width(false) * 0.7);
  });
  it('judge says unclear for a small gap on few cases and clear for a big gap on many', () => {
    expect(judge(drawResults(30, 0.7, 0.73, 0.6, mulberry32(4)), 1000, mulberry32(1)).call).toBe('unclear');
    expect(judge(drawResults(1500, 0.6, 0.8, 0.6, mulberry32(4)), 1000, mulberry32(1)).call).toBe('b-better');
  });
});

describe('how often a test fools you', () => {
  it('two identical models: either looks ahead about as often, and a clear verdict is rare', () => {
    const e = runExperiments(100, 0.7, 0.7, 200, 21);
    expect(e.bAhead + e.aAhead + e.tied).toBe(200);
    expect(Math.abs(e.bAhead - e.aAhead)).toBeLessThan(40);
    expect(e.clearA + e.clearB).toBeLessThan(0.15 * 200);
  });
  it('a real gap is found more often with more cases', () => {
    const few = runExperiments(30, 0.7, 0.8, 200, 21);
    const many = runExperiments(500, 0.7, 0.8, 200, 21);
    expect(many.clearB).toBeGreaterThan(few.clearB * 2);
    expect(few.aAhead).toBeGreaterThan(many.aAhead);
  });
});

describe('sample size formulas', () => {
  it('standard error of 80% on 100 cases is 4 points', () => {
    expect(standardError(0.8, 100)).toBeCloseTo(0.04, 10);
  });
  it('about 1,250 cases per model to see 70% against 75%, and 295 for 70% against 80%', () => {
    expect(casesPerGroup(0.7, 0.75)).toBe(1252);
    expect(casesPerGroup(0.7, 0.8)).toBe(295);
  });
  it('needs far fewer cases when both models run on the same ones and mostly agree', () => {
    expect(pairsNeeded(0.15, 0.05)).toBe(469);
    expect(pairsNeeded(0.15, 0.05)).toBeLessThan(casesPerGroup(0.7, 0.75) / 2);
  });
  it('twenty tries give a 64% chance of at least one false alarm', () => {
    expect(chanceOfAFalseAlarm(20)).toBeCloseTo(0.6415, 4);
    expect(chanceOfAFalseAlarm(1)).toBeCloseTo(0.05, 10);
  });
});

describe('base rates', () => {
  it('1,000 people, 1% sick, 90% of sick flagged, 10% of healthy flagged: 9 of 108 flagged are sick', () => {
    const f = naturalFrequencies(1000, 0.01, 0.9, 0.1);
    expect(f).toMatchObject({ sick: 10, healthy: 990, truePositives: 9, falsePositives: 99, positives: 108 });
    expect(f.shareSick).toBeCloseTo(9 / 108, 10);
  });
  it('a rarer condition makes it worse and a commoner one better', () => {
    expect(naturalFrequencies(10000, 0.001, 0.9, 0.1).shareSick).toBeLessThan(0.01);
    expect(naturalFrequencies(1000, 0.3, 0.9, 0.1).shareSick).toBeGreaterThan(0.7);
  });
});

describe('sign test', () => {
  it('8 cases for B against 5 for A is nowhere near convincing: p about 0.58', () => {
    expect(signTestP(8, 5)).toBeCloseTo(0.581, 3);
    expect(signTestP(5, 8)).toBeCloseTo(0.581, 3);
  });
  it('the same split ten times larger is convincing: 80 against 50', () => {
    expect(signTestP(80, 50)).toBeCloseTo(0.0107, 3);
  });
  it('a perfect 10 to 0 is p of about 0.002, and an even split is 1', () => {
    expect(signTestP(10, 0)).toBeCloseTo(2 / 1024, 6);
    expect(signTestP(6, 6)).toBe(1);
    expect(signTestP(0, 0)).toBe(1);
  });
});
