import { describe, expect, it } from 'vitest';
import {
  DAYS,
  DOCS,
  DOC_COUNT,
  EXAMPLE,
  INTERVALS,
  KINDS,
  dailyShares,
  expectedShare,
  exampleOutdated,
  indexAge,
  indexedOn,
  isOutdated,
  lastRefresh,
  makeDocs,
  outdatedCount,
  overallShare,
  rebuilds,
  rng,
  staleShare,
  truthOn,
} from './stale-index';

describe('stale index what-if', () => {
  it('the generator is deterministic', () => {
    const a = rng(1);
    const b = rng(1);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(makeDocs(7)).toEqual(DOCS);
  });
  it('builds 120 documents whose popularity sums to 1, in the planned mix', () => {
    expect(DOCS).toHaveLength(DOC_COUNT);
    expect(DOCS.reduce((s, d) => s + d.weight, 0)).toBeCloseTo(1, 10);
    expect(DOCS.filter((d) => d.kind === 'fast')).toHaveLength(Math.round(KINDS[0].share * DOC_COUNT));
    expect(DOCS.filter((d) => d.kind === 'slow')).toHaveLength(60);
    for (const d of DOCS) for (const c of d.changes) expect(c >= 1 && c < DAYS).toBe(true);
  });
  it('rebuild days: every R days from day 0; never means day 0 forever', () => {
    expect(lastRefresh(0, 7)).toBe(0);
    expect(lastRefresh(6, 7)).toBe(0);
    expect(lastRefresh(7, 7)).toBe(7);
    expect(lastRefresh(20, 7)).toBe(14);
    expect(lastRefresh(59, Infinity)).toBe(0);
    expect(indexAge(20, 7)).toBe(6);
    expect(indexAge(59, Infinity)).toBe(59);
  });
  it('a document that changes on day 10 is outdated on days 10 to 13 when the index is rebuilt every 7 days (hand-checked)', () => {
    const doc = { changes: [10] };
    const out = Array.from({ length: 20 }, (_, d) => isOutdated(doc, d, 7));
    expect(out.map((x, d) => (x ? d : -1)).filter((d) => d >= 0)).toEqual([10, 11, 12, 13]);
    // never refreshed: outdated from day 10 on
    expect(isOutdated(doc, 9, Infinity)).toBe(false);
    expect(isOutdated(doc, 59, Infinity)).toBe(true);
  });
  it('a change on a rebuild day is missed by that rebuild (changes happen after midnight)', () => {
    expect(isOutdated({ changes: [14] }, 14, 7)).toBe(true);
    expect(isOutdated({ changes: [14] }, 15, 7)).toBe(true);
    expect(isOutdated({ changes: [14] }, 21, 7)).toBe(false);
  });
  it('the share of questions is the popularity of the outdated documents (hand-checked)', () => {
    const docs = [
      { id: 0, kind: 'fast' as const, weight: 0.75, changes: [3] },
      { id: 1, kind: 'slow' as const, weight: 0.25, changes: [] },
    ];
    expect(staleShare(2, Infinity, docs)).toBe(0);
    expect(staleShare(3, Infinity, docs)).toBe(0.75);
    expect(outdatedCount(3, Infinity, docs)).toBe(1);
    // rebuilt every 5 days: outdated days 3 and 4 only, so 2 of 10 days at 0.75
    expect(overallShare(5, docs, 10)).toBeCloseTo((2 * 0.75) / 10, 12);
  });
  it('never refreshing is the worst, and a longer interval never helps (monotonic over the slider values)', () => {
    const shares = INTERVALS.map((r) => overallShare(r));
    for (let i = 1; i < shares.length; i++) expect(shares[i]).toBeGreaterThanOrEqual(shares[i - 1]);
    expect(overallShare(Infinity)).toBeGreaterThan(shares[shares.length - 1]);
    expect(overallShare(Infinity)).toBeGreaterThan(0.3);
  });
  it('the share of outdated answers under never-refreshing only grows over time (a document stays outdated once changed)', () => {
    const d = dailyShares(Infinity);
    expect(d[0]).toBe(0);
    for (let i = 1; i < d.length; i++) expect(d[i]).toBeGreaterThanOrEqual(d[i - 1]);
  });
  it('the random draw agrees with the formula to within 5 percentage points', () => {
    for (const r of [...INTERVALS, Infinity]) expect(Math.abs(overallShare(r) - expectedShare(r))).toBeLessThan(0.05);
  });
  it('the formula for one document rebuilt daily: chance 1 - (5/6) = 1/6', () => {
    const docs = [{ id: 0, kind: 'fast' as const, weight: 1, changes: [] }];
    // fast kind is p = 1/6: every day has age 0, so the chance is 1 - (5/6) = 1/6
    expect(expectedShare(1, docs, 10)).toBeCloseTo(1 / 6, 10);
  });
  it('rebuild count', () => {
    expect(rebuilds(7)).toBe(9); // days 0, 7, ..., 56
    expect(rebuilds(1)).toBe(60);
    expect(rebuilds(Infinity)).toBe(1);
  });
  it('the example page: the index serves the old version until the next midnight rebuild', () => {
    expect(truthOn(11).text).toBe(EXAMPLE.versions[0].text);
    expect(truthOn(12).text).toBe(EXAMPLE.versions[1].text);
    expect(indexedOn(12, 7).from).toBe(0);
    expect(exampleOutdated(12, 7)).toBe(true);
    expect(exampleOutdated(14, 7)).toBe(false);
    expect(exampleOutdated(59, Infinity)).toBe(true);
    expect(indexedOn(59, Infinity).from).toBe(0);
    expect(exampleOutdated(5, Infinity)).toBe(false);
  });
});
