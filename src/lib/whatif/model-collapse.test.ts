import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FRESH, DEFAULT_N, GENERATIONS, K, REAL, SAMPLE_SIZES, SHOWN_SEED, alive, averageAlive, entropyBits, goneAt, simulate, tailMass,
} from './model-collapse';

describe('model collapse what-if (toy)', () => {
  it('the real distribution adds up to 1 and has a long tail', () => {
    expect(REAL).toHaveLength(K);
    expect(REAL.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
    // 1 / rank^1.1 normalised: the first word has 1 / sum
    const z = Array.from({ length: K }, (_, i) => 1 / Math.pow(i + 1, 1.1)).reduce((a, b) => a + b, 0);
    expect(REAL[0]).toBeCloseTo(1 / z, 5);
    for (let i = 1; i < K; i++) expect(REAL[i]).toBeLessThan(REAL[i - 1]);
    expect(tailMass(REAL)).toBeCloseTo(0.1861, 3);
    expect(entropyBits(REAL)).toBeCloseTo(2.975, 2);
  });
  it('entropy by hand', () => {
    expect(entropyBits([0.5, 0.5])).toBe(1);
    expect(entropyBits([1, 0])).toBe(0);
    expect(entropyBits([0.25, 0.25, 0.25, 0.25])).toBe(2);
  });
  it('generation 0 is the real distribution and every generation is word counts over N', () => {
    const run = simulate(DEFAULT_N, 0);
    expect(run).toHaveLength(GENERATIONS + 1);
    expect(run[0]).toEqual(REAL);
    for (const p of run.slice(1)) {
      expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
      for (const v of p) expect(Math.abs(v * DEFAULT_N - Math.round(v * DEFAULT_N))).toBeLessThan(1e-9);
    }
  });
  it('is deterministic', () => {
    expect(simulate(50, 0.2)).toEqual(simulate(50, 0.2));
    expect(simulate(50, 0, 7)).not.toEqual(simulate(50, 0, 8));
  });
  it('with no fresh data a word that reaches zero never comes back, so the number of living words never rises', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const run = simulate(30, 0, seed);
      for (let g = 1; g < run.length; g++) {
        expect(alive(run[g])).toBeLessThanOrEqual(alive(run[g - 1]));
        run[g - 1].forEach((v, i) => {
          if (v === 0) expect(run[g][i]).toBe(0);
        });
      }
    }
  });
  it('the shown run loses words: 5 left at generation 10 and 3 at generation 30 for N = 50', () => {
    const run = simulate(DEFAULT_N, 0, SHOWN_SEED);
    expect(alive(run[0])).toBe(12);
    expect(alive(run[10])).toBe(5);
    expect(alive(run[GENERATIONS])).toBe(3);
    expect(entropyBits(run[GENERATIONS])).toBeLessThan(entropyBits(REAL));
    const gone = goneAt(run);
    expect(gone.filter((g) => g !== null).length).toBe(12 - alive(run[GENERATIONS]));
  });
  it('averaged over 30 runs, a bigger sample keeps more words (N = 50 vs 200 vs 1000)', () => {
    const a = SAMPLE_SIZES.map((n) => averageAlive(n, 0)[GENERATIONS]);
    for (let i = 1; i < a.length; i++) expect(a[i]).toBeGreaterThan(a[i - 1]);
    expect(averageAlive(50, 0)[GENERATIONS]).toBeLessThan(4);
  });
  it('averaged over 30 runs, mixing in fresh real data keeps more words, and more fresh data keeps more', () => {
    const none = averageAlive(DEFAULT_N, 0)[GENERATIONS];
    const some = averageAlive(DEFAULT_N, DEFAULT_FRESH)[GENERATIONS];
    const lots = averageAlive(DEFAULT_N, 0.5)[GENERATIONS];
    expect(some).toBeGreaterThan(none + 4);
    expect(lots).toBeGreaterThan(some);
  });
  it('the average number of living words starts at 12 and never goes up without fresh data', () => {
    const a = averageAlive(DEFAULT_N, 0);
    expect(a[0]).toBe(12);
    for (let g = 1; g < a.length; g++) expect(a[g]).toBeLessThanOrEqual(a[g - 1]);
  });
});
