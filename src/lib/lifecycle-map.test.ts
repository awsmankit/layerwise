import { describe, expect, it } from 'vitest';
import { FAILURES, STAGES, failureById, judge, stageLabel, tally } from './lifecycle-map';

describe('lifecycle map data', () => {
  it('has seven failures with unique ids', () => {
    expect(FAILURES).toHaveLength(7);
    expect(new Set(FAILURES.map((f) => f.id)).size).toBe(7);
  });

  it('only refers to real stages', () => {
    const ids = new Set(STAGES.map((s) => s.id));
    for (const f of FAILURES) {
      expect(ids.has(f.stage)).toBe(true);
      expect(ids.has(f.noticedAt)).toBe(true);
      for (const a of f.alsoDefensible ?? []) {
        expect(ids.has(a)).toBe(true);
        expect(a).not.toBe(f.stage);
      }
    }
  });

  it('covers every stage at least once', () => {
    const used = new Set(FAILURES.map((f) => f.stage));
    for (const s of STAGES) expect(used.has(s.id)).toBe(true);
  });

  it('gives each failure a control and a story', () => {
    for (const f of FAILURES) {
      expect(f.control.length).toBeGreaterThan(30);
      expect(f.story.length).toBeGreaterThan(60);
    }
  });
});

describe('judge and tally', () => {
  it('marks the home stage correct and a listed alternative close', () => {
    expect(judge('skew', 'features')).toBe('correct');
    expect(judge('skew', 'release')).toBe('close');
    expect(judge('skew', 'data')).toBe('wrong');
  });

  it('treats an unknown failure as wrong', () => {
    expect(judge('nope', 'data')).toBe('wrong');
  });

  it('tallies placements', () => {
    const t = tally({ skew: 'features', 'no-record': 'data', 'no-rollback': 'training' });
    expect(t).toEqual({ placed: 3, correct: 1, close: 1, wrong: 1 });
  });

  it('looks things up', () => {
    expect(failureById('silent-drift')?.stage).toBe('monitoring');
    expect(stageLabel('validation')).toBe('Validation');
  });
});
