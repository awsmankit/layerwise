import { describe, expect, it } from 'vitest';
import { DOCS, QUERIES, RRF_K, answerRank, cosine, embed, firstCount, fuse, hybridList, idf, keywordList, rankOf, tokens, vectorList } from './no-hybrid-search';

describe('no hybrid search what-if', () => {
  it('keeps error codes in one piece and drops filler words', () => {
    expect(tokens('Error E-4021: the payment card was declined.')).toEqual(['error', 'e-4021', 'payment', 'card', 'declined']);
  });
  it('idf: a code in one page of twelve is worth ln(1 + 11.5 / 1.5)', () => {
    expect(idf('e-4021')).toBeCloseTo(Math.log(1 + 11.5 / 1.5), 10);
    expect(idf('e-4021')).toBeGreaterThan(idf('payment'));
  });
  it('keyword search nails an exact code and returns only that page', () => {
    const list = keywordList('E-4021');
    expect(list.map((r) => r.id)).toEqual(['e4021']);
    expect(list[0].score).toBeCloseTo(1.91, 1);
  });
  it('keyword search returns nothing when no word is shared', () => {
    expect(keywordList('my money was refused, what now')).toEqual([]);
    expect(keywordList('how do I swap the lid on my power pack')).toEqual([]);
  });
  it('the toy vectors cannot tell codes apart: three different codes give the same vector list', () => {
    const a = vectorList('E-4021').map((r) => r.id);
    expect(vectorList('HX-7731C').map((r) => r.id)).toEqual(a);
    expect(vectorList('Okonkwo-Smythe').map((r) => r.id)).toEqual(a);
    expect(cosine(embed('E-4012'), embed('E-4021'))).toBeCloseTo(1, 12);
  });
  it('vectors put the right page at 5 and 9 for the code and the part number, and keyword search finds both', () => {
    const [code, part, name, refused, lid] = QUERIES;
    expect(answerRank(code, 'vector')).toBe(5);
    expect(answerRank(part, 'vector')).toBe(9);
    expect(answerRank(name, 'vector')).toBe(2);
    for (const q of [code, part, name]) expect(answerRank(q, 'keyword')).toBe(1);
    for (const q of [refused, lid]) {
      expect(answerRank(q, 'keyword')).toBeNull();
      expect(answerRank(q, 'vector')).toBe(1);
    }
  });
  it('meaning search handles a different wording of the same idea', () => {
    expect(vectorList('my money was refused, what now')[0].id).toBe('declined');
    expect(vectorList('how do I swap the lid on my power pack')[0].id).toBe('cover');
  });
  it('RRF is the sum of 1 / (k + rank) over the lists that hold the page (hand-checked)', () => {
    const kw = [{ id: 'e4021', score: 2, rank: 1 }];
    const vec = [
      { id: 'drL', score: 0.4, rank: 1 },
      { id: 'e4021', score: 0.2, rank: 2 },
    ];
    const out = fuse([kw, vec]);
    expect(out[0].id).toBe('e4021');
    expect(out[0].score).toBeCloseTo(1 / 61 + 1 / 62, 12);
    expect(out[1].score).toBeCloseTo(1 / 61, 12);
    expect(out[0].fromKeyword).toBe(1);
    expect(out[0].fromVector).toBe(2);
    expect(out[1].fromKeyword).toBeNull();
  });
  it('a page that is first in both lists scores 2 / (k + 1)', () => {
    const l = [{ id: 'a', score: 1, rank: 1 }];
    expect(fuse([l, l], 60)[0].score).toBeCloseTo(2 / 61, 12);
    expect(fuse([l, l], 10)[0].score).toBeCloseTo(2 / 11, 12);
    expect(RRF_K).toBe(60);
  });
  it('hybrid search puts the right page first for all five questions; each single search misses some', () => {
    expect(firstCount('hybrid')).toBe(5);
    expect(firstCount('keyword')).toBe(3);
    expect(firstCount('vector')).toBe(2);
  });
  it('a page that only one search found keeps a score of 1 / (k + rank)', () => {
    const list = hybridList('my money was refused, what now');
    expect(list[0].id).toBe('declined');
    expect(list[0].fromKeyword).toBeNull();
    expect(list[0].score).toBeCloseTo(1 / 61, 12);
  });
  it('rankOf reports a missing page as null', () => {
    expect(rankOf(keywordList('E-4021'), 'cover')).toBeNull();
    expect(DOCS.length).toBe(12);
  });
  it('a larger k flattens the scores: the gap between rank 1 and rank 2 shrinks', () => {
    const gap = (k: number) => 1 / (k + 1) - 1 / (k + 2);
    expect(gap(10)).toBeGreaterThan(gap(60));
    expect(gap(60)).toBeGreaterThan(gap(200));
  });
});
