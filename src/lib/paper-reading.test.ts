import { describe, expect, it } from 'vitest';
import {
  CAVEAT_REPLY,
  FRAGMENTS,
  MISSING_FROM_ABSTRACT,
  QUESTIONS,
  TABLE,
  TAGS,
  clearlyAhead,
  gap,
  isAccepted,
  rowById,
  scoreAnswers,
} from './paper-reading';

describe('abstract fragments', () => {
  it('are short quotes, in total well under the full abstract', () => {
    const words = FRAGMENTS.reduce((s, f) => s + f.text.split(/\s+/).length, 0);
    expect(FRAGMENTS.length).toBe(7);
    expect(words).toBeLessThan(110);
    for (const f of FRAGMENTS) expect(f.text.split(/\s+/).length).toBeLessThan(25);
  });
  it('have unique ids, valid tags and feedback', () => {
    expect(new Set(FRAGMENTS.map((f) => f.id)).size).toBe(FRAGMENTS.length);
    for (const f of FRAGMENTS) {
      expect(f.accept.length).toBeGreaterThan(0);
      for (const t of f.accept) expect(TAGS).toContain(t);
      expect(f.feedback.length).toBeGreaterThan(40);
    }
  });
  it('never accept "caveat", because the abstract has none', () => {
    for (const f of FRAGMENTS) expect(f.accept).not.toContain('caveat');
    expect(CAVEAT_REPLY).toMatch(/none of the fragments/);
  });
  it('accepts the main tag and any listed alternative only', () => {
    const bleu = FRAGMENTS.find((f) => f.id === 'bleu')!;
    expect(isAccepted(bleu, 'result')).toBe(true);
    expect(isAccepted(bleu, 'data')).toBe(true);
    expect(isAccepted(bleu, 'method')).toBe(false);
  });
});

describe('scoreAnswers', () => {
  it('counts answered and correct', () => {
    expect(scoreAnswers({})).toEqual({ answered: 0, correct: 0, total: 7 });
    const all = Object.fromEntries(FRAGMENTS.map((f) => [f.id, f.accept[0]]));
    expect(scoreAnswers(all)).toEqual({ answered: 7, correct: 7, total: 7 });
    expect(scoreAnswers({ ...all, propose: 'claim', tasks: 'caveat' })).toEqual({ answered: 7, correct: 5, total: 7 });
  });
});

describe('results-table drill', () => {
  it('matches the hand-computed gaps', () => {
    const base = rowById('base');
    expect(gap(rowById('s'), base)).toBe(0.8);
    expect(gap(rowById('l'), base)).toBe(2.2);
    expect(gap(rowById('lt'), rowById('l'))).toBe(0.4);
  });
  it('applies the rule of thumb: gap must exceed the two spreads added', () => {
    const base = rowById('base');
    // S: 0.8 vs 0.9 + 0.3 = 1.2 -> no.  L: 2.2 vs 0.2 + 0.3 = 0.5 -> yes.
    expect(clearlyAhead(rowById('s'), base)).toBe(false);
    expect(clearlyAhead(rowById('l'), base)).toBe(true);
    // a single run has no spread, so it can never be called clearly ahead
    expect(clearlyAhead(rowById('lt'), rowById('l'))).toBe(false);
    expect(clearlyAhead(rowById('l'), rowById('lt'))).toBe(false);
  });
  it('has only one single-run row and it is the one the questions are about', () => {
    expect(TABLE.filter((r) => r.runs === 1).map((r) => r.id)).toEqual(['lt']);
    expect(TABLE.filter((r) => r.std === undefined).map((r) => r.id)).toEqual(['lt']);
  });
  it('has well-formed questions with varied answer positions', () => {
    expect(QUESTIONS).toHaveLength(4);
    for (const q of QUESTIONS) {
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(q.options.length);
      expect(q.why.length).toBeGreaterThan(60);
    }
    expect(new Set(QUESTIONS.map((q) => q.answer)).size).toBeGreaterThanOrEqual(3);
  });
  it('first question answer agrees with the rule of thumb', () => {
    const q = QUESTIONS[0];
    const base = rowById('base');
    const winners = ['s', 'l'].filter((id) => clearlyAhead(rowById(id), base));
    expect(winners).toEqual(['l']);
    expect(q.options[q.answer]).toBe('NewNet-L only');
  });
});

describe('what the abstract leaves out', () => {
  it('lists five checked points', () => {
    expect(MISSING_FROM_ABSTRACT).toHaveLength(5);
    expect(MISSING_FROM_ABSTRACT.join(' ')).not.toMatch(/!/);
  });
});
