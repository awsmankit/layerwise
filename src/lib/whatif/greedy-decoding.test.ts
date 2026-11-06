import { describe, expect, it } from 'vitest';
import { LENGTH, contexts, distinct3, generate, loopLength, repeated, sampler, table, top, uniqueTokens, withTemperature, withTopP } from './greedy-decoding';

const sum = (d: Record<string, number>) => Object.values(d).reduce((a, b) => a + b, 0);

describe('greedy decoding what-if', () => {
  it('every row of the toy table adds up to 1', () => {
    for (const [k, row] of Object.entries(table)) expect(sum(row), k).toBeCloseTo(1, 10);
  });
  it('greedy picks the top entry and falls into a loop: the cat sat on', () => {
    expect(top(table.the)).toBe('cat');
    const g = generate('greedy');
    expect(g).toHaveLength(LENGTH);
    expect(g.slice(0, 8)).toEqual(['cat', 'sat', 'on', 'the', 'cat', 'sat', 'on', 'the']);
    expect(loopLength(g)).toBe(4);
    expect(uniqueTokens(g)).toBe(4);
  });
  it('greedy ignores the seed', () => {
    expect(generate('greedy', { temperature: 1, topP: 1, seed: 5 })).toEqual(generate('greedy', { temperature: 0.2, topP: 0.3, seed: 99 }));
  });
  it('greedy repeats: 22 groups of 3, only 4 different', () => {
    const d = distinct3(generate('greedy'));
    expect(d.total).toBe(22);
    expect(d.distinct).toBe(4);
    expect(repeated(generate('greedy')).filter(Boolean).length).toBeGreaterThan(15);
  });
  it('temperature 1 changes nothing, low temperature sharpens, high flattens', () => {
    const d = table.cat;
    const one = withTemperature(d, 1);
    for (const k of Object.keys(d)) expect(one[k]).toBeCloseTo(d[k], 10);
    expect(withTemperature(d, 0.3).sat).toBeGreaterThan(d.sat);
    expect(withTemperature(d, 3).sat).toBeLessThan(d.sat);
    expect(sum(withTemperature(d, 0.5))).toBeCloseTo(1, 10);
    // hand check at T = 0.5: squares 0.25, 0.09, 0.04 over 0.38
    expect(withTemperature(d, 0.5).sat).toBeCloseTo(0.25 / 0.38, 10);
  });
  it('top-p keeps the smallest set that reaches p', () => {
    // cat row: sat .5, ran .3, and .2. p = 0.7 needs sat and ran (0.8 total); p = 0.5 needs only sat
    expect(Object.keys(withTopP(table.cat, 0.7)).sort()).toEqual(['ran', 'sat']);
    expect(withTopP(table.cat, 0.7).sat).toBeCloseTo(0.5 / 0.8, 10);
    expect(Object.keys(withTopP(table.cat, 0.5))).toEqual(['sat']);
    expect(Object.keys(withTopP(table.cat, 1))).toHaveLength(3);
  });
  it('very low temperature behaves like greedy', () => {
    expect(sampler(table.the, 0.01, 1).cat).toBeGreaterThan(0.99);
  });
  it('sampling is reproducible for a seed and varies across seeds', () => {
    const a = generate('sample', { temperature: 1, topP: 0.95, seed: 3 });
    expect(generate('sample', { temperature: 1, topP: 0.95, seed: 3 })).toEqual(a);
    expect(generate('sample', { temperature: 1, topP: 0.95, seed: 4 })).not.toEqual(a);
  });
  it('sampling on average repeats less and uses more words than greedy', () => {
    const g = generate('greedy');
    let dSum = 0;
    let uSum = 0;
    for (let s = 1; s <= 40; s++) {
      const t = generate('sample', { temperature: 1, topP: 0.95, seed: s });
      const d = distinct3(t);
      dSum += d.distinct / d.total;
      uSum += uniqueTokens(t);
    }
    expect(dSum / 40).toBeGreaterThan(distinct3(g).distinct / distinct3(g).total + 0.2);
    expect(uSum / 40).toBeGreaterThan(uniqueTokens(g) + 2);
  });
  it('contexts line up with the tokens', () => {
    expect(contexts(['cat', 'sat'])).toEqual(['the', 'cat']);
  });
});
