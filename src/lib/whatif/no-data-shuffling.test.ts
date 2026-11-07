import { describe, expect, it } from 'vitest';
import {
  BATCH, DEFAULT_LR, PER_CLASS, STEPS, STEPS_PER_EPOCH, batchMix, batchPlan, biggestLurch, makeData, predict, stepsGoingUp, train,
} from './no-data-shuffling';

describe('no data shuffling what-if', () => {
  it('builds 3 classes of 60 points grouped by class', () => {
    const d = makeData();
    expect(d).toHaveLength(3 * PER_CLASS);
    expect(d.slice(0, PER_CLASS).every((p) => p.c === 0)).toBe(true);
    expect(d.slice(2 * PER_CLASS).every((p) => p.c === 2)).toBe(true);
    expect(makeData()).toEqual(d);
  });
  it('sorted batches hold one class each: A for 6 steps, then B for 6, then C for 6, every epoch', () => {
    const mix = batchMix('sorted');
    expect(mix).toHaveLength(STEPS);
    expect(STEPS_PER_EPOCH).toBe(18);
    for (let s = 0; s < STEPS; s++) {
      const k = Math.floor((s % STEPS_PER_EPOCH) / 6);
      expect(mix[s][k]).toBe(1);
    }
  });
  it('both orders show every point exactly once per epoch', () => {
    for (const order of ['sorted', 'shuffled'] as const) {
      const plan = batchPlan(order);
      for (let e = 0; e < 3; e++) {
        const seen = plan.slice(e * STEPS_PER_EPOCH, (e + 1) * STEPS_PER_EPOCH).flat().sort((a, b) => a - b);
        expect(seen).toEqual(Array.from({ length: 3 * PER_CLASS }, (_, i) => i));
      }
      expect(plan.every((b) => b.length === BATCH)).toBe(true);
    }
  });
  it('shuffled batches are mixed: most contain more than one class', () => {
    const mixed = batchMix('shuffled').filter((m) => m.filter((v) => v > 0).length > 1).length;
    expect(mixed).toBeGreaterThan(STEPS * 0.7);
  });
  it('before training the loss is ln 3 and the model labels everything A (tie goes to the first class)', () => {
    const run = train('sorted', DEFAULT_LR);
    expect(run).toHaveLength(STEPS + 1);
    expect(run[0].loss).toBeCloseTo(Math.log(3), 3);
    expect(run[0].share).toEqual([1, 0, 0]);
    expect(run[0].acc).toBeCloseTo(1 / 3, 3);
    expect(predict(run[0].weights, 0.3, -2)).toBe(0);
  });
  it('is deterministic', () => {
    expect(train('sorted', 1.5)).toEqual(train('sorted', 1.5));
    expect(train('shuffled', 1.5)).toEqual(train('shuffled', 1.5));
  });
  it('shuffled training ends with a lower full-data loss than sorted at every rate from 1 up', () => {
    for (const lr of [1, 1.5, 2, 2.5, 3]) {
      const s = train('sorted', lr);
      const h = train('shuffled', lr);
      expect(s[STEPS].loss).toBeGreaterThan(h[STEPS].loss);
    }
  });
  it('sorted training lurches: it has bigger jumps and more steps that make things worse', () => {
    const s = train('sorted', DEFAULT_LR);
    const h = train('shuffled', DEFAULT_LR);
    expect(biggestLurch(s)).toBeGreaterThan(biggestLurch(h));
    expect(stepsGoingUp(s)).toBeGreaterThan(stepsGoingUp(h));
  });
  it('at the end of every sorted epoch the model leans toward the class it saw last (C), more than a fair third', () => {
    const s = train('sorted', DEFAULT_LR);
    for (const e of [18, 36, 54]) expect(s[e].share[2]).toBeGreaterThan(0.4);
    const h = train('shuffled', DEFAULT_LR);
    for (const e of [18, 36, 54]) expect(Math.abs(h[e].share[2] - 1 / 3)).toBeLessThan(0.1);
  });
  it('at a gentle rate the damage is small', () => {
    const gentle = train('sorted', 0.5);
    expect(gentle[STEPS].loss - train('shuffled', 0.5)[STEPS].loss).toBeLessThan(0.15);
  });
});
