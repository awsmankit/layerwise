import { describe, expect, it } from 'vitest';
import { WINDOW, causalPairs, charsThatFit, compare, copiesThatFit, examples, splitWord, tokenize } from './no-tokenizer';

describe('no tokenizer what-if', () => {
  it('splits words with the longest match first', () => {
    expect(splitWord('unhappy')).toEqual(['un', 'happy']);
    expect(splitWord('Internationalisation')).toEqual(['Inter', 'national', 'is', 'ation']);
    expect(splitWord('unpredictable')).toEqual(['un', 'predict', 'able']);
    expect(splitWord('reads')).toEqual(['read', 's']);
    expect(splitWord('zzq')).toEqual(['z', 'z', 'q']); // nothing known: falls back to letters
    expect(splitWord('')).toEqual([]);
  });
  it('counts the first example by hand: 31 characters, 8 words and marks, 9 subwords', () => {
    const t = 'The unhappy cat sat on the mat.';
    expect(tokenize(t, 'chars')).toHaveLength(31);
    expect(tokenize(t, 'words')).toEqual(['The', 'unhappy', 'cat', 'sat', 'on', 'the', 'mat', '.']);
    expect(tokenize(t, 'subwords')).toEqual(['The', 'un', 'happy', 'cat', 'sat', 'on', 'the', 'mat', '.']);
  });
  it('subword pieces join back to the text without its spaces', () => {
    for (const e of examples) {
      expect(tokenize(e.text, 'subwords').join('')).toBe(e.text.replace(/ /g, ''));
      expect(tokenize(e.text, 'chars').join('')).toBe(e.text);
    }
  });
  it('pairs grow with the square: n(n+1)/2', () => {
    expect(causalPairs(1)).toBe(1);
    expect(causalPairs(4)).toBe(10);
    expect(causalPairs(31)).toBe(496);
    expect(causalPairs(100) / causalPairs(10)).toBeGreaterThan(90);
  });
  it('characters always give the longest sequence and the most pairs', () => {
    for (const e of examples) {
      const [c, s, w] = compare(e.text);
      expect(c.tokens).toBe(e.text.length);
      expect(c.tokens).toBeGreaterThan(s.tokens);
      expect(s.tokens).toBeGreaterThanOrEqual(w.tokens);
      expect(c.pairs).toBeGreaterThan(s.pairs);
      expect(c.chars).toBe(WINDOW);
      expect(s.chars).toBeGreaterThan(c.chars);
    }
  });
  it('the long Layerwise-style sentence: counts and window capacity', () => {
    const t = examples[2].text;
    const [c, s, w] = compare(t);
    expect(c.tokens).toBe(t.length);
    expect(w.tokens).toBe(17);
    expect(s.tokens).toBe(19);
    expect(copiesThatFit(t, 'chars')).toBe(Math.floor(WINDOW / t.length));
    expect(charsThatFit(t, 'subwords')).toBe(Math.floor((WINDOW * t.length) / 19));
  });
});
