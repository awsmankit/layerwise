import { describe, expect, it } from 'vitest';
import { attentionWeights, canSee, corpus, correctCount, peekAccuracyOnCorpus, percent, results, sentence, trainPairs, view } from './causal-mask';

describe('causal mask what-if', () => {
  it('the masked grid is lower-triangular: the upper triangle is exactly 0 and every row adds to 1', () => {
    const w = attentionWeights(6, true);
    for (let i = 0; i < 6; i++) {
      expect(w[i].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
      for (let j = 0; j < 6; j++) expect(w[i][j] === 0).toBe(j > i);
    }
    expect(w[0][0]).toBe(1);
    expect(w[3][2]).toBeCloseTo(0.25, 12); // row 3 reads 4 words
  });
  it('without the mask every cell is 1/n', () => {
    const w = attentionWeights(6, false);
    for (const row of w) for (const x of row) expect(x).toBeCloseTo(1 / 6, 12);
  });
  it('canSee matches the grid', () => {
    expect(canSee(2, 3, true)).toBe(false);
    expect(canSee(2, 2, true)).toBe(true);
    expect(canSee(2, 5, false)).toBe(true);
  });
  it('the pair table, checked by hand', () => {
    const t = trainPairs();
    expect(t.the).toBe('cat'); // cat follows "the" twice, every other word once
    expect(t.sat).toBe('on');
    expect(t.cat).toBe('ate'); // tie between ate and sat, alphabetical
    expect(t.on).toBe('the');
  });
  it('the masked model scores 3 of 5 (60%) and gets the same score in practice and live', () => {
    const p = results(true, 'practice');
    const l = results(true, 'live');
    expect(correctCount(p)).toBe(3);
    expect(percent(p)).toBe(60);
    expect(l.map((r) => r.pred)).toEqual(p.map((r) => r.pred));
  });
  it('the unmasked model scores 5 of 5 in practice and 0 of 5 live', () => {
    const p = results(false, 'practice');
    expect(correctCount(p)).toBe(5);
    expect(percent(p)).toBe(100);
    const l = results(false, 'live');
    expect(correctCount(l)).toBe(0);
    expect(l.every((r) => r.pred === null)).toBe(true);
  });
  it('the peeking rule is perfect on the whole training text too', () => {
    expect(peekAccuracyOnCorpus()).toBe(1);
    expect(corpus[0]).toEqual([...sentence]);
  });
  it('view hides exactly the words that should be hidden', () => {
    expect(view(sentence, 1, true, 'practice')).toEqual(['the', 'cat', null, null, null, null]);
    expect(view(sentence, 1, false, 'practice')).toEqual([...sentence]);
    expect(view(sentence, 1, false, 'live')).toEqual(['the', 'cat', null, null, null, null]);
  });
});
