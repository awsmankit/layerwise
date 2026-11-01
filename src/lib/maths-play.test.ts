import { describe, expect, it } from 'vitest';
import {
  CURVES,
  PRESETS,
  agreement,
  angleDeg,
  applyM,
  chainSlope,
  cosine,
  descentPath,
  descentStep,
  det,
  dot,
  gridLines,
  matMul,
  naturalFrequencies,
  norm,
  nudgeSlope,
} from './maths-play';

describe('arrows', () => {
  it('computes the dot product by hand', () => {
    expect(dot([3, 1], [1, 3])).toBe(6);
    expect(dot([2, 0], [0, 5])).toBe(0);
  });
  it('gives cosine 0.6 for (3,1) and (1,3)', () => {
    expect(norm([3, 1])).toBeCloseTo(Math.sqrt(10));
    expect(cosine([3, 1], [1, 3])).toBeCloseTo(0.6);
    expect(angleDeg([3, 1], [1, 3])).toBeCloseTo(53.13, 1);
  });
  it('handles same, opposite, perpendicular and zero arrows', () => {
    expect(cosine([2, 2], [1, 1])).toBeCloseTo(1);
    expect(cosine([2, 2], [-1, -1])).toBeCloseTo(-1);
    expect(angleDeg([1, 0], [0, 4])).toBeCloseTo(90);
    expect(cosine([0, 0], [1, 1])).toBeNull();
    expect(angleDeg([0, 0], [1, 1])).toBeNull();
  });
  it('describes agreement in words', () => {
    expect(agreement(1)).toMatch(/same way/);
    expect(agreement(0)).toMatch(/right angles/);
    expect(agreement(-1)).toMatch(/opposite/);
    expect(agreement(null)).toMatch(/no length/);
  });
});

describe('matrices', () => {
  it('moves the two basis arrows to the columns', () => {
    const m = PRESETS.find((p) => p.id === 'turn')!.m;
    expect(applyM(m, [1, 0])).toEqual([0, 1]);
    expect(applyM(m, [0, 1])).toEqual([-1, 0]);
    expect(applyM(m, [2, 3])).toEqual([-3, 2]);
  });
  it('computes the area scale', () => {
    expect(det([[2, 0], [0, 1]])).toBe(2);
    expect(det(PRESETS.find((p) => p.id === 'squash')!.m)).toBe(0);
    expect(det(PRESETS.find((p) => p.id === 'flip')!.m)).toBe(-1);
  });
  it('chains machines: turn twice is a half turn', () => {
    const t = PRESETS.find((p) => p.id === 'turn')!.m;
    const tt = matMul(t, t);
    expect(tt.map((r) => r.map((v) => v + 0))).toEqual([[-1, 0], [0, -1]]);
  });
  it('makes 2n+1 lines in each direction', () => {
    const g = gridLines([[1, 0], [0, 1]], 3);
    expect(g).toHaveLength(14);
    expect(g.filter((l) => l.axis)).toHaveLength(2);
  });
});

describe('slopes', () => {
  it('the nudge slope matches the exact slope everywhere on both curves', () => {
    for (const c of CURVES) {
      const [lo, hi] = c.domain;
      for (let i = 0; i <= 20; i++) {
        const x = lo + ((hi - lo) * i) / 20;
        expect(nudgeSlope(c.f, x)).toBeCloseTo(c.df(x), 4);
      }
    }
  });
  it('bowl: hand-checkable numbers', () => {
    const bowl = CURVES[0];
    expect(bowl.f(3)).toBe(1);
    expect(bowl.df(3)).toBe(0);
    expect(bowl.df(0.5)).toBeCloseTo(-1.25);
    // one step of size 0.5 from x = 0.5: 0.5 - 0.5 * (-1.25) = 1.125
    expect(descentStep(bowl, 0.5, 0.5).x).toBeCloseTo(1.125);
  });
  it('a small step size creeps to the bottom of the bowl', () => {
    const p = descentPath(CURVES[0], 0.5, 1, 40);
    expect(p[p.length - 1]).toBeCloseTo(3, 3);
  });
  it('a step size that is too large flies off the end of the picture', () => {
    const bowl = CURVES[0];
    const p = descentPath(bowl, 0.5, 4.4, 40);
    expect(p.length).toBeLessThan(41);
    expect([bowl.domain[0], bowl.domain[1]]).toContain(p[p.length - 1]);
  });
  it('bumpy hills: the start decides which valley you reach', () => {
    const hills = CURVES[1];
    const left = descentPath(hills, -3, 0.5, 200).pop()!;
    const right = descentPath(hills, 3, 0.5, 200).pop()!;
    expect(left).toBeGreaterThan(-1.85);
    expect(left).toBeLessThan(-1.7);
    expect(right).toBeGreaterThan(2.1);
    expect(right).toBeLessThan(2.25);
    expect(hills.f(right)).toBeLessThan(hills.f(left));
  });
});

describe('chain rule', () => {
  it('multiplies local slopes: y = 3x and z = y squared at x = 2', () => {
    // y = 3x has slope 3; z = y^2 has slope 2y = 12 at y = 6; so dz/dx = 36
    expect(chainSlope(3, 12)).toBe(36);
    const z = (x: number) => (3 * x) ** 2;
    expect(nudgeSlope(z, 2)).toBeCloseTo(36, 3);
  });
});

describe('natural frequencies', () => {
  it('1 in 100 cheats, catches 90%, 9% false alarms: 9 caught and about 89 wrongly flagged', () => {
    const c = naturalFrequencies(1000, 0.01, 0.9, 0.09);
    expect(c.cheats).toBe(10);
    expect(c.caught).toBe(9);
    expect(c.missed).toBe(1);
    expect(c.honest).toBe(990);
    expect(c.falseAlarms).toBe(89);
    expect(c.clear).toBe(901);
    expect(c.flagged).toBe(98);
    expect(c.chance).toBeCloseTo(9 / 98);
  });
  it('the counts always add up', () => {
    for (const rate of [0.01, 0.02, 0.05, 0.1, 0.2]) {
      const c = naturalFrequencies(1000, rate, 0.9, 0.05);
      expect(c.caught + c.missed + c.falseAlarms + c.clear).toBe(1000);
    }
  });
  it('has no chance to report when nobody is flagged', () => {
    expect(naturalFrequencies(1000, 0, 0.9, 0).chance).toBeNull();
  });
  it('matches Bayes rule on the exact fractions', () => {
    const rate = 0.1, hit = 0.9, fa = 0.1;
    const exact = (rate * hit) / (rate * hit + (1 - rate) * fa);
    expect(naturalFrequencies(1000, rate, hit, fa).chance).toBeCloseTo(exact, 10);
  });
});
