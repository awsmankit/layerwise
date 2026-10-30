import { describe, expect, it } from 'vitest';
import { blur, bounds, classify, distance, GRID, hasInk, normalise, rasterise, unbalanced, type Drawing } from './doodle';

/* Small deterministic wobble so hand-drawn shapes are never perfect. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32 - 0.5;
  };
}

function circle(cx: number, cy: number, r: number, seed: number, squash = 1): Drawing {
  const rand = rng(seed);
  const pts = Array.from({ length: 40 }, (_, i) => {
    const a = (i / 39) * Math.PI * 2;
    const rr = r * (1 + rand() * 0.12);
    return { x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * squash };
  });
  return [pts];
}

function cross(cx: number, cy: number, s: number, seed: number): Drawing {
  const rand = rng(seed);
  const j = () => rand() * s * 0.15;
  return [
    [{ x: cx - s + j(), y: cy - s + j() }, { x: cx + s + j(), y: cy + s + j() }],
    [{ x: cx + s + j(), y: cy - s + j() }, { x: cx - s + j(), y: cy + s + j() }],
  ];
}

const len = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));

describe('normalise', () => {
  it('returns a grid of length 1 for a drawing and all zeros for an empty one', () => {
    const v = normalise(circle(0.5, 0.5, 0.3, 1));
    expect(v).toHaveLength(GRID * GRID);
    expect(len(v)).toBeCloseTo(1, 8);
    expect(normalise([]).every((x) => x === 0)).toBe(true);
  });

  it('ignores where on the canvas and how big the drawing is', () => {
    const small = normalise(cross(0.2, 0.25, 0.08, 7));
    const big = normalise(cross(0.6, 0.55, 0.3, 7));
    expect(distance(small, big)).toBeLessThan(0.05);
  });

  it('keeps the shape of a line instead of stretching it into a box', () => {
    const flat = rasterise([[{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }]]);
    const middleRows = [7, 8].map((r) => flat.slice(r * GRID, (r + 1) * GRID));
    expect(middleRows.flat().some((v) => v > 0.9)).toBe(true);
    expect(flat.slice(0, GRID).every((v) => v === 0)).toBe(true); // top row stays empty
  });

  it('is deterministic', () => {
    expect(normalise(circle(0.4, 0.4, 0.2, 3))).toEqual(normalise(circle(0.4, 0.4, 0.2, 3)));
  });

  it('handles a single tap without dividing by zero', () => {
    const v = normalise([[{ x: 0.3, y: 0.3 }]]);
    expect(v.every(Number.isFinite)).toBe(true);
    expect(len(v)).toBeCloseTo(1, 8);
  });
});

describe('blur and bounds', () => {
  it('blur spreads a single dot to its neighbours and keeps the dot brightest', () => {
    const g = new Array(GRID * GRID).fill(0);
    g[5 * GRID + 5] = 1;
    const b = blur(g);
    expect(b[5 * GRID + 5]).toBeGreaterThan(b[5 * GRID + 6]);
    expect(b[5 * GRID + 6]).toBeGreaterThan(0);
    expect(b[5 * GRID + 8]).toBe(0);
  });

  it('bounds is null with no ink, and hasInk ignores a tap', () => {
    expect(bounds([])).toBeNull();
    expect(hasInk([[{ x: 0.5, y: 0.5 }]])).toBe(false);
    expect(hasInk(circle(0.5, 0.5, 0.2, 1))).toBe(true);
  });
});

describe('distance and classify', () => {
  const circles = [1, 2, 3, 4, 5].map((s, i) => normalise(circle(0.3 + i * 0.08, 0.5, 0.15 + i * 0.04, s, 0.85 + i * 0.06)));
  const crosses = [1, 2, 3, 4, 5].map((s, i) => normalise(cross(0.35 + i * 0.07, 0.45, 0.12 + i * 0.05, s)));
  const examples = [...circles.map((vec) => ({ label: 'circle', vec })), ...crosses.map((vec) => ({ label: 'cross', vec }))];

  it('a circle is closer to circles than to crosses', () => {
    const test = normalise(circle(0.55, 0.45, 0.22, 99));
    const toCircles = Math.min(...circles.map((c) => distance(test, c)));
    const toCrosses = Math.min(...crosses.map((c) => distance(test, c)));
    expect(toCircles).toBeLessThan(toCrosses);
  });

  it('guesses new circles and crosses correctly, and shows the 3 nearest examples', () => {
    const c = classify(normalise(circle(0.5, 0.5, 0.25, 42)), examples);
    expect(c?.label).toBe('circle');
    expect(c?.votes).toBe(3);
    expect(c?.neighbours).toHaveLength(3);
    expect(c!.neighbours[0].distance).toBeLessThanOrEqual(c!.neighbours[1].distance);

    const x = classify(normalise(cross(0.5, 0.5, 0.2, 42)), examples);
    expect(x?.label).toBe('cross');
  });

  it('returns null with no examples and copes with fewer than k', () => {
    expect(classify(circles[0], [])).toBeNull();
    const one = classify(circles[0], [{ label: 'circle', vec: circles[1] }]);
    expect(one?.k).toBe(1);
    expect(one?.label).toBe('circle');
  });

  it('distance is zero for the same grid and symmetric', () => {
    expect(distance(circles[0], circles[0])).toBe(0);
    expect(distance(circles[0], crosses[0])).toBeCloseTo(distance(crosses[0], circles[0]), 12);
  });
});

describe('unbalanced', () => {
  it('flags one side having clearly more examples', () => {
    expect(unbalanced(5, 5)).toBe(false);
    expect(unbalanced(5, 4)).toBe(false);
    expect(unbalanced(3, 6)).toBe(true);
    expect(unbalanced(8, 3)).toBe(true);
    expect(unbalanced(10, 8)).toBe(false);
  });
});
