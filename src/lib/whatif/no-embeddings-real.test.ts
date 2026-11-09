import { describe, expect, it } from 'vitest';
import { DOCS, QUERIES } from './no-embeddings';
import {
  REAL_DOWNLOAD_BYTES,
  compare,
  cosineReal,
  explainError,
  formatMB,
  norm,
  normalise,
  progressText,
  realRank,
  realVerdict,
  splitVectors,
  supportsRealModel,
  textsToEmbed,
  type RealVectors,
} from './no-embeddings-real';

/** Fixed example vectors (5 numbers each, NOT from a model): page i points along axis i; each question points mostly at its right page. */
const unit = (i: number, size = 5) => Array.from({ length: size }, (_, k) => (k === i ? 1 : 0));
const docs = DOCS.map((_, i) => unit(i));
const answerIndex = (qi: number) => DOCS.findIndex((d) => d.id === QUERIES[qi].answer);
const queries = QUERIES.map((_, qi) => unit(answerIndex(qi)).map((x, k) => x * 3 + (k === (qi + 1) % 5 ? 0.5 : 0)));
const good: RealVectors = { docs, queries };

describe('normalise and cosine', () => {
  it('scales to length 1 and keeps the direction', () => {
    expect(norm(normalise([3, 4]))).toBeCloseTo(1, 12);
    expect(normalise([3, 4])).toEqual([0.6, 0.8]);
  });
  it('leaves a zero vector as zeros instead of dividing by zero', () => {
    expect(normalise([0, 0, 0])).toEqual([0, 0, 0]);
    expect(cosineReal([0, 0], [1, 1])).toBe(0);
  });
  it('is 1 for the same direction whatever the length, 0 for unrelated, -1 for opposite', () => {
    expect(cosineReal([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 12);
    expect(cosineReal([1, 0], [0, 1])).toBeCloseTo(0, 12);
    expect(cosineReal([1, 2], [-1, -2])).toBeCloseTo(-1, 12);
  });
  it('matches a hand-worked value: (3,4) and (4,3) give 24/25', () => {
    expect(cosineReal([3, 4], [4, 3])).toBeCloseTo(24 / 25, 12);
  });
  it('refuses vectors of different sizes', () => {
    expect(() => cosineReal([1, 2], [1, 2, 3])).toThrow();
  });
});

describe('ranking and comparison with fixed vectors', () => {
  it('ranks best first and keeps page order on ties', () => {
    const rows = realRank([1, 0, 0, 0, 0], docs);
    expect(rows[0].id).toBe(DOCS[0].id);
    expect(rows.slice(1).map((r) => r.id)).toEqual(DOCS.slice(1).map((d) => d.id));
    expect(rows[0].score).toBeCloseTo(1, 12);
  });
  it('splits the model output into pages and questions in the order sent', () => {
    expect(textsToEmbed()).toEqual([...DOCS.map((d) => d.text), ...QUERIES.map((q) => q.text)]);
    const v = splitVectors([...docs, ...queries]);
    expect(v.docs).toHaveLength(5);
    expect(v.queries).toHaveLength(5);
  });
  it('rejects wrong counts, ragged vectors and NaN', () => {
    expect(() => splitVectors(docs)).toThrow();
    expect(() => splitVectors([...docs, ...queries.slice(0, 4), [1, 2]])).toThrow();
    expect(() => splitVectors([...docs, ...queries.slice(0, 4), [NaN, 0, 0, 0, 0]])).toThrow();
  });
  it('counts right-first answers for real, toy and keyword', () => {
    const c = compare(good);
    expect(c.realCount).toBe(5);
    expect(c.toyCount).toBe(5); // from the toy tests: meaning search gets all five
    expect(c.keywordCount).toBe(1); // only "refund policy" reuses the page's words
    expect(c.results.every((r) => r.margin > 0)).toBe(true);
  });
  it('reports a real miss and a disagreement with the toy, without hiding them', () => {
    // point "where is my package" (index 1) at the refunds page instead of delivery
    const bad: RealVectors = { docs, queries: queries.map((v, i) => (i === 1 ? unit(0).map((x) => x * 3) : v)) };
    const c = compare(bad);
    expect(c.realCount).toBe(4);
    expect(c.results[1].realOk).toBe(false);
    expect(c.results[1].realTop).toBe('refunds');
    expect(c.results[1].margin).toBeLessThan(0);
    const text = realVerdict(c);
    expect(text).toContain('4 of 5');
    expect(text).toContain('"where is my package" (put "Refund policy" first)');
    expect(text).toContain('toy right, real wrong');
  });
  it('says nothing about disagreement when real and toy agree', () => {
    const text = realVerdict(compare(good));
    expect(text).toContain('5 of 5');
    expect(text).not.toContain('disagree');
    expect(text).not.toContain('misses');
  });
});

describe('sizes, progress and errors', () => {
  it('quotes the download size', () => {
    expect(REAL_DOWNLOAD_BYTES).toBe(22_972_370 + 712_802);
    expect(formatMB(REAL_DOWNLOAD_BYTES, 0)).toBe('24 MB');
    expect(formatMB(1_500_000)).toBe('1.5 MB');
  });
  it('writes a progress line and never passes 100%', () => {
    expect(progressText(0, 0)).toBe('Starting the download');
    expect(progressText(5_000_000, 20_000_000)).toBe('Downloaded 5.0 MB of 20.0 MB (25%)');
    expect(progressText(21_000_000, 20_000_000)).toContain('(100%)');
  });
  it('explains memory, network and unsupported problems in plain words', () => {
    expect(explainError('RangeError: Array buffer allocation failed', true).kind).toBe('memory');
    expect(explainError('TypeError: Failed to fetch', true).kind).toBe('network');
    expect(explainError('TypeError: Load failed', true).kind).toBe('network');
    expect(explainError('anything', false).kind).toBe('network');
    expect(explainError('anything', false).text).toContain('has not been downloaded');
    expect(explainError('anything', false, true).text).toContain('stored on this device');
    expect(explainError('anything', true, true).text).not.toContain('stored on this device');
    expect(explainError('worker SyntaxError: module scripts not supported', true).kind).toBe('unsupported');
    expect(explainError('something odd', true).kind).toBe('other');
  });
  it('detects browsers that cannot run it', () => {
    expect(supportsRealModel({ Worker: class {}, WebAssembly: {} })).toBe(true);
    expect(supportsRealModel({ Worker: undefined, WebAssembly: {} })).toBe(false);
    expect(supportsRealModel({ Worker: class {}, WebAssembly: undefined })).toBe(false);
  });
});
