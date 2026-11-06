import { describe, expect, it } from 'vitest';
import { PASSAGES, QUESTION, answerRank, answersQuestion, firstPassScore, hasDuration, onTopic, ranked, rerankScore, stem, toyReply, visible } from './no-reranker';

describe('no reranker what-if', () => {
  it('stems plurals and -ed', () => {
    expect(stem('returned')).toBe('return');
    expect(stem('returns')).toBe('return');
    expect(stem('glass')).toBe('glass');
  });
  it('first-pass score is the cosine of word counts (hand-checked)', () => {
    // question words: long return item bought online. "Gift items bought online can be returned for store credit":
    // item, bought, online, gift, return, store, credit -> shares 4 of 5 question words
    const s = firstPassScore(QUESTION, 'Gift items bought online can be returned for store credit.');
    expect(s).toBeCloseTo(4 / Math.sqrt(5 * 7), 10);
    expect(firstPassScore(QUESTION, 'nothing here matches')).toBe(0);
  });
  it('the first pass puts the real answer at rank 7', () => {
    expect(answerRank(false)).toBe(7);
    expect(ranked(false).map((r) => r.id).indexOf('window')).toBe(6);
  });
  it('a model that only reads the top 3 never sees it', () => {
    const top3 = visible(false, 3);
    expect(top3).toHaveLength(3);
    expect(top3.some((r) => r.answers)).toBe(false);
    expect(toyReply(top3).answered).toBe(false);
  });
  it('the reranker moves it to rank 1 and the model can answer', () => {
    expect(answerRank(true)).toBe(1);
    const reply = toyReply(visible(true, 3));
    expect(reply.answered).toBe(true);
    expect(reply.text).toContain('30 days');
  });
  it('only the window passage is on topic and gives a duration', () => {
    expect(PASSAGES.filter((p) => answersQuestion(p.text)).map((p) => p.id)).toEqual(['window']);
    // the delivery passage has a duration but is not about returns
    expect(hasDuration(PASSAGES.find((p) => p.id === 'delivery')!.text)).toBe(true);
    expect(onTopic(PASSAGES.find((p) => p.id === 'delivery')!.text)).toBe(false);
  });
  it('the reranker score is 0.4 first pass + 0.2 topic + 0.4 answer', () => {
    const w = PASSAGES.find((p) => p.id === 'window')!.text;
    expect(rerankScore(QUESTION, w)).toBeCloseTo(0.4 * firstPassScore(QUESTION, w) + 0.6, 10);
  });
  it('shows more of the list, more chance: the answer is visible from k = 7 on without a reranker', () => {
    for (let k = 1; k <= 10; k++) expect(visible(false, k).some((r) => r.answers)).toBe(k >= 7);
  });
  it('ranks are 1 to 10 once each', () => {
    expect(ranked(true).map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});
