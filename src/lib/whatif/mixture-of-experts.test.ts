import { describe, expect, it } from 'vitest';
import { activeParams, attnParams, embedParams, example, expertParams, flopsPerToken, loads, route, routerParams, routerScores, sentence, slowdown, totalParams, weightsGB, billions } from './mixture-of-experts';

describe('mixture of experts what-if', () => {
  it('layer pieces are right, checked by hand', () => {
    expect(expertParams(example)).toBe(3 * 4096 * 14336); // 176,160,768
    expect(expertParams(example)).toBe(176160768);
    // q and o: 4096*4096 each; k and v: 4096 * (8 * 128) each
    expect(attnParams(example)).toBe(2 * 4096 * 4096 + 2 * 4096 * 1024);
    expect(routerParams(example)).toBe(4096 * 8);
    expect(embedParams(example)).toBe(2 * 32000 * 4096);
  });
  it('total and active match the Mixtral paper to its rounding: 47B and 13B', () => {
    expect(Math.round(totalParams(example) / 1e9)).toBe(47);
    expect(Math.round(activeParams(example, 2) / 1e9)).toBe(13);
  });
  it('running all experts uses every weight', () => {
    expect(activeParams(example, 8)).toBe(totalParams(example));
    expect(activeParams(example, 99)).toBe(totalParams(example));
  });
  it('more experts per token costs more, monotonically', () => {
    let prev = 0;
    for (let k = 1; k <= 8; k++) {
      const p = activeParams(example, k);
      expect(p).toBeGreaterThan(prev);
      prev = p;
    }
  });
  it('the slowdown from running all experts is about 3.6x against top-2', () => {
    expect(slowdown(example, 2)).toBeCloseTo(totalParams(example) / activeParams(example, 2), 12);
    expect(slowdown(example, 2)).toBeGreaterThan(3.5);
    expect(slowdown(example, 2)).toBeLessThan(3.7);
    expect(slowdown(example, 8)).toBe(1);
  });
  it('flops and memory follow from the counts', () => {
    expect(flopsPerToken(10)).toBe(20);
    expect(weightsGB(totalParams(example))).toBeGreaterThan(90);
    expect(billions(totalParams(example))).toBe('46.7 B');
  });
  it('routing is deterministic, picks k distinct experts and its gates add up to 1', () => {
    for (let t = 0; t < sentence.length; t++) {
      const r = route(t, 8, 2);
      expect(r).toEqual(route(t, 8, 2));
      expect(new Set(r.map((x) => x.expert)).size).toBe(2);
      expect(r.reduce((s, x) => s + x.gate, 0)).toBeCloseTo(1, 3);
      const sc = routerScores(t, 8);
      expect(sc[r[0].expert]).toBe(Math.max(...sc));
      expect(sc[r[0].expert]).toBeGreaterThanOrEqual(sc[r[1].expert]);
    }
    expect(route(0, 8, 8).length).toBe(8);
  });
  it('loads count every assignment', () => {
    const l = loads(8, 2, sentence.length - 1);
    expect(l.reduce((s, x) => s + x, 0)).toBe(sentence.length * 2);
    expect(loads(8, 8, sentence.length - 1).every((x) => x === sentence.length)).toBe(true);
  });
});
