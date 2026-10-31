import { describe, expect, it } from 'vitest';
import { ridgeFit, solve } from './linalg';

describe('solve', () => {
  it('solves a small system', () => {
    const x = solve([[2, 1], [1, 3]], [5, 10])!;
    expect(x[0]).toBeCloseTo(1, 10);
    expect(x[1]).toBeCloseTo(3, 10);
  });
  it('needs pivoting when a leading entry is zero', () => {
    const x = solve([[0, 1], [1, 0]], [4, 7])!;
    expect(x).toEqual([7, 4]);
  });
  it('returns null for a singular matrix', () => {
    expect(solve([[1, 2], [2, 4]], [1, 2])).toBeNull();
  });
});

describe('ridgeFit', () => {
  const xs = [0, 1, 2, 3, 4];
  const X = xs.map((x) => [1, x]);
  const y = xs.map((x) => 2 * x + 1);
  it('recovers an exact line when the penalty is zero', () => {
    const w = ridgeFit(X, y, [0, 0])!;
    expect(w[0]).toBeCloseTo(1, 9);
    expect(w[1]).toBeCloseTo(2, 9);
  });
  it('shrinks the slope as the penalty grows, but leaves the intercept unpenalised', () => {
    const small = ridgeFit(X, y, [0, 1])!;
    const big = ridgeFit(X, y, [0, 1000])!;
    expect(Math.abs(small[1])).toBeLessThan(2);
    expect(Math.abs(big[1])).toBeLessThan(Math.abs(small[1]));
    expect(big[0]).toBeGreaterThan(small[0]);
  });
});
