import { describe, expect, it } from 'vitest';
import { BRANCH, gradientLabel, gradientSizes, MAX_DEPTH, norm, sigmoid } from './no-residual-connections';

describe('no skip connections what-if', () => {
  it('basic helpers', () => {
    expect(norm([3, 4])).toBe(5);
    expect(sigmoid(0)).toBe(0.5);
    // the slope of a sigmoid is s(1-s), which peaks at 0.25: the reason plain stacks fade
    expect(sigmoid(0) * (1 - sigmoid(0))).toBe(0.25);
    expect(BRANCH).toBeGreaterThan(0);
  });

  it('is deterministic and has depth + 1 entries ending in 1', () => {
    const a = gradientSizes(12, false);
    expect(a).toEqual(gradientSizes(12, false));
    expect(a).toHaveLength(13);
    expect(a[12]).toBe(1);
    expect(gradientSizes(0, true)).toEqual([1]);
  });

  it('without skips the gradient fades by orders of magnitude, getting smaller toward the input', () => {
    const g = gradientSizes(MAX_DEPTH, false);
    expect(g[0]).toBeLessThan(1e-10);
    for (let l = 0; l + 5 <= MAX_DEPTH; l += 5) expect(g[l]).toBeLessThan(g[l + 5]);
    // each layer shrinks it by at least 2x on average (slope of sigmoid is at most 0.25)
    expect(Math.pow(g[0], 1 / MAX_DEPTH)).toBeLessThan(0.5);
  });

  it('with skips the gradient still reaches the first layer at about the output size', () => {
    for (const depth of [5, 15, 30]) {
      const g = gradientSizes(depth, true);
      for (const v of g) {
        expect(v).toBeGreaterThan(0.5);
        expect(v).toBeLessThan(5);
      }
    }
  });

  it('a deeper plain stack loses more at the first layer', () => {
    expect(gradientSizes(20, false)[0]).toBeLessThan(gradientSizes(10, false)[0]);
    expect(gradientSizes(10, false)[0]).toBeLessThan(gradientSizes(5, false)[0]);
  });

  it('labels sizes in plain words', () => {
    expect(gradientLabel(1.1)).toBe("about the same as the output's");
    expect(gradientLabel(1 / 20000)).toBe("1 in 20,000 of the output's");
    expect(gradientLabel(3)).toBe("3.0 times the output's");
    expect(gradientLabel(1e-11)).toBe("1 in 100 billion of the output's");
    expect(gradientLabel(2.5e-13)).toBe("1 in 4 trillion of the output's");
    expect(gradientLabel(1e-20)).toBe("1 in 10^20 of the output's");
  });
});
