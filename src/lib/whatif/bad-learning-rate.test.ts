import { describe, expect, it } from 'vitest';
import {
  A, B, BEST_LR, BUDGET, GOOD_LR, HIGH_LR, LOW_LR, STABLE_LIMIT, START,
  behaviour, descend, indexFromLr, loss, lossAfter, lrFromIndex, rho, stepsToTolerance,
} from './bad-learning-rate';

describe('learning rate what-if', () => {
  it('loss of the stretched bowl', () => {
    expect(loss(0, 0)).toBe(0);
    expect(loss(2, 0)).toBe(2); // 0.5 * 1 * 4
    expect(loss(0, 1)).toBe(3); // 0.5 * 6 * 1
    expect(loss(START[0], START[1])).toBe(0.5 * 25 + 0.5 * 6 * 4); // 24.5
  });

  it('one hand-checked step: lr 0.1 from (-5, 2) goes to (-4.5, 0.8)', () => {
    const p = descend(0.1, 1);
    expect(p[1].x).toBeCloseTo(-4.5, 12);
    expect(p[1].y).toBeCloseTo(0.8, 12);
  });

  it('the loop agrees with the closed form', () => {
    for (const lr of [0.01, 0.16, 0.29, 0.36]) {
      const p = descend(lr, 12);
      expect(p[12].loss / lossAfter(lr, 12)).toBeCloseTo(1, 9);
    }
  });

  it('the stable limit is 2 / B and the best rate is 2 / (A + B)', () => {
    expect(STABLE_LIMIT).toBeCloseTo(1 / 3, 12);
    expect(BEST_LR).toBeCloseTo(2 / 7, 12);
    expect(rho(0.33)).toBeLessThan(1);
    expect(rho(0.34)).toBeGreaterThan(1);
    expect(rho(0.36)).toBeCloseTo(1.16, 12);
    expect(rho(BEST_LR)).toBeLessThan(rho(0.2));
    expect(rho(BEST_LR)).toBeLessThan(rho(0.3));
  });

  it('too low crawls: 0.01 needs hundreds of steps, far past the budget', () => {
    const n = stepsToTolerance(LOW_LR)!;
    expect(n).toBeGreaterThan(300);
    expect(n).toBeLessThan(500);
    expect(behaviour(LOW_LR)).toBe('crawls');
    // after the budget the loss has barely moved
    expect(descend(LOW_LR, BUDGET)[BUDGET].loss).toBeGreaterThan(5);
  });

  it('too high diverges: the loss grows every step and it never reaches the tolerance', () => {
    expect(behaviour(HIGH_LR)).toBe('diverges');
    expect(stepsToTolerance(HIGH_LR)).toBeNull();
    const p = descend(HIGH_LR, 20);
    // the x part shrinks at first, then the steep part (factor -1.16 per step) takes over and the loss only goes up
    for (let i = 12; i < p.length; i++) expect(p[i].loss).toBeGreaterThan(p[i - 1].loss);
    expect(p[20].loss).toBeGreaterThan(p[0].loss);
    expect(descend(HIGH_LR, 40)[40].loss).toBeGreaterThan(1e4);
  });

  it('just right converges smoothly in about twenty steps', () => {
    expect(behaviour(GOOD_LR)).toBe('smooth');
    const n = stepsToTolerance(GOOD_LR)!;
    expect(n).toBeGreaterThan(15);
    expect(n).toBeLessThan(30);
  });

  it('the best rate is the fastest but bounces across the valley', () => {
    const n = stepsToTolerance(BEST_LR)!;
    expect(n).toBeLessThanOrEqual(stepsToTolerance(GOOD_LR)!);
    expect(behaviour(BEST_LR)).toBe('bouncing');
    const p = descend(BEST_LR, 6);
    for (let i = 1; i < p.length; i++) expect(Math.sign(p[i].y)).toBe(-Math.sign(p[i - 1].y));
  });

  it('steps to tolerance fall as the rate rises to the best rate, then rise again', () => {
    let prev = Infinity;
    for (const lr of [0.01, 0.02, 0.05, 0.1, 0.15, 0.2, 0.25, 0.28]) {
      const n = stepsToTolerance(lr)!;
      expect(n).toBeLessThanOrEqual(prev);
      prev = n;
    }
    let prevUp = 0;
    for (const lr of [0.29, 0.31, 0.32, 0.33]) {
      const n = stepsToTolerance(lr)!;
      expect(n).toBeGreaterThanOrEqual(prevUp);
      prevUp = n;
    }
  });

  it('slider index round trips', () => {
    expect(lrFromIndex(16)).toBe(0.16);
    expect(indexFromLr(0.36)).toBe(36);
    expect(A).toBe(1);
    expect(B).toBe(6);
  });
});
