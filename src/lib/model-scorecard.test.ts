import { describe, expect, it } from 'vitest';
import { EXAMPLE_MODELS, PRESETS, flips, pick, scale, scoreAll } from './model-scorecard';

describe('scale', () => {
  it('maps min to 0 and max to 1, and flips for lower-is-better', () => {
    expect(scale([79, 88, 92], true)).toEqual([0, 9 / 13, 1]);
    expect(scale([1, 2, 3], false)).toEqual([1, 0.5, 0]);
  });
  it('gives everyone 1 when all values are equal', () => {
    expect(scale([5, 5, 5], true)).toEqual([1, 1, 1]);
  });
});

describe('scoreAll and pick', () => {
  it('computes the three example scores by hand', () => {
    const s = scoreAll(EXAMPLE_MODELS, { quality: 1, cost: 1, latency: 1 });
    const by = Object.fromEntries(s.map((x) => [x.id, x.score]));
    expect(by.large).toBeCloseTo(100 / 3, 6);
    // M: quality 9/13, cost 1 - 2.6/11.6, latency 1 - 0.7/2.0
    const m = (9 / 13 + (1 - 2.6 / 11.6) + (1 - 0.7 / 2.0)) / 3;
    expect(by.mid).toBeCloseTo(100 * m, 6);
    expect(by.small).toBeCloseTo((100 * 2) / 3, 6);
  });

  it('gives different picks for the four presets', () => {
    const picks = Object.fromEntries(PRESETS.map((p) => [p.id, pick(EXAMPLE_MODELS, p.w)!.id]));
    expect(picks.quality).toBe('large');
    expect(picks.balanced).toBe('mid');
    expect(picks.bulk).toBe('small');
    expect(picks.live).toBe('small');
    expect(new Set(Object.values(picks)).size).toBe(3);
  });

  it('excludes models under the minimum quality before weighing', () => {
    const s = scoreAll(EXAMPLE_MODELS, { quality: 10, cost: 80, latency: 10 }, 85);
    expect(s.find((x) => x.id === 'small')!.excluded).toBe(true);
    expect(pick(EXAMPLE_MODELS, { quality: 10, cost: 80, latency: 10 }, 85)!.id).toBe('mid');
  });

  it('returns null when every model is excluded', () => {
    expect(pick(EXAMPLE_MODELS, { quality: 1, cost: 1, latency: 1 }, 99)).toBeNull();
  });

  it('scores zero for all when the weights are all zero', () => {
    expect(scoreAll(EXAMPLE_MODELS, { quality: 0, cost: 0, latency: 0 }).every((s) => s.score === 0)).toBe(true);
  });
});

describe('flips', () => {
  it('finds where raising the quality weight moves the pick from small to mid to large', () => {
    const f = flips(EXAMPLE_MODELS, { quality: 0, cost: 30, latency: 30 }, 'quality', 0, 200);
    expect(f.map((x) => x.to)).toEqual(['mid', 'large']);
    expect(f[0].from).toBe('small');
    expect(f[0].at).toBeLessThan(f[1].at);
  });
  it('reports no flips when the pick never changes', () => {
    expect(flips(EXAMPLE_MODELS, { quality: 100, cost: 0, latency: 0 }, 'quality', 0, 5)).toEqual([]);
  });
});
