import { describe, expect, it } from 'vitest';
import { callCost, example, firstWrong, makeStream, questions, run, similarity, stream, summarise, sweep, thresholds, words, type Question } from './no-semantic-cache';

const q = (text: string, key: string): Question => ({ text, key });

describe('no semantic cache what-if', () => {
  it('drops filler words and keeps the ones that carry the meaning', () => {
    expect(words('How do I cancel my order?')).toEqual(['cancel', 'order']);
    expect(words('What is the weather in Paris today?')).toEqual(['weather', 'paris', 'today']);
  });
  it('similarity is shared words over all words: cancel vs track an order is 1/3, Paris vs Tokyo weather is 2/4', () => {
    expect(similarity('How do I cancel my order?', 'How do I track my order?')).toBeCloseTo(1 / 3, 12);
    expect(similarity('What is the weather in Paris today?', 'What is the weather in Tokyo today?')).toBe(0.5);
    expect(similarity('Cancel my order please', 'How do I cancel my order?')).toBe(1);
    expect(similarity('abc', 'xyz')).toBe(0);
  });
  it('one model call costs 400 x $3 + 250 x $15 per million tokens = $0.00495', () => {
    expect(callCost()).toBeCloseTo(0.00495, 12);
  });
  it('the stream is the same every time and has 60 questions', () => {
    expect(stream).toHaveLength(60);
    expect(makeStream()).toEqual(stream);
    expect(new Set(stream.map((s) => s.text)).size).toBeLessThan(60);
    expect(questions.length).toBeGreaterThan(40);
  });
  it('a hand-made stream: exact hits the repeat only, similar also hits the rephrasing and the wrong look-alike', () => {
    const qs = [q('How do I cancel my order?', 'cancel'), q('How do I cancel my order?', 'cancel'), q('Cancel my order please', 'cancel'), q('How do I track my order?', 'track')];
    expect(run('none', 0, qs).map((s) => s.outcome)).toEqual(['model', 'model', 'model', 'model']);
    expect(run('exact', 1, qs).map((s) => s.outcome)).toEqual(['model', 'hit', 'model', 'model']);
    // at 0.3 the track question (1/3 similar) gets the cancel answer, which is wrong
    expect(run('similar', 0.3, qs).map((s) => s.outcome)).toEqual(['model', 'hit', 'hit', 'wrong']);
    // at 0.5 it is sent to the model
    expect(run('similar', 0.5, qs).map((s) => s.outcome)).toEqual(['model', 'hit', 'hit', 'model']);
    expect(firstWrong(run('similar', 0.3, qs))?.from).toBe('How do I cancel my order?');
  });
  it('no cache: 60 model calls, $0.297, 2,000 ms each', () => {
    const s = summarise('none', run('none', 1));
    expect(s.modelCalls).toBe(60);
    expect(s.cost).toBeCloseTo(60 * 0.00495, 9);
    expect(s.costSaved).toBe(0);
    expect(s.avgMs).toBe(2000);
    expect(s.hitRate).toBe(0);
  });
  it('exact cache on the toy stream: 26 hits, none wrong, and the saving is the hits times the call cost', () => {
    const s = summarise('exact', run('exact', 1));
    expect(s.hits).toBe(26);
    expect(s.wrong).toBe(0);
    expect(s.modelCalls).toBe(34);
    expect(s.costSaved).toBeCloseTo(26 * callCost(), 9);
    // time: 34 misses at 2,030 ms plus 26 hits at 30 ms, over 60 questions
    expect(s.avgMs).toBeCloseTo((34 * 2030 + 26 * 30) / 60, 9);
    expect(s.msSaved).toBeCloseTo(2000 - s.avgMs, 9);
  });
  it('similarity cache at 0.5 hits 72 percent but 4 of those answers are wrong; at 0.7 none are wrong', () => {
    const loose = summarise('similar', run('similar', 0.5));
    expect(loose.hits + loose.wrong).toBe(43);
    expect(loose.wrong).toBe(4);
    expect(loose.hitRate).toBeCloseTo(43 / 60, 12);
    expect(firstWrong(run('similar', 0.5))).not.toBeNull();
    const tight = summarise('similar', run('similar', 0.7));
    expect(tight.wrong).toBe(0);
    expect(tight.hits).toBe(33);
    expect(firstWrong(run('similar', 0.7))).toBeNull();
  });
  it('at 0.30 the cache answers 49 of 60 (82 percent) and 8 are wrong; at 0.70 it answers 33 (55 percent) and none are wrong', () => {
    const loose = summarise('similar', run('similar', 0.3));
    expect(loose.hits + loose.wrong).toBe(49);
    expect(loose.wrong).toBe(8);
    expect(Math.round(loose.hitRate * 100)).toBe(82);
    const tight = summarise('similar', run('similar', 0.7));
    expect(Math.round(tight.hitRate * 100)).toBe(55);
    expect(tight.wrong).toBe(0);
  });
  it('a looser threshold never lowers the hit rate and never lowers the wrong answers (on this stream)', () => {
    const pts = sweep();
    expect(pts.map((p) => p.threshold)).toEqual(thresholds);
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i].hitRate).toBeLessThanOrEqual(pts[i - 1].hitRate + 1e-12);
      expect(pts[i].wrong).toBeLessThanOrEqual(pts[i - 1].wrong);
    }
  });
  it('a similarity cache at 1.0 behaves like exact matching on the filler-free words and is never wrong here', () => {
    const s = summarise('similar', run('similar', 1));
    expect(s.wrong).toBe(0);
    expect(s.hits).toBeGreaterThanOrEqual(summarise('exact', run('exact', 1)).hits);
  });
  it('cost and wait fall as hits rise, wrong or not; an empty stream is safe', () => {
    expect(summarise('similar', run('similar', 0.5)).cost).toBeLessThan(summarise('exact', run('exact', 1)).cost);
    expect(summarise('similar', run('similar', 0.5, [])).total).toBe(0);
    expect(summarise('none', [], example).avgMs).toBe(0);
  });
});
