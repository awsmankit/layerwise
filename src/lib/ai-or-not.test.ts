import { describe, expect, it } from 'vitest';
import { isCorrect, KIND_LABEL, score, thingById, THINGS } from './ai-or-not';

describe('AI or not sorter', () => {
  it('has 12 things, both kinds well represented, unique ids', () => {
    expect(THINGS.length).toBe(12);
    expect(new Set(THINGS.map((t) => t.id)).size).toBe(12);
    expect(THINGS.filter((t) => t.usually === 'ai').length).toBeGreaterThanOrEqual(4);
    expect(THINGS.filter((t) => t.usually === 'rules').length).toBeGreaterThanOrEqual(4);
  });

  it('explains every answer, names the data, and avoids exclamation marks', () => {
    for (const t of THINGS) {
      expect(t.why.length, t.id).toBeGreaterThan(40);
      expect(t.data.length, t.id).toBeGreaterThan(10);
      expect(t.name + t.why + t.data, t.id).not.toMatch(/!/);
    }
    expect(Object.values(KIND_LABEL).every((l) => l.startsWith('Usually'))).toBe(true);
  });

  it('says when the product matters, for things that differ between products', () => {
    for (const id of ['thermostat', 'washer', 'game']) expect(thingById(id).why).toMatch(/depends|check what/);
  });

  it('keeps the plain-rules robot arm a robot but not AI', () => {
    const arm = thingById('arm');
    expect(arm.usually).toBe('rules');
    expect(arm.why).toMatch(/robot/);
  });

  it('scores only the answered things', () => {
    expect(score({})).toEqual({ answered: 0, correct: 0 });
    expect(score({ face: 'ai', arm: 'ai', spam: 'ai' })).toEqual({ answered: 3, correct: 2 });
    expect(isCorrect(thingById('thermostat'), 'rules')).toBe(true);
    expect(isCorrect(thingById('thermostat'), 'ai')).toBe(false);
  });
});
