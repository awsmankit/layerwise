import { describe, expect, it } from 'vitest';
import { DEFAULT_RATES, GOAL, MAX_STEPS, RAVINE, contour, gradAt, lossAt, simulate } from './optim';

describe('ravine', () => {
  it('has its minimum at the origin and a gradient that matches a numerical estimate', () => {
    expect(lossAt(0, 0)).toBe(0);
    const [x, y] = [0.7, -0.3];
    const h = 1e-6;
    const [gx, gy] = gradAt(x, y);
    expect(gx).toBeCloseTo((lossAt(x + h, y) - lossAt(x - h, y)) / (2 * h), 4);
    expect(gy).toBeCloseTo((lossAt(x, y + h) - lossAt(x, y - h)) / (2 * h), 4);
  });

  it('draws contours that sit on their loss level', () => {
    for (const p of contour(2, 12)) expect(lossAt(p[0], p[1])).toBeCloseTo(2, 8);
  });
});

describe('optimiser race', () => {
  it('is deterministic and starts at the start point', () => {
    const a = simulate('adam', 0.3);
    expect(a).toEqual(simulate('adam', 0.3));
    expect(a.path[0]).toEqual(RAVINE.start);
    expect(a.path.length).toBeLessThanOrEqual(MAX_STEPS + 1);
  });

  it('at the same learning rate, momentum gets there and plain SGD is still crawling', () => {
    const sgd = simulate('sgd', DEFAULT_RATES.sgd);
    const mom = simulate('momentum', DEFAULT_RATES.momentum);
    expect(sgd.reached).toBeNull();
    expect(sgd.diverged).toBe(false);
    expect(mom.reached).not.toBeNull();
    expect(mom.losses[MAX_STEPS]).toBeLessThan(GOAL);
  });

  it('Adam with its default rate reaches the goal', () => {
    const r = simulate('adam', DEFAULT_RATES.adam);
    expect(r.reached).not.toBeNull();
    expect(r.reached!).toBeLessThan(MAX_STEPS);
  });

  it('SGD blows up once the learning rate passes 2 divided by the steepest curvature (0.02 here)', () => {
    expect(simulate('sgd', 0.015).diverged).toBe(false);
    expect(simulate('sgd', 0.03).diverged).toBe(true);
  });

  it('plain SGD zig-zags across the valley: its position across the floor changes sign', () => {
    const r = simulate('sgd', 0.019);
    const across = r.path.map(([x, y]) => -Math.sin(0.5) * x + Math.cos(0.5) * y);
    let flips = 0;
    for (let i = 1; i < across.length; i++) if (across[i] * across[i - 1] < 0) flips++;
    expect(flips).toBeGreaterThan(10);
  });
});
