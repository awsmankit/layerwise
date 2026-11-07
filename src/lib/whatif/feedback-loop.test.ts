import { describe, expect, it } from 'vitest';
import { CHECKS, RATES, ROUNDS, START, drift, lockInRound, realTop, simulate, truthShare } from './feedback-loop';

describe('feedback loop what-if', () => {
  it('reality has Area 2 on top, with shares 4/12, 5/12, 3/12', () => {
    expect(realTop()).toBe(1);
    const t = truthShare();
    expect(t[0]).toBeCloseTo(0.3333, 3);
    expect(t[1]).toBeCloseTo(0.4167, 3);
    expect(t[2]).toBeCloseTo(0.25, 3);
  });
  it('starts from the head start: belief 12 of 32 records in Area 1', () => {
    const r = simulate(0)[0];
    expect(r.counts).toEqual([...START]);
    expect(r.belief[0]).toBeCloseTo(12 / 32, 3);
  });
  it('with no exploration, all checks go to Area 1 and the belief locks onto it', () => {
    const rounds = simulate(0);
    expect(rounds).toHaveLength(ROUNDS + 1);
    const last = rounds[ROUNDS];
    // Area 1 records 12 + 30 rounds * 60 checks * 0.2 = 372. The others never get a check and stay at 10.
    expect(last.counts[0]).toBeCloseTo(372, 6);
    expect(last.counts[1]).toBe(10);
    expect(last.belief[0]).toBeCloseTo(372 / 392, 3);
    expect(last.top).toBe(0);
    expect(last.attention[0]).toBeCloseTo(1, 6);
    // total variation = belief in Area 1 minus its true share = 0.9490 - 0.3333
    expect(drift(last.belief)).toBeCloseTo(0.6157, 3);
    expect(lockInRound(rounds, 0.9)).toBe(14);
  });
  it('with only independent sampling, belief matches reality closely and finds the real top area', () => {
    const last = simulate(100)[ROUNDS];
    // counts: 12 + 600*0.2/ ... each area gets 20 checks per round
    expect(last.counts[0]).toBeCloseTo(12 + 30 * 20 * 0.2, 6);
    expect(last.counts[1]).toBeCloseTo(10 + 30 * 20 * 0.25, 6);
    expect(last.counts[2]).toBeCloseTo(10 + 30 * 20 * 0.15, 6);
    expect(drift(last.belief)).toBeLessThan(0.02);
    expect(last.top).toBe(realTop());
    expect(lockInRound(simulate(100))).toBeNull();
  });
  it('more exploration means less drift, step by step', () => {
    let prev = Infinity;
    for (const e of [0, 10, 20, 30, 50, 70, 100]) {
      const d = drift(simulate(e)[ROUNDS].belief);
      expect(d).toBeLessThan(prev);
      prev = d;
    }
  });
  it('drift grows round by round when there is no exploration', () => {
    const r = simulate(0);
    for (let i = 1; i <= ROUNDS; i++) expect(drift(r[i].belief)).toBeGreaterThanOrEqual(drift(r[i - 1].belief));
  });
  it('attention shares add up to 1 and checks per round are CHECKS', () => {
    const r = simulate(30)[10];
    expect(r.attention.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 3);
    expect(CHECKS).toBe(60);
    expect(RATES).toHaveLength(3);
  });
  it('is deterministic', () => {
    expect(simulate(30)).toEqual(simulate(30));
  });
});
