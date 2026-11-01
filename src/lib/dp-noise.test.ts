import { describe, expect, it } from 'vitest';
import {
  PEOPLE,
  TARGET_ID,
  averageStdDev,
  epsilonPerQuery,
  expectedAbsError,
  makeRng,
  maxOddsFactor,
  meanAnswer,
  membershipGuessAccuracy,
  noiseScale,
  noiseStdDev,
  noisyCount,
  probNoiseWithin,
  queriesInBudget,
  runMany,
  sampleLaplace,
  shareExact,
  totalEpsilonSpent,
  trueCount,
} from './dp-noise';

describe('seeded random numbers', () => {
  it('give the same sequence for the same seed, and a different one for another seed', () => {
    const a = makeRng(7);
    const b = makeRng(7);
    const c = makeRng(8);
    const sa = [a(), a(), a()];
    expect(sa).toEqual([b(), b(), b()]);
    expect(sa).not.toEqual([c(), c(), c()]);
  });

  it('are uniform on [0, 1): mean near 0.5 and every value in range', () => {
    const r = makeRng(1);
    let sum = 0;
    const n = 100000;
    for (let i = 0; i < n; i++) {
      const v = r();
      expect(v >= 0 && v < 1).toBe(true);
      sum += v;
    }
    expect(sum / n).toBeGreaterThan(0.495);
    expect(sum / n).toBeLessThan(0.505);
  });
});

describe('Laplace sampling, checked by statistics (scale b = 2, 200,000 draws)', () => {
  const b = 2;
  const n = 200000;
  const rng = makeRng(2024);
  const xs = Array.from({ length: n }, () => sampleLaplace(rng, b));
  const mean = xs.reduce((s, x) => s + x, 0) / n;
  const meanAbs = xs.reduce((s, x) => s + Math.abs(x), 0) / n;
  const variance = xs.reduce((s, x) => s + (x - mean) ** 2, 0) / n;

  it('has mean zero', () => {
    expect(Math.abs(mean)).toBeLessThan(0.03);
  });
  it('has mean absolute value b', () => {
    expect(meanAbs).toBeGreaterThan(b * 0.98);
    expect(meanAbs).toBeLessThan(b * 1.02);
  });
  it('has variance 2 b squared (= 8)', () => {
    expect(variance).toBeGreaterThan(8 * 0.97);
    expect(variance).toBeLessThan(8 * 1.03);
  });
  it('has tail P(|X| > 3) = exp(-3 / 2) = 0.2231', () => {
    const tail = xs.filter((x) => Math.abs(x) > 3).length / n;
    expect(tail).toBeGreaterThan(0.2231 - 0.006);
    expect(tail).toBeLessThan(0.2231 + 0.006);
  });
  it('is symmetric: about half the draws are positive', () => {
    const pos = xs.filter((x) => x > 0).length / n;
    expect(pos).toBeGreaterThan(0.495);
    expect(pos).toBeLessThan(0.505);
  });
});

describe('formulas', () => {
  it('noise scale is 1 / epsilon, and its mean size equals the scale', () => {
    expect(noiseScale(0.5)).toBe(2);
    expect(expectedAbsError(0.5)).toBe(2);
    expect(noiseStdDev(1)).toBeCloseTo(Math.SQRT2, 12);
  });
  it('chance the noise is within 1 at epsilon 1 is 1 - e^-1 = 0.632', () => {
    expect(probNoiseWithin(1, 1)).toBeCloseTo(0.6321205588, 9);
  });
  it('the empirical chance of noise within 1 matches the formula', () => {
    const rng = makeRng(99);
    let hit = 0;
    const n = 100000;
    for (let i = 0; i < n; i++) if (Math.abs(noisyCount(rng, 10, 0.5) - 10) <= 1) hit++;
    expect(hit / n).toBeCloseTo(probNoiseWithin(1, 0.5), 2); // 1 - e^-0.5 = 0.3935
  });
  it('the odds factor is e^epsilon', () => {
    expect(maxOddsFactor(0.5)).toBeCloseTo(1.6487, 3);
    expect(maxOddsFactor(5)).toBeCloseTo(148.41, 1);
  });
  it('an attacker with one answer guesses membership with accuracy 1 - 0.5 e^(-epsilon/2)', () => {
    expect(membershipGuessAccuracy(0.5)).toBeCloseTo(0.6106, 3);
    expect(membershipGuessAccuracy(1)).toBeCloseTo(0.6967, 3);
    expect(membershipGuessAccuracy(5)).toBeCloseTo(0.9590, 3);
  });
  it('that guess accuracy is confirmed by simulation (epsilon 1, truth 7 versus 8)', () => {
    const rng = makeRng(5);
    let right = 0;
    const n = 100000;
    for (let i = 0; i < n; i++) {
      const isIn = rng() < 0.5;
      const answer = noisyCount(rng, isIn ? 8 : 7, 1);
      const guessIn = answer > 7.5;
      if (guessIn === isIn) right++;
    }
    expect(right / n).toBeCloseTo(membershipGuessAccuracy(1), 2);
  });
});

describe('privacy budget by simple composition', () => {
  it('epsilons add up: 10 queries at 0.5 cost 5', () => {
    expect(totalEpsilonSpent(0.5, 10)).toBe(5);
  });
  it('a budget of 2 allows 4 queries at 0.5 and 2 at 1', () => {
    expect(queriesInBudget(2, 0.5)).toBe(4);
    expect(queriesInBudget(2, 1)).toBe(2);
    expect(queriesInBudget(1, 0.1)).toBe(10); // guards against 1 / 0.1 = 9.99999
  });
  it('splitting a budget of 1 over 10 queries leaves 0.1 each', () => {
    expect(epsilonPerQuery(1, 10)).toBeCloseTo(0.1, 12);
  });
  it('averaging 100 fresh answers to one query shrinks the noise tenfold, which is why repeats burn budget', () => {
    expect(averageStdDev(0.5, 100)).toBeCloseTo(noiseStdDev(0.5) / 10, 12);
    const rng = makeRng(31);
    const means: number[] = [];
    for (let t = 0; t < 2000; t++) {
      let s = 0;
      for (let i = 0; i < 100; i++) s += noisyCount(rng, 7, 0.5);
      means.push(s / 100);
    }
    const m = means.reduce((a, x) => a + x, 0) / means.length;
    const sd = Math.sqrt(means.reduce((a, x) => a + (x - m) ** 2, 0) / means.length);
    expect(sd).toBeGreaterThan(averageStdDev(0.5, 100) * 0.93);
    expect(sd).toBeLessThan(averageStdDev(0.5, 100) * 1.07);
  });
});

describe('the invented dataset and the histograms', () => {
  it('has 20 people, 7 with the flag, and the target has the flag', () => {
    expect(PEOPLE).toHaveLength(20);
    expect(trueCount(PEOPLE, null)).toBe(7);
    expect(PEOPLE[TARGET_ID].flag).toBe(true);
  });
  it('removing the target changes the exact count by exactly 1', () => {
    expect(trueCount(PEOPLE, TARGET_ID)).toBe(6);
  });
  it('a histogram is reproducible from its seed and counts every run', () => {
    const a = runMany(11, 7, 1, 2000, -10, 25);
    const b = runMany(11, 7, 1, 2000, -10, 25);
    expect(a.counts).toEqual(b.counts);
    expect(a.counts.reduce((s, x) => s + x, 0)).toBe(2000);
  });
  it('large epsilon gives mostly exact answers; small epsilon rarely does', () => {
    expect(shareExact(runMany(3, 7, 5, 5000, -20, 30), 7)).toBeGreaterThan(0.6);
    expect(shareExact(runMany(3, 7, 0.1, 5000, -20, 30), 7)).toBeLessThan(0.1);
  });
  it('the noise has no bias: the mean answer is close to the true count', () => {
    expect(Math.abs(meanAnswer(8, 7, 0.5, 100000) - 7)).toBeLessThan(0.05);
  });
});
