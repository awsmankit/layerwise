import { describe, expect, it } from 'vitest';
import { FACTS, notesFile, session2, wordCount } from './no-agent-memory';

describe('no-agent-memory', () => {
  it('counts words by hand', () => {
    expect(wordCount("I'm vegetarian.")).toBe(2);
    expect(wordCount('Just a hob and a microwave.')).toBe(6);
    expect(FACTS.map((f) => wordCount(f.said))).toEqual([2, 4, 6, 5, 3]);
  });

  it('with no memory every fact is asked again', () => {
    const s = session2(0);
    expect(s.asked).toBe(5);
    expect(s.recalled).toBe(0);
    expect(s.wordsRetyped).toBe(20);
    expect(s.messagesBeforeStart).toBe(10);
    expect(s.rows.every((r) => !r.fromNotes)).toBe(true);
  });

  it('with a full notes store nothing is asked again', () => {
    const s = session2(5);
    expect(s.asked).toBe(0);
    expect(s.recalled).toBe(5);
    expect(s.wordsRetyped).toBe(0);
    expect(s.messagesBeforeStart).toBe(0);
  });

  it('a partial store only recalls the facts it saved (the first ones said)', () => {
    const s = session2(3);
    expect(s.rows.map((r) => r.fromNotes)).toEqual([true, true, true, false, false]);
    expect(s.asked).toBe(2);
    expect(s.wordsRetyped).toBe(5 + 3);
    expect(notesFile(3)).toEqual(['diet: vegetarian', 'allergy: peanuts', 'kitchen: hob + microwave']);
  });

  it('more notes never means more repeated questions, and the numbers always add up', () => {
    let prev = Infinity;
    for (let k = 0; k <= 5; k++) {
      const s = session2(k);
      expect(s.asked + s.recalled).toBe(FACTS.length);
      expect(s.asked).toBeLessThanOrEqual(prev);
      prev = s.asked;
    }
  });

  it('clamps out-of-range inputs', () => {
    expect(session2(-3).asked).toBe(5);
    expect(session2(99).asked).toBe(0);
    expect(notesFile(99)).toHaveLength(5);
  });
});
