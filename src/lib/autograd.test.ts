import { describe, expect, it } from 'vitest';
import { forwardValues, numericalGradient, walk } from './autograd';

describe('backprop walk', () => {
  const POINTS: [number, number][] = [[0.5, -1.5], [1.2, 0.4], [-0.8, 0.9], [2, -0.3]];

  it('has the forward steps then the backward steps, and ends with a full set of gradients', () => {
    const s = walk(0.5, -1.5);
    expect(s.map((x) => x.phase)).toEqual(['inputs', 'forward', 'forward', 'forward', 'backward', 'backward', 'backward', 'backward']);
    const last = s[s.length - 1];
    for (const id of ['a', 'b', 'p', 'q', 'r'] as const) expect(last.grads[id]).not.toBeNull();
  });

  it('computes the forward values by hand: a=0.5, b=-1.5', () => {
    const v = forwardValues(0.5, -1.5);
    expect(v.p).toBeCloseTo(-0.75, 12);
    expect(v.q).toBeCloseTo(-0.25, 12);
    expect(v.r).toBeCloseTo(Math.tanh(-0.25), 12);
  });

  it('ends with gradients that match a numerical estimate', () => {
    for (const [a, b] of POINTS) {
      const last = walk(a, b).at(-1)!;
      const num = numericalGradient(a, b);
      expect(last.grads.a!).toBeCloseTo(num.a, 6);
      expect(last.grads.b!).toBeCloseTo(num.b, 6);
    }
  });

  it('adds a second contribution to a.grad in the last step, because a is used twice', () => {
    const s = walk(0.5, -1.5);
    const before = s[s.length - 2].grads.a!;
    const after = s[s.length - 1].grads.a!;
    const slope = 1 - Math.tanh(-0.25) ** 2;
    expect(before).toBeCloseTo(slope, 12);
    expect(after).toBeCloseTo(slope + -1.5 * slope, 12);
    expect(after).not.toBeCloseTo(before, 3);
  });

  it('never shows a gradient before the backward pass, or a value before the forward pass computes it', () => {
    const s = walk(1, 1);
    expect(s.slice(0, 4).every((x) => Object.values(x.grads).every((g) => g === null))).toBe(true);
    expect(s[0].values.p).toBeNull();
    expect(s[1].values.p).not.toBeNull();
    expect(s[1].values.q).toBeNull();
  });
});
