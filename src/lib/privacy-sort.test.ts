import { describe, expect, it } from 'vitest';
import { judge, MESSAGES, tally, VERDICT_LABEL } from './privacy-sort';

describe('privacy sort', () => {
  it('has between 8 and 10 unique messages with valid answers', () => {
    expect(MESSAGES.length).toBeGreaterThanOrEqual(8);
    expect(MESSAGES.length).toBeLessThanOrEqual(10);
    expect(new Set(MESSAGES.map((m) => m.id)).size).toBe(MESSAGES.length);
    for (const m of MESSAGES) expect(Object.keys(VERDICT_LABEL)).toContain(m.answer);
  });

  it('uses every verdict at least once', () => {
    const used = new Set(MESSAGES.map((m) => m.answer));
    expect(used.size).toBe(3);
  });

  it('house style: no exclamation marks, every reason is a real sentence', () => {
    for (const m of MESSAGES) {
      expect(m.text + m.why).not.toMatch(/!/);
      expect(m.why.length).toBeGreaterThan(30);
    }
  });

  it('judges a pick and never calls a miss a failure', () => {
    const address = MESSAGES.find((m) => m.id === 'address')!;
    expect(judge(address, 'keep').correct).toBe(true);
    const miss = judge(address, 'share');
    expect(miss.correct).toBe(false);
    expect(miss.right).toBe('keep');
    expect(miss.opening.toLowerCase()).not.toMatch(/wrong|fail/);
  });

  it('tallies only answered cards', () => {
    expect(tally({})).toEqual({ answered: 0, correct: 0 });
    expect(tally({ volcano: 'share', address: 'share' })).toEqual({ answered: 2, correct: 1 });
  });
});
