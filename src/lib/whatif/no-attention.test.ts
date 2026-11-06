import { describe, expect, it } from 'vitest';
import { ANIMAL, IT, STREET, blend, endings, resolve, scores, softmax, weights, words } from './no-attention';

describe('no attention what-if', () => {
  it('scores are query dot key, checked by hand', () => {
    // query for "tired": [1,3,0,-1]. animal key [1,1,0,0] -> 1+3 = 4. street [1,0,1,0] -> 1. "the" [0,0,0,1] -> -1.
    const s = scores('tired');
    expect(s[ANIMAL]).toBe(4);
    expect(s[STREET]).toBe(1);
    expect(s[0]).toBe(-1);
    expect(s[3]).toBe(-0.5);
  });
  it('softmax adds up to 1 and keeps order', () => {
    const w = softmax([1, 2, 3]);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(w[2]).toBeGreaterThan(w[1]);
    expect(w[0]).toBeCloseTo(Math.exp(1) / (Math.exp(1) + Math.exp(2) + Math.exp(3)), 12);
  });
  it('with attention, "it" finds the animal when tired and the street when wide', () => {
    expect(resolve(weights('tired', 'attention'))).toBe('animal');
    expect(resolve(weights('wide', 'attention'))).toBe('street');
    const w = weights('tired', 'attention');
    expect(w[ANIMAL]).toBeGreaterThan(0.5);
    expect(blend(w)[1]).toBeGreaterThan(blend(w)[2] * 3);
    expect(endings.tired.word).toBe('tired');
  });
  it('without attention, "it" cannot be resolved', () => {
    for (const ending of ['tired', 'wide'] as const) {
      expect(resolve(weights(ending, 'self'))).toBeNull();
      expect(resolve(weights(ending, 'average'))).toBeNull();
    }
  });
  it('self-only keeps everything on the word itself', () => {
    const w = weights('tired', 'self');
    expect(w[IT]).toBe(1);
    expect(w.reduce((a, b) => a + b, 0)).toBe(1);
    expect(blend(w)).toEqual([1, 0, 0, 0]); // it only knows it is a noun-like word
  });
  it('the plain average gives each of the other ten words one tenth, so "alive" is only 0.1', () => {
    const w = weights('tired', 'average');
    expect(words.length).toBe(11);
    expect(w[IT]).toBe(0);
    expect(w[ANIMAL]).toBeCloseTo(0.1, 12);
    expect(w[STREET]).toBeCloseTo(0.1, 12);
    expect(blend(w)[1]).toBeCloseTo(0.1, 12); // only "animal" is alive
    expect(blend(w)[2]).toBeCloseTo(0.1, 12); // only "street" is a place
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });
  it('the average gives the same answer whatever the ending, attention does not', () => {
    expect(weights('tired', 'average')).toEqual(weights('wide', 'average'));
    expect(weights('tired', 'attention')).not.toEqual(weights('wide', 'attention'));
  });
});
