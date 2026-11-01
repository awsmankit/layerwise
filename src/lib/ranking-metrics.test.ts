import { describe, expect, it } from 'vitest';
import { dcg, idealDcg, ndcg, precisionAtK, recallAtK } from './ranking-metrics';

describe('DCG and NDCG', () => {
  it('matches the retrieval-metrics lesson example (relevant at ranks 3 and 5, three relevant in all)', () => {
    const rels = [0, 0, 1, 0, 1];
    expect(dcg(rels, 5)).toBeCloseTo(0.5 + 1 / Math.log2(6), 10);
    // ideal puts the 3 relevant items first: 1 + 0.631 + 0.5, but only two relevant items are in this list
    expect(idealDcg([1, 1, 1, 0, 0], 5)).toBeCloseTo(1 + 1 / Math.log2(3) + 0.5, 10);
  });

  it('graded example: 3, 2, 3, 0, 1, 2 at k = 6', () => {
    const rels = [3, 2, 3, 0, 1, 2];
    expect(dcg(rels, 6)).toBeCloseTo(3 + 2 / Math.log2(3) + 3 / 2 + 0 + 1 / Math.log2(6) + 2 / Math.log2(7), 10);
    expect(dcg(rels, 6)).toBeCloseTo(6.8611, 3);
    expect(idealDcg(rels, 6)).toBeCloseTo(7.1414, 3);
    expect(ndcg(rels, 6)).toBeCloseTo(0.9608, 3);
  });

  it('a perfect ordering scores 1 and a reversed one scores less', () => {
    expect(ndcg([3, 2, 1, 0], 4)).toBeCloseTo(1, 10);
    expect(ndcg([0, 1, 2, 3], 4)).toBeLessThan(0.7);
  });

  it('nothing relevant gives 0, not NaN', () => {
    expect(ndcg([0, 0, 0], 3)).toBe(0);
  });

  it('exponential gain rewards the top grade more', () => {
    expect(dcg([3], 1, 'exponential')).toBe(7);
    expect(dcg([3], 1, 'linear')).toBe(3);
  });

  it('only the first k results count', () => {
    expect(dcg([1, 1, 1, 1], 2)).toBeCloseTo(1 + 1 / Math.log2(3), 10);
  });
});

describe('precision and recall at k', () => {
  it('counts relevant results in the first k', () => {
    const rels = [1, 0, 1, 0, 0, 1];
    expect(precisionAtK(rels, 3)).toBeCloseTo(2 / 3, 10);
    expect(recallAtK(rels, 3, 4)).toBeCloseTo(2 / 4, 10);
  });
  it('recall counts relevant items that were never retrieved in the denominator', () => {
    expect(recallAtK([1, 1], 2, 5)).toBeCloseTo(0.4, 10);
  });
  it('handles empty and zero cases', () => {
    expect(recallAtK([0, 0], 2, 0)).toBe(0);
    expect(precisionAtK([1], 0)).toBe(0);
  });
});
