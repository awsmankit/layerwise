import { describe, expect, it } from 'vitest';
import { BLOCKS, buildPrompt, cannedAnswer, strength, VAGUE, whatChanged, wordCount, type Block } from './prompt-makeover';

const ALL = BLOCKS.map((b) => b.id);

describe('prompt makeover', () => {
  it('starts from the vague prompt', () => {
    expect(buildPrompt([])).toBe(VAGUE);
    expect(strength([])).toBe(0);
  });

  it('builds the full prompt from all five blocks', () => {
    const p = buildPrompt(ALL);
    expect(p).toContain('Explain why volcanoes erupt.');
    expect(p).toContain('I am 11');
    expect(p).toContain('five short sentences');
    expect(p).toContain('two questions');
    expect(strength(ALL)).toBe(5);
  });

  it('a length request caps the answer at five sentences, and is shorter', () => {
    const long = cannedAnswer(['what']);
    const short = cannedAnswer(['what', 'shape']);
    expect(short.sentences.length).toBe(5);
    expect(long.sentences.length).toBeGreaterThan(5);
    expect(wordCount(short)).toBeLessThan(wordCount(long));
  });

  it('a stated reader gives simpler wording', () => {
    expect(cannedAnswer(['what', 'who']).sentences[0]).not.toBe(cannedAnswer(['what']).sentences[0]);
  });

  it('every combination of blocks has an answer and a prompt', () => {
    for (let mask = 0; mask < 1 << ALL.length; mask++) {
      const on = ALL.filter((_, i) => mask & (1 << i)) as Block[];
      const a = cannedAnswer(on);
      expect(a.sentences.length).toBeGreaterThan(2);
      expect(buildPrompt(on).length).toBeGreaterThan(5);
      for (const s of a.sentences) expect(s).not.toMatch(/!/);
    }
  });

  it('the example block adds the fizzy drink and the steps block adds a question', () => {
    expect(cannedAnswer(['what', 'example']).sentences.join(' ')).toContain('fizzy drink');
    expect(cannedAnswer(['what', 'steps']).sentences.join(' ')).toContain('Question 1');
  });

  it('explains every block', () => {
    for (const b of ALL) expect(whatChanged(b).length).toBeGreaterThan(20);
  });
});
