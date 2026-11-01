import { describe, expect, it } from 'vitest';
import { cer, normaliseWords, NO_NORMALISATION, numberToWords, scoreText, scoreWithNormalisation, type NormOptions } from './wer';

/* Reference values below were computed offline with jiwer 4.0.0 (process_words and cer). */

describe('word error rate', () => {
  it('matches jiwer on the worked example: one substitution, one deletion, one insertion', () => {
    const s = scoreText('she sells sea shells by the sea shore every day', 'she sells see shells by the shore every day today');
    expect([s.subs, s.dels, s.ins, s.hits]).toEqual([1, 1, 1, 8]);
    expect(s.wer).toBeCloseTo(0.3, 12);
    expect(s.mer).toBeCloseTo(0.2727272727, 9);
    expect(s.wil).toBeCloseTo(0.36, 9);
  });

  it('is 0 for a perfect transcript and counts every edit otherwise', () => {
    expect(scoreText('a b c d', 'a b c d').wer).toBe(0);
    const s = scoreText('hello world', 'hello duck');
    expect([s.subs, s.dels, s.ins]).toEqual([1, 0, 0]);
    expect(s.wer).toBe(0.5);
    expect(s.wil).toBeCloseTo(0.75, 12);
  });

  it('can exceed 1 when there are many insertions, while MER stays at or below 1', () => {
    const s = scoreText('a b c', 'd e f g h');
    expect([s.subs, s.dels, s.ins]).toEqual([3, 0, 2]);
    expect(s.wer).toBeCloseTo(5 / 3, 12);
    expect(s.mer).toBe(1);
    expect(s.wil).toBe(1);
  });

  it('counts two deletions', () => {
    const s = scoreText('the cat sat on the mat', 'cat sat the mat');
    expect([s.subs, s.dels, s.ins]).toEqual([0, 2, 0]);
    expect(s.wer).toBeCloseTo(1 / 3, 12);
  });

  it('one wrong number word is one substitution in four', () => {
    const s = scoreText('give him fifteen milligrams', 'give him fifty milligrams');
    expect(s.wer).toBe(0.25);
    expect(s.wil).toBeCloseTo(0.4375, 12);
  });

  it('gives the same total edits as jiwer even when the split between S, D and I could tie', () => {
    const s = scoreText('a b c d e f', 'b c x f g h');
    expect(s.edits).toBe(5);
    expect(s.wer).toBeCloseTo(5 / 6, 12);
    expect(s.mer).toBeCloseTo(0.7142857142857143, 12);
    expect(scoreText('one two three', 'three two one').edits).toBe(2);
  });

  it('has hits + substitutions + deletions equal to the reference length, and hits + substitutions + insertions equal to the hypothesis length', () => {
    const s = scoreText('the quick brown fox jumps', 'a quick brown box jumps over');
    expect(s.hits + s.subs + s.dels).toBe(s.refLen);
    expect(s.hits + s.subs + s.ins).toBe(s.hypLen);
  });

  it('is undefined for an empty reference, as in jiwer: empty against empty is a correct silence, and any output is insertions', () => {
    expect(scoreText('', '').wer).toBeNaN();
    expect(scoreText('', '').edits).toBe(0);
    const s = scoreText('', 'thanks for watching');
    expect(s.ins).toBe(3);
    expect(s.wer).toBeNaN();
    expect(s.wil).toBe(1);
  });

  it('lists the alignment in reading order', () => {
    const s = scoreText('the cat sat', 'the hat sat down');
    expect(s.items.map((i) => i.op)).toEqual(['ok', 'sub', 'ok', 'ins']);
    expect(s.items[1]).toEqual({ op: 'sub', ref: 'cat', hyp: 'hat' });
    expect(s.items[3]).toEqual({ op: 'ins', hyp: 'down' });
  });
});

describe('character error rate', () => {
  it('matches jiwer, counting spaces', () => {
    expect(cer('she sells sea shells by the sea shore every day', 'she sells see shells by the shore every day today')).toBeCloseTo(0.23404255319148937, 12);
    expect(cer('hello world', 'hello duck')).toBeCloseTo(0.45454545454545453, 12);
    expect(cer('give him fifteen milligrams', 'give him fifty milligrams')).toBeCloseTo(0.1111111111111111, 12);
    expect(cer('a b c', 'd e f g h')).toBeCloseTo(1.4, 12);
  });
  it('is undefined for an empty reference', () => {
    expect(cer('', 'x')).toBeNaN();
  });
});

describe('number words', () => {
  it('spells out 0 to 999', () => {
    expect(numberToWords(0)).toEqual(['zero']);
    expect(numberToWords(12)).toEqual(['twelve']);
    expect(numberToWords(40)).toEqual(['forty']);
    expect(numberToWords(21)).toEqual(['twenty', 'one']);
    expect(numberToWords(100)).toEqual(['one', 'hundred']);
    expect(numberToWords(101)).toEqual(['one', 'hundred', 'and', 'one']);
    expect(numberToWords(999).join(' ')).toBe('nine hundred and ninety nine');
  });
  it('rejects numbers it cannot spell', () => {
    expect(() => numberToWords(1000)).toThrow(RangeError);
    expect(() => numberToWords(-1)).toThrow(RangeError);
    expect(() => numberToWords(1.5)).toThrow(RangeError);
  });
});

describe('the toy normaliser', () => {
  const all: NormOptions = { lowercase: true, punctuation: true, numerals: true, contractions: true, fillers: true };

  it('does nothing when every step is off, apart from splitting on spaces', () => {
    expect(normaliseWords('Hello,  World.', NO_NORMALISATION)).toEqual(['Hello,', 'World.']);
  });

  it('lowercases and strips punctuation on request', () => {
    expect(normaliseWords('Hello, World!', { ...NO_NORMALISATION, lowercase: true })).toEqual(['hello,', 'world!']);
    expect(normaliseWords('Hello, World! (well-known)', { ...NO_NORMALISATION, punctuation: true })).toEqual(['Hello', 'World', 'well', 'known']);
  });

  it('keeps apostrophes inside words and drops quote marks at their edges', () => {
    expect(normaliseWords("it's 'fine'", { ...NO_NORMALISATION, punctuation: true })).toEqual(["it's", 'fine']);
    expect(normaliseWords('it’s fine', { ...NO_NORMALISATION, punctuation: true })).toEqual(["it's", 'fine']);
  });

  it('turns digits into words and expands contractions', () => {
    expect(normaliseWords('call at 5', { ...NO_NORMALISATION, numerals: true })).toEqual(['call', 'at', 'five']);
    expect(normaliseWords("You're sure, I'm not", { ...NO_NORMALISATION, contractions: true })).toEqual(['you', 'are', 'sure,', 'i', 'am', 'not']);
  });

  it('drops fillers, including ones followed by a comma', () => {
    expect(normaliseWords('so um, I think uh yes', { ...NO_NORMALISATION, fillers: true })).toEqual(['so', 'I', 'think', 'yes']);
  });

  it('makes differences in format disappear: "Call me at 5, it\'s urgent." against "call me at five it is urgent"', () => {
    const ref = "Call me at 5, it's urgent.";
    const hyp = 'call me at five it is urgent';
    const raw = scoreWithNormalisation(ref, hyp, NO_NORMALISATION);
    expect(raw.edits).toBe(5);
    expect(raw.wer).toBeCloseTo(5 / 6, 12);
    expect(scoreWithNormalisation(ref, hyp, all).wer).toBe(0);
  });

  it('is deliberately partial: each step fixes only its own kind of difference', () => {
    const ref = "Call me at 5, it's urgent.";
    const hyp = 'call me at five it is urgent';
    expect(scoreWithNormalisation(ref, hyp, { ...all, numerals: false }).edits).toBe(1);
    expect(scoreWithNormalisation(ref, hyp, { ...all, contractions: false }).edits).toBe(2);
    expect(scoreWithNormalisation(ref, hyp, { ...all, lowercase: false }).edits).toBe(1);
  });
});
