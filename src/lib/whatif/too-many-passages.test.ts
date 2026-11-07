import { describe, expect, it } from 'vitest';
import { GOLD_RANKS, GUESS, TOTAL, bestK, cheapestK, cost, costPerCorrect, curve, facts, isGold, recall, reliability, success, tokens } from './too-many-passages';

describe('too many passages what-if', () => {
  it('recall rises in steps as the three facts come into the top k', () => {
    expect(GOLD_RANKS).toEqual([1, 4, 7]);
    expect(recall(1)).toBeCloseTo(1 / 3, 10);
    expect(recall(3)).toBeCloseTo(1 / 3, 10);
    expect(recall(4)).toBeCloseTo(2 / 3, 10);
    expect(recall(7)).toBe(1);
    expect(recall(TOTAL)).toBe(1);
    const c = curve();
    for (let i = 1; i < c.length; i++) expect(c[i].recall).toBeGreaterThanOrEqual(c[i - 1].recall);
  });
  it('reliability is U-shaped in position and falls with context size (hand-checked at k = 7)', () => {
    // rank 1: x = 0.5/7, U = 0.6 + 0.4 * (6/7)^2, noise = 1 - 0.012 * 6
    expect(reliability(1, 7)).toBeCloseTo((0.6 + 0.4 * (6 / 7) ** 2) * 0.928, 5);
    expect(reliability(4, 7)).toBeCloseTo(0.6 * 0.928, 5); // dead middle
    expect(reliability(4, 7)).toBeLessThan(reliability(1, 7));
    expect(reliability(7, 7)).toBeCloseTo(reliability(1, 7), 5); // symmetric
    expect(reliability(1, 30)).toBeLessThan(reliability(1, 7)); // more distractors, less reliable
  });
  it('missing facts are guessed', () => {
    const f = facts(3);
    expect(f.map((x) => x.inContext)).toEqual([true, false, false]);
    expect(f[1].reliability).toBe(GUESS);
    expect(f[2].reliability).toBe(GUESS);
  });
  it('success at k = 7 is the product of three reliabilities (hand-checked)', () => {
    const r1 = (0.6 + 0.4 * (6 / 7) ** 2) * 0.928;
    expect(success(7)).toBeCloseTo(r1 * (0.6 * 0.928) * r1, 5);
    expect(success(7)).toBeCloseTo(0.383, 3);
  });
  it('the best k is 7, and too many passages is worse than the best', () => {
    expect(bestK()).toBe(7);
    expect(success(30)).toBeLessThan(success(7));
    expect(success(30)).toBeCloseTo(0.164, 3);
    expect(success(1)).toBeLessThan(success(7));
    // after the best k, success only falls
    for (let k = 8; k <= TOTAL; k++) expect(success(k)).toBeLessThan(success(k - 1));
  });
  it('tokens and cost grow in a straight line (example price 3 dollars per million tokens)', () => {
    expect(tokens(0)).toBe(150);
    expect(tokens(7)).toBe(1200);
    expect(tokens(30)).toBe(4650);
    expect(cost(7)).toBeCloseTo(0.0036, 6);
    expect(cost(30)).toBeCloseTo(0.01395, 6);
    expect(cost(30) / cost(7)).toBeCloseTo(4650 / 1200, 5);
  });
  it('cost per correct answer is lowest at k = 7 and about 9 times higher at k = 30', () => {
    expect(cheapestK()).toBe(7);
    expect(costPerCorrect(7)).toBeCloseTo(0.0036 / success(7), 5);
    expect(costPerCorrect(30) / costPerCorrect(7)).toBeGreaterThan(8.5);
    expect(costPerCorrect(30) / costPerCorrect(7)).toBeLessThan(9.5);
  });
  it('knows which ranks are the facts', () => {
    expect([1, 2, 3, 4, 5, 6, 7].filter(isGold)).toEqual([1, 4, 7]);
  });
});
