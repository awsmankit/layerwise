import { describe, expect, it } from 'vitest';
import { TOY_K, TOY_Q, dot, frequencies, pairAngles, rotate, ropeScore, scoreByDistance } from './rope';

describe('rope', () => {
  it('uses theta_i = 10000^(-2i/d), as in the RoFormer paper', () => {
    const f = frequencies(8);
    expect(f[0]).toBe(1);
    expect(f[1]).toBeCloseTo(0.1, 12);
    expect(f[2]).toBeCloseTo(0.01, 12);
    expect(f[3]).toBeCloseTo(0.001, 12);
    expect(frequencies(128).length).toBe(64);
  });

  it('rotation keeps the length of the vector', () => {
    const v = [3, 4, 1, 2];
    const r = rotate(v, 37);
    expect(Math.hypot(r[0], r[1])).toBeCloseTo(5, 10);
    expect(Math.hypot(r[2], r[3])).toBeCloseTo(Math.hypot(1, 2), 10);
  });

  it('position 0 changes nothing', () => {
    expect(rotate([1, 2, 3, 4], 0)).toEqual([1, 2, 3, 4]);
  });

  it('the score depends only on the distance between the positions', () => {
    const q = [0.3, -1.2, 0.8, 0.5, -0.4, 0.9];
    const k = [1.1, 0.2, -0.7, 0.6, 0.5, -0.3];
    const base = ropeScore(q, k, 12, 5);
    for (const shift of [1, 7, 100, 1234]) {
      expect(ropeScore(q, k, 12 + shift, 5 + shift)).toBeCloseTo(base, 7);
    }
    expect(ropeScore(q, k, 12, 5)).not.toBeCloseTo(ropeScore(q, k, 12, 6), 3);
  });

  it('matches the hand calculation for one pair: |q||k| cos(angle difference)', () => {
    const q = [1, 0];
    const k = [0.9, 0.3];
    const m = 5;
    const n = 2;
    const expected = Math.hypot(1, 0) * Math.hypot(0.9, 0.3) * Math.cos(Math.atan2(0.3, 0.9) + n * 1 - m * 1);
    expect(ropeScore(q, k, m, n)).toBeCloseTo(expected, 10);
  });

  it('squeezing positions by 4 makes position 128 rotate like position 32', () => {
    const v = [1, 0.5, -0.3, 0.8];
    const a = rotate(v, 128, 10000, 0.25);
    const b = rotate(v, 32);
    a.forEach((x, i) => expect(x).toBeCloseTo(b[i], 10));
  });

  it('pair angles are the start angle plus position x theta', () => {
    const ang = pairAngles(TOY_K, 10);
    expect(ang[0]).toBeCloseTo(Math.atan2(0.3, 0.9) + 10, 10);
    expect(ang[1]).toBeCloseTo(Math.atan2(0.3, 0.9) + 1, 10);
  });

  it('the toy score at distance 0 is the plain dot product, and the curve is shift-invariant', () => {
    const s = scoreByDistance(TOY_Q, TOY_K, 40);
    expect(s[0]).toBeCloseTo(dot(TOY_Q, TOY_K), 10);
    expect(ropeScore(TOY_Q, TOY_K, 30, 10)).toBeCloseTo(s[20], 10);
    expect(s.length).toBe(41);
  });
});
