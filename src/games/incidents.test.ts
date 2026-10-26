import { describe, expect, it } from 'vitest';
import { incidents, rating, scoreIncident } from './incidents';

describe('incident data integrity', () => {
  it('has ten incidents with unique ids across all three levels', () => {
    expect(incidents).toHaveLength(10);
    expect(new Set(incidents.map((i) => i.id)).size).toBe(incidents.length);
    expect(new Set(incidents.map((i) => i.level))).toEqual(new Set([1, 2, 3]));
  });

  for (const inc of incidents) {
    describe(inc.id, () => {
      it('has exactly one correct cause, and every wrong cause explains why it is wrong', () => {
        const correct = inc.causes.filter((c) => c.id === inc.cause);
        expect(correct).toHaveLength(1);
        expect(correct[0].ruledOut).toBe('');
        inc.causes
          .filter((c) => c.id !== inc.cause)
          .forEach((c) => expect(c.ruledOut.length, `${inc.id}/${c.id}`).toBeGreaterThan(20));
        expect(inc.causes).toHaveLength(4);
        expect(new Set(inc.causes.map((c) => c.id)).size).toBe(4);
      });

      it('has a best fix that exists, and explains every fix', () => {
        expect(inc.fixes.map((f) => f.id)).toContain(inc.fix);
        expect(new Set(inc.fixes.map((f) => f.id)).size).toBe(inc.fixes.length);
        inc.fixes.forEach((f) => expect(f.why.length).toBeGreaterThan(15));
      });

      it('has enough unique evidence', () => {
        expect(inc.evidence.length).toBeGreaterThanOrEqual(3);
        expect(new Set(inc.evidence.map((e) => e.id)).size).toBe(inc.evidence.length);
        inc.evidence.forEach((e) => expect(e.lines.length).toBeGreaterThan(0));
      });

      it('links to at least one lesson', () => {
        expect(inc.lessons.length).toBeGreaterThan(0);
      });

      it('explains itself', () => {
        expect(inc.explanation.length).toBeGreaterThan(80);
        expect(inc.report.length).toBeGreaterThan(40);
      });
    });
  }

  it('the correct answer is not always in the same position', () => {
    const positions = incidents.map((i) => i.causes.findIndex((c) => c.id === i.cause));
    expect(new Set(positions).size).toBeGreaterThan(1);
    const fixPositions = incidents.map((i) => i.fixes.findIndex((f) => f.id === i.fix));
    expect(new Set(fixPositions).size).toBeGreaterThan(0);
  });
});

describe('incident scoring', () => {
  it('rewards reading less and guessing less', () => {
    expect(scoreIncident(2, 0, 0)).toBeGreaterThan(scoreIncident(4, 0, 0));
    expect(scoreIncident(2, 0, 0)).toBeGreaterThan(scoreIncident(2, 1, 0));
    expect(scoreIncident(2, 0, 0)).toBeGreaterThan(scoreIncident(2, 0, 1));
  });

  it('never goes below a floor and never above 100', () => {
    expect(scoreIncident(0, 0, 0)).toBe(100);
    expect(scoreIncident(5, 3, 3)).toBe(10);
  });

  it('maps scores to ratings', () => {
    expect(rating(92)).toBe('Sharp');
    expect(rating(70)).toBe('Solid');
    expect(rating(40)).toBe('Keep practising');
  });
});
