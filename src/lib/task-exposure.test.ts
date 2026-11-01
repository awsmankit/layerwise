import { describe, expect, it } from 'vitest';
import { JOBS, PRESETS, RATINGS, jobById, round1, startingRatings, summarise, totalHours, type Ratings } from './task-exposure';

const rec = jobById('receptionist');
const acc = jobById('accountant');

describe('jobs', () => {
  it('have 10 tasks and a 40-hour week each', () => {
    for (const j of JOBS) {
      expect(j.tasks).toHaveLength(10);
      expect(totalHours(j)).toBe(40);
      expect(new Set(j.tasks.map((t) => t.id)).size).toBe(10);
      for (const t of j.tasks) {
        expect(t.hours).toBeGreaterThan(0);
        expect(RATINGS).toContain(t.start);
        expect(t.note.length).toBeGreaterThan(30);
        expect(t.label + t.note).not.toMatch(/!/);
      }
    }
  });
  it('fall back to the first job for an unknown id', () => {
    expect(jobById('nope').id).toBe('receptionist');
  });
});

describe('summarise: hand-computed values', () => {
  it('starting view of the receptionist splits 9 / 17 / 14 hours', () => {
    const s = summarise(rec, startingRatings(rec), PRESETS.middle.a);
    expect(s.hours).toEqual({ automate: 9, assist: 17, human: 14, unrated: 0 });
    expect(s.rated).toBe(10);
  });
  it('middle assumptions: 9*(1-0.8*0.75) + 17*0.75 + 14 = 3.6 + 12.75 + 14 = 30.35', () => {
    const s = summarise(rec, startingRatings(rec), PRESETS.middle.a);
    expect(s.remaining).toBeCloseTo(30.35, 10);
    expect(s.freed).toBeCloseTo(9.65, 10);
    expect(s.freedShare).toBeCloseTo(0.24125, 10);
    expect(s.capacity).toBeCloseTo(40 / 30.35, 10);
    expect(round1(s.capacity * 100 - 100)).toBe(31.8);
  });
  it('cautious and ambitious receptionist: 35.6 and 25.505 hours left', () => {
    expect(summarise(rec, startingRatings(rec), PRESETS.cautious.a).remaining).toBeCloseTo(35.6, 10);
    expect(summarise(rec, startingRatings(rec), PRESETS.ambitious.a).remaining).toBeCloseTo(25.505, 10);
  });
  it('starting view of the accountant splits 20 / 15 / 5 hours', () => {
    const s = summarise(acc, startingRatings(acc), PRESETS.middle.a);
    expect(s.hours).toEqual({ automate: 20, assist: 15, human: 5, unrated: 0 });
    // 20*0.4 + 15*0.75 + 5 = 8 + 11.25 + 5
    expect(s.remaining).toBeCloseTo(24.25, 10);
    expect(s.freed).toBeCloseTo(15.75, 10);
  });
  it('cautious and ambitious accountant: 32.5 and 16.9 hours left', () => {
    expect(summarise(acc, startingRatings(acc), PRESETS.cautious.a).remaining).toBeCloseTo(32.5, 10);
    expect(summarise(acc, startingRatings(acc), PRESETS.ambitious.a).remaining).toBeCloseTo(16.9, 10);
  });
});

describe('summarise: limits and edge cases', () => {
  it('saves nothing when nothing is rated', () => {
    const s = summarise(rec, {}, PRESETS.ambitious.a);
    expect(s.remaining).toBe(40);
    expect(s.freed).toBe(0);
    expect(s.capacity).toBe(1);
    expect(s.hours.unrated).toBe(40);
    expect(s.rated).toBe(0);
  });
  it('saves nothing when every task is kept human, whatever the assumptions', () => {
    const r: Ratings = {};
    for (const t of rec.tasks) r[t.id] = 'human';
    expect(summarise(rec, r, PRESETS.ambitious.a).remaining).toBe(40);
  });
  it('even with every task given to AI, a job keeps the checking time: 40*(1-0.8*0.75) = 16', () => {
    const r: Ratings = {};
    for (const t of rec.tasks) r[t.id] = 'automate';
    expect(summarise(rec, r, PRESETS.middle.a).remaining).toBeCloseTo(16, 10);
  });
  it('treats unrated tasks as unchanged, so a partial sort never overstates the saving', () => {
    const r: Ratings = { calls: 'automate' }; // 8 hours rated, 32 unrated
    const s = summarise(rec, r, PRESETS.middle.a);
    expect(s.remaining).toBeCloseTo(32 + 8 * 0.4, 10);
    expect(s.hours.unrated).toBe(32);
  });
  it('more optimistic assumptions never leave more hours', () => {
    for (const j of JOBS) {
      const r = startingRatings(j);
      const c = summarise(j, r, PRESETS.cautious.a).remaining;
      const m = summarise(j, r, PRESETS.middle.a).remaining;
      const a = summarise(j, r, PRESETS.ambitious.a).remaining;
      expect(c).toBeGreaterThan(m);
      expect(m).toBeGreaterThan(a);
    }
  });
});
