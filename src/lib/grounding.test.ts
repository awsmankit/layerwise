import { describe, expect, it } from 'vitest';
import { SETUPS, claimKey, expectedAnswerScore, scoreSetup, type Marks } from './grounding';

const refMarks = (id: string): Marks => {
  const s = SETUPS.find((x) => x.id === id)!;
  return Object.fromEntries(s.claims.map((c, i) => [claimKey(s.id, i), c.supported ? 'supported' : 'unsupported']));
};

describe('the four setups', () => {
  it('are in the order none, with-answer, without-answer, abstain', () => {
    expect(SETUPS.map((s) => s.id)).toEqual(['none', 'with-answer', 'without-answer', 'abstain']);
  });
  it('give the reference faithfulness 1/5, 4/5, 1/4 and 3/3', () => {
    const ref = SETUPS.map((s) => scoreSetup(s, {}).reference);
    expect(ref[0]).toBeCloseTo(0.2, 12);
    expect(ref[1]).toBeCloseTo(0.8, 12);
    expect(ref[2]).toBeCloseTo(0.25, 12);
    expect(ref[3]).toBeCloseTo(1, 12);
  });
  it('has the answer-bearing context only in B, and no context in A', () => {
    expect(SETUPS[0].context).toBeNull();
    expect(SETUPS[1].context).toMatch(/30 days/);
    expect(SETUPS[2].context).not.toMatch(/30 days/);
    expect(SETUPS[3].context).toBe(SETUPS[2].context);
  });
  it('shows faithful-but-not-true and true-but-not-faithful claims in C', () => {
    const c = SETUPS[2].claims;
    expect(c.some((x) => !x.supported && x.world === 'true')).toBe(true);
  });
  it('only D declines', () => {
    expect(SETUPS.filter((s) => s.answered === 'declined').map((s) => s.id)).toEqual(['abstain']);
  });
});

describe('scoreSetup', () => {
  it('is NaN with nothing marked', () => {
    expect(Number.isNaN(scoreSetup(SETUPS[1], {}).faithfulness)).toBe(true);
  });
  it('equals the reference when the learner marks like the reference', () => {
    for (const s of SETUPS) {
      const r = scoreSetup(s, refMarks(s.id));
      expect(r.faithfulness).toBeCloseTo(r.reference, 12);
      expect(r.agree).toBe(r.total);
    }
  });
  it('counts a partial marking over the claims marked so far', () => {
    const s = SETUPS[1];
    const r = scoreSetup(s, { [claimKey('with-answer', 0)]: 'supported', [claimKey('with-answer', 4)]: 'unsupported' });
    expect(r.marked).toBe(2);
    expect(r.faithfulness).toBeCloseTo(0.5, 12);
    expect(r.agree).toBe(2);
  });
  it('counts disagreement with the reference', () => {
    const s = SETUPS[1];
    const r = scoreSetup(s, { [claimKey('with-answer', 4)]: 'supported' });
    expect(r.agree).toBe(0);
  });
  it('counts claims that are true or false in the real policy', () => {
    expect(scoreSetup(SETUPS[0], {}).falseInWorld).toBe(4);
    expect(scoreSetup(SETUPS[0], {}).trueInWorld).toBe(1);
    expect(scoreSetup(SETUPS[3], {}).trueInWorld).toBe(3);
  });
});

describe('expectedAnswerScore', () => {
  /* t = 0.75: a wrong answer costs 0.75 / 0.25 = 3 points. At p = 0.75: 0.75 - 0.25 * 3 = 0. */
  it('is zero at p = t, so answering pays only above t', () => {
    expect(expectedAnswerScore(0.75, 0.75)).toBeCloseTo(0, 12);
    expect(expectedAnswerScore(0.9, 0.75)).toBeGreaterThan(0);
    expect(expectedAnswerScore(0.6, 0.75)).toBeLessThan(0);
  });
  it('hand-checks p = 0.6, t = 0.75: 0.6 - 0.4 * 3 = -0.6', () => {
    expect(expectedAnswerScore(0.6, 0.75)).toBeCloseTo(-0.6, 12);
  });
  it('is plain accuracy when t = 0 (no penalty)', () => {
    expect(expectedAnswerScore(0.3, 0)).toBeCloseTo(0.3, 12);
  });
});
