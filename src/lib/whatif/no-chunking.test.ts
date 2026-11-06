import { describe, expect, it } from 'vitest';
import { BUDGET, chunkRanges, chunkScore, keywords, QUESTIONS, retrieve, SIZES, successCount, WORDS, sentenceRange, stem } from './no-chunking';

describe('no chunking what-if', () => {
  it('splits the handbook into fixed-size pieces covering every word once', () => {
    const c = chunkRanges(20);
    expect(c[0]).toEqual([0, 20]);
    expect(c[c.length - 1][1]).toBe(WORDS.length);
    expect(c.reduce((s, [a, b]) => s + (b - a), 0)).toBe(WORDS.length);
    expect(chunkRanges(WORDS.length)).toEqual([[0, WORDS.length]]);
  });
  it('finds sentences by word range', () => {
    const [a, b] = sentenceRange(1);
    expect(WORDS.slice(a, b).join(' ')).toBe('Setup takes about ten minutes and needs a screwdriver and the free app.');
  });
  it('extracts and stems question words', () => {
    expect(stem('sensors')).toBe('sensor');
    expect(stem('glass')).toBe('glass');
    expect(keywords('What does the warranty cover?')).toEqual(['warranty', 'cover']);
  });
  it('scores by shared question words divided by the square root of the length', () => {
    // a 4-word piece with both words of a 2-word question: 2 / sqrt(4)
    const i = WORDS.findIndex((w) => w.toLowerCase() === 'warranty');
    expect(chunkScore([i, i + 4], ['warranty', 'last'])).toBeCloseTo(2 / 2, 10);
    expect(chunkScore([0, 4], ['warranty'])).toBe(0);
  });
  it('whole document: only the answer that sits inside the first budget of words gets through', () => {
    const whole = WORDS.length;
    expect(retrieve(0, whole).ok).toBe(true);
    for (let i = 1; i < QUESTIONS.length; i++) {
      const r = retrieve(i, whole);
      expect(r.ok, QUESTIONS[i].id).toBe(false);
      expect(r.reason).toBe('buried');
    }
    expect(successCount(whole)).toBe(1);
    expect(retrieve(0, whole).wordsSent).toBe(BUDGET);
  });
  it('tiny pieces cut the answer sentence apart', () => {
    expect(successCount(3)).toBe(1);
    expect(retrieve(2, 3).reason).toBe('cut');
  });
  it('good sized pieces get all five answers through, with less noise than a big piece', () => {
    expect(successCount(12)).toBe(5);
    expect(successCount(30)).toBe(5);
    // the reset sentence is 14 words; at 12 words it spans two pieces (24 words), at 60 words it spans one or two pieces of 60
    expect(retrieve(1, 12).focus).toBeCloseTo(14 / 24, 10);
    expect(retrieve(1, 60).focus).toBeLessThan(retrieve(1, 12).focus);
    expect(retrieve(1, WORDS.length).focus).toBeCloseTo(14 / WORDS.length, 10);
  });
  it('success rises, plateaus, then falls as pieces grow (the slider steps)', () => {
    const counts = SIZES.map((s) => successCount(s));
    expect(counts[0]).toBeLessThan(Math.max(...counts));
    expect(counts[counts.length - 1]).toBeLessThan(Math.max(...counts));
    expect(Math.max(...counts)).toBe(5);
  });
  it('never sends more than the budget', () => {
    for (const s of [...SIZES, WORDS.length]) for (let i = 0; i < QUESTIONS.length; i++) expect(retrieve(i, s).wordsSent).toBeLessThanOrEqual(BUDGET);
  });
});
