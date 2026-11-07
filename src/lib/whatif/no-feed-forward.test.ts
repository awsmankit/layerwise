import { describe, expect, it } from 'vitest';
import { N, a, b, tasks, taskIds, attentionOut, mixed, withFfn, withoutFfn, mse, rightFlags, conflictForAloneFfn, relu, ffnOf } from './no-feed-forward';

describe('no feed-forward what-if', () => {
  it('attention rows are weights that add up to 1', () => {
    for (const id of taskIds) for (const row of tasks[id].pattern) expect(row.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 12);
  });
  it('targets are right, checked by hand', () => {
    expect(tasks['copy'].target).toEqual([1, 1, 0, 1, 1, 0, 0, 1]);
    expect(tasks['xor-token'].target).toEqual([1, 1, 0, 1, 1, 0, 0, 0]);
    expect(tasks['xor-neighbour'].target).toEqual([0, 1, 1, 0, 1, 0, 1, 1]);
  });
  it('mixing: token 1 of the neighbour task averages its own and its left bit', () => {
    const o = attentionOut(tasks['xor-neighbour']);
    expect(o[1][0]).toBeCloseTo((a[1] + a[0]) / 2, 12);
    expect(o[0][0]).toBe(a[0]);
    expect(mixed(tasks['xor-token'])[2]).toBe(a[2] + b[2]);
  });
  it('the feed-forward layer computes XOR exactly from the sum', () => {
    const t = tasks['xor-token'];
    expect([0, 1, 2].map((s) => ffnOf(t, s))).toEqual([0, 1, 0]);
    expect(relu(-3)).toBe(0);
  });
  it('with the feed-forward layer every task is solved exactly', () => {
    for (const id of taskIds) {
      const t = tasks[id];
      expect(mse(withFfn(t), t.target)).toBeCloseTo(0, 12);
      expect(rightFlags(withFfn(t), t.target).every(Boolean)).toBe(true);
    }
  });
  it('without it, mixing alone is enough for the copy task', () => {
    const t = tasks['copy'];
    expect(mse(withoutFfn(t), t.target)).toBeCloseTo(0, 9);
  });
  it('without it, the XOR tasks cannot be solved by any straight-line readout', () => {
    // XOR on balanced data: the best straight line is the constant 0.5, error 0.25
    const t = tasks['xor-token'];
    expect(mse(withoutFfn(t), t.target)).toBeCloseTo(0.25, 9);
    const t2 = tasks['xor-neighbour'];
    expect(mse(withoutFfn(t2), t2.target)).toBeGreaterThan(0.1);
    expect(rightFlags(withoutFfn(t2), t2.target).every(Boolean)).toBe(false);
  });
  it('the best linear readout is never worse than the constant mean', () => {
    for (const id of taskIds) {
      const t = tasks[id];
      const mean = t.target.reduce((s, x) => s + x, 0) / N;
      expect(mse(withoutFfn(t), t.target)).toBeLessThanOrEqual(mse(t.target.map(() => mean), t.target) + 1e-9);
    }
  });
  it('a feed-forward layer alone is stuck on the tasks that need neighbours', () => {
    expect(conflictForAloneFfn(tasks['xor-token'])).toBeNull();
    expect(conflictForAloneFfn(tasks['copy'])).not.toBeNull();
    expect(conflictForAloneFfn(tasks['xor-neighbour'])).not.toBeNull();
  });
});
