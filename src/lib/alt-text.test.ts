import { describe, expect, it } from 'vitest';
import { agreement, altFlags, isFiller, SCENARIOS } from './alt-text';

describe('alt text rater', () => {
  it('every scenario has exactly one good candidate and at least one poor one', () => {
    for (const s of SCENARIOS) {
      expect(s.candidates.filter((c) => c.rating === 'good')).toHaveLength(1);
      expect(s.candidates.some((c) => c.rating === 'poor')).toBe(true);
    }
  });

  it('candidate ids are unique and every candidate has a reason', () => {
    const ids = SCENARIOS.flatMap((s) => s.candidates.map((c) => c.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of SCENARIOS) for (const c of s.candidates) expect(c.why.length).toBeGreaterThan(20);
  });

  it('filler such as file names, "image of" or a single generic word is never rated good or needs-work', () => {
    for (const s of SCENARIOS) for (const c of s.candidates) if (isFiller(c.text)) expect(c.rating).toBe('poor');
  });

  it('an informative image is never best served by an empty alt, and a decorative one always is', () => {
    for (const s of SCENARIOS) {
      const good = s.candidates.find((c) => c.rating === 'good')!;
      expect(altFlags(good.text).empty).toBe(s.decorative);
      if (!s.decorative) expect(s.candidates.filter((c) => altFlags(c.text).empty && c.rating === 'good')).toHaveLength(0);
    }
  });

  it('detects the filler patterns', () => {
    expect(altFlags('lunch-chart-final.png').fileName).toBe(true);
    expect(altFlags('Image of a bar chart').startsWithImageOf).toBe(true);
    expect(altFlags('A photograph of a dog').startsWithImageOf).toBe(true);
    expect(altFlags('chart').singleGenericWord).toBe(true);
    expect(altFlags('  ').empty).toBe(true);
    expect(altFlags('Bar chart: pizza is the most popular lunch.')).toEqual({ empty: false, fileName: false, startsWithImageOf: false, singleGenericWord: false });
  });

  it('counts agreement over the candidates rated so far', () => {
    const s = SCENARIOS[0];
    expect(agreement(s, {})).toEqual({ rated: 0, matched: 0, total: 5 });
    expect(agreement(s, { c1: 'poor', c4: 'poor', c5: 'ok' })).toEqual({ rated: 3, matched: 2, total: 5 });
  });

  it('the chart numbers in the good alt text add up to 100', () => {
    const good = SCENARIOS[0].candidates.find((c) => c.rating === 'good')!.text;
    const nums = [...good.matchAll(/(\d+)%/g)].map((m) => Number(m[1]));
    expect(nums.reduce((a, b) => a + b, 0)).toBe(100);
  });
});
