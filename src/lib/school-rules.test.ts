import { describe, expect, it } from 'vitest';
import { isCorrect, RULES, ruleDependent, SCENARIOS, score, verdictFor } from './school-rules';

describe('school rules sorter', () => {
  it('has 8 scenarios, each answered under every rule', () => {
    expect(SCENARIOS.length).toBe(8);
    for (const s of SCENARIOS) {
      for (const r of RULES) {
        const v = verdictFor(s, r.id);
        expect(['ok', 'ask', 'not']).toContain(v.verdict);
        expect(v.why.length).toBeGreaterThan(20);
        expect(v.why).not.toMatch(/!/);
      }
    }
  });

  it('most scenarios depend on the rule, so the learner has to check', () => {
    expect(ruleDependent().length).toBeGreaterThanOrEqual(6);
  });

  it('handing in AI work as your own is never okay', () => {
    const whole = SCENARIOS.find((s) => s.id === 'whole')!;
    for (const r of RULES) expect(verdictFor(whole, r.id).verdict).toBe('not');
  });

  it('when the teacher has not said, nothing risky is simply okay', () => {
    for (const s of SCENARIOS) expect(verdictFor(s, 'unsaid').verdict).not.toBe('ok');
  });

  it('the same pick is right under one rule and wrong under another', () => {
    const spelling = SCENARIOS.find((s) => s.id === 'spelling')!;
    expect(isCorrect(spelling, 'buddy', 'ok')).toBe(true);
    expect(isCorrect(spelling, 'none', 'ok')).toBe(false);
  });

  it('scores against the current rule', () => {
    const picks = { spelling: 'ok' as const, whole: 'not' as const };
    expect(score(picks, 'buddy')).toEqual({ answered: 2, correct: 2 });
    expect(score(picks, 'none')).toEqual({ answered: 2, correct: 1 });
  });
});
