import { describe, expect, it } from 'vitest';
import { CARDS, isRight, score, type Guess } from './myth-fact';

describe('myth-fact cards', () => {
  it('has eight cards, four myths and four facts, with unique ids', () => {
    expect(CARDS).toHaveLength(8);
    expect(CARDS.filter((c) => c.answer === 'myth')).toHaveLength(4);
    expect(CARDS.filter((c) => c.answer === 'fact')).toHaveLength(4);
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(8);
  });

  it('gives every card feedback and one https source', () => {
    for (const c of CARDS) {
      expect(c.explain.length).toBeGreaterThan(60);
      expect(c.source.label.length).toBeGreaterThan(5);
      expect(c.source.url).toMatch(/^https:\/\//);
    }
  });
});

describe('score', () => {
  it('counts only answered cards', () => {
    expect(score({})).toEqual({ answered: 0, right: 0 });
  });
  it('counts right answers', () => {
    const all: Record<string, Guess> = Object.fromEntries(CARDS.map((c) => [c.id, c.answer]));
    expect(score(all)).toEqual({ answered: 8, right: 8 });
    const wrong: Record<string, Guess> = Object.fromEntries(CARDS.map((c) => [c.id, c.answer === 'myth' ? 'fact' : 'myth']));
    expect(score(wrong)).toEqual({ answered: 8, right: 0 });
    expect(isRight(CARDS[0], 'myth')).toBe(true);
  });
});
