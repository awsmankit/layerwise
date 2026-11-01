import { describe, expect, it } from 'vitest';
import {
  EXAMPLE,
  breakEvenCorpus,
  breakEvenHitRate,
  breakEvenQueries,
  cacheMultiplier,
  cachedPerQuery,
  caveats,
  dailyCost,
  fits,
  longPerQuery,
  ragPerQuery,
  warmQueriesPerDay,
} from './long-context-cost';

describe('cache multiplier', () => {
  it('blends reads and writes', () => {
    expect(cacheMultiplier(0.9, 0.1, 1.25)).toBeCloseTo(0.215, 10);
    expect(cacheMultiplier(1, 0.1, 1.25)).toBeCloseTo(0.1, 10);
    expect(cacheMultiplier(0, 0.1, 1.25)).toBeCloseTo(1.25, 10);
  });
  it('clamps the hit rate', () => {
    expect(cacheMultiplier(2, 0.1, 1.25)).toBeCloseTo(0.1, 10);
    expect(cacheMultiplier(-1, 0.1, 1.25)).toBeCloseTo(1.25, 10);
  });
  it('finds the hit rate where caching starts to pay', () => {
    const h = breakEvenHitRate(0.1, 1.25);
    expect(h).toBeCloseTo(0.25 / 1.15, 10);
    expect(cacheMultiplier(h, 0.1, 1.25)).toBeCloseTo(1, 10);
    expect(breakEvenHitRate(0.1, 1)).toBe(0);
    expect(breakEvenHitRate(1, 1.25)).toBe(1);
  });
  it('knows how many questions keep a cache warm', () => {
    expect(warmQueriesPerDay(300)).toBe(288);
    expect(warmQueriesPerDay(1800)).toBe(48);
  });
});

describe('worked example (150,000-token collection, 2,000 questions a day)', () => {
  // Example numbers only: $3 and $15 per million tokens, cache read 0.1x, write 1.25x.
  const i = EXAMPLE;
  it('uncached long context', () => {
    // (150,000 + 200) * 3 / 1e6 = 0.4506 ; output 400 * 15 / 1e6 = 0.006
    expect(longPerQuery(i)).toBeCloseTo(0.4566, 10);
    expect(dailyCost(i, 'long')).toBeCloseTo(913.2, 6);
  });
  it('cached long context at a 90 per cent hit rate', () => {
    // (150,000 * 0.215 + 200) * 3 / 1e6 = 0.09735 ; plus 0.006
    expect(cachedPerQuery(i)).toBeCloseTo(0.10335, 10);
    expect(dailyCost(i, 'cached')).toBeCloseTo(206.7, 6);
  });
  it('retrieval', () => {
    // (4,000 + 200) * 3 / 1e6 = 0.0126 ; plus 0.006
    expect(ragPerQuery(i)).toBeCloseTo(0.0186, 10);
    expect(dailyCost(i, 'rag')).toBeCloseTo(42.2, 6);
  });
  it('fits in a 1M window', () => {
    expect(fits(i)).toBe(true);
    expect(fits({ ...i, corpus: 1_000_000 })).toBe(false);
  });
});

describe('second worked example (40,000-token handbook, 300 questions a day)', () => {
  const i = { ...EXAMPLE, corpus: 40_000, queries: 300 };
  it('cached stuffing edges out retrieval once its fixed cost is counted', () => {
    expect(dailyCost(i, 'long')).toBeCloseTo(37.98, 6);
    expect(dailyCost(i, 'cached')).toBeCloseTo(9.72, 6);
    expect(dailyCost(i, 'rag')).toBeCloseTo(10.58, 6);
  });
});

describe('break-even points', () => {
  const i = EXAMPLE;
  it('corpus size at which uncached stuffing equals retrieval', () => {
    const c = breakEvenCorpus(i, 'long')!;
    // (4,000 + 5 * 1e6 / (2,000 * 3)) / 1 = 4,000 + 833.33
    expect(c).toBeCloseTo(4833.3333, 3);
    expect(dailyCost({ ...i, corpus: c }, 'long')).toBeCloseTo(dailyCost(i, 'rag'), 6);
  });
  it('corpus size at which cached stuffing equals retrieval', () => {
    const c = breakEvenCorpus(i, 'cached')!;
    expect(c).toBeCloseTo(4833.3333 / 0.215, 3);
    expect(dailyCost({ ...i, corpus: c }, 'cached')).toBeCloseTo(dailyCost(i, 'rag'), 6);
  });
  it('query rate above which retrieval wins', () => {
    const q = breakEvenQueries(i, 'long')!;
    // 5 * 1e6 / ((150,000 - 4,000) * 3)
    expect(q).toBeCloseTo(5e6 / (146_000 * 3), 6);
    expect(q).toBeCloseTo(11.416, 2);
    expect(breakEvenQueries(i, 'cached')!).toBeCloseTo(5e6 / (28_250 * 3), 6);
    expect(breakEvenQueries(i, 'cached')!).toBeCloseTo(59.0, 1);
    expect(dailyCost({ ...i, queries: q }, 'long')).toBeCloseTo(dailyCost({ ...i, queries: q }, 'rag'), 6);
  });
  it('returns null when stuffing is never dearer, or inputs are undefined', () => {
    expect(breakEvenQueries({ ...i, corpus: 3000 }, 'long')).toBeNull();
    expect(breakEvenCorpus({ ...i, queries: 0 }, 'long')).toBeNull();
    expect(breakEvenCorpus({ ...i, pIn: 0 }, 'cached')).toBeNull();
  });
});

describe('caveats', () => {
  const i = EXAMPLE;
  it('flags a collection that does not fit', () => {
    const n = caveats({ ...i, corpus: 2_000_000 }, 'lookup', 'rarely', false);
    expect(n.some((x) => x.tone === 'warn' && /does not fit/.test(x.text))).toBe(true);
  });
  it('flags access control and churn', () => {
    const n = caveats(i, 'multi', 'constantly', true);
    expect(n.some((x) => /permission/.test(x.text))).toBe(true);
    expect(n.some((x) => /changes all the time/.test(x.text))).toBe(true);
  });
  it('has a note for each task kind', () => {
    expect(caveats(i, 'whole', 'rarely', false).some((x) => /whole collection/.test(x.text))).toBe(true);
    expect(caveats(i, 'lookup', 'rarely', false).some((x) => x.tone === 'ok')).toBe(true);
  });
});
