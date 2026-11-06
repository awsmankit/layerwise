import { describe, expect, it } from 'vitest';
import {
  MULTIPLY,
  STALE,
  TODAY,
  dateMissDays,
  daysBetween,
  exactProduct,
  guessedProduct,
  isCorrect,
  longDate,
  productMiss,
  questions,
  score,
  script,
  weekday,
} from './no-tool-use';

describe('no-tool-use', () => {
  it('gets weekdays and day counts right', () => {
    expect(weekday(TODAY)).toBe('Friday');
    expect(weekday(STALE)).toBe('Friday');
    expect(longDate(TODAY)).toBe('Friday 6 November 2026');
    expect(daysBetween(TODAY, { y: 2026, m: 12, d: 24 })).toBe(48);
    expect(daysBetween(TODAY, TODAY)).toBe(0);
    expect(daysBetween({ y: 2026, m: 1, d: 1 }, { y: 2025, m: 12, d: 31 })).toBe(-1);
    // 14 Mar 2025 to 6 Nov 2026: 365 - 73 = 292 days left in 2025 after 14 Mar, plus 310 days to 6 Nov 2026 = 602
    expect(dateMissDays()).toBe(602);
  });

  it('multiplies by hand: 4817 x 3926 = 18,911,542', () => {
    expect(exactProduct(MULTIPLY.a, MULTIPLY.b)).toBe(18_911_542);
  });

  it('the stand-in guess keeps the leading digits but gets the end wrong', () => {
    const g = guessedProduct(MULTIPLY.a, MULTIPLY.b);
    expect(g).toBe(18_911_859);
    expect(g).not.toBe(18_911_542);
    expect(Math.floor(g / 1000)).toBe(18_911);
    expect(productMiss()).toBe(317);
    // wrong for any inputs, never accidentally right
    for (const [a, b] of [[12, 34], [999, 999], [1000, 1000], [7, 7]]) {
      expect(guessedProduct(a, b)).not.toBe(a * b);
    }
  });

  it('without tools all three are wrong, with tools all three are right', () => {
    expect(score(false)).toBe(0);
    expect(score(true)).toBe(3);
    for (const q of questions) {
      expect(isCorrect(q, false)).toBe(false);
      expect(isCorrect(q, true)).toBe(true);
    }
  });

  it('the scripts have 2 turns without a tool and 4 with one, and the tool result is the truth', () => {
    for (const q of questions) {
      expect(script(q, false)).toHaveLength(2);
      const s = script(q, true);
      expect(s).toHaveLength(4);
      expect(s.map((t) => t.who)).toEqual(['you', 'model', 'tool', 'model']);
    }
    expect(script(questions[1], true)[2].text).toBe('18911542');
    expect(questions[1].withAnswer).toContain('18,911,542');
  });

  it('writes no dashes in the visible text', () => {
    for (const q of questions) {
      for (const t of [...script(q, false), ...script(q, true)]) expect(t.text).not.toMatch(/[—–]/);
    }
  });
});
