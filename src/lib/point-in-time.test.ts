import { describe, expect, it } from 'vitest';
import { CUSTOMERS, asOf, join, latest, ruleAccuracy } from './point-in-time';

const series = [{ day: 10, value: 1 }, { day: 40, value: 2 }, { day: 70, value: 3 }];

describe('point-in-time', () => {
  it('asOf returns the newest value on or before the day', () => {
    expect(asOf(series, 5)).toBeNull();
    expect(asOf(series, 10)).toEqual({ day: 10, value: 1 });
    expect(asOf(series, 39)).toEqual({ day: 10, value: 1 });
    expect(asOf(series, 40)).toEqual({ day: 40, value: 2 });
    expect(asOf(series, 500)).toEqual({ day: 70, value: 3 });
  });

  it('asOf applies the time-to-live from the event, not from today', () => {
    expect(asOf(series, 45, 5)).toEqual({ day: 40, value: 2 });
    expect(asOf(series, 46, 5)).toBeNull();
    expect(asOf(series, 46, 6)).toEqual({ day: 40, value: 2 });
  });

  it('latest ignores the event date', () => {
    expect(latest(series)).toEqual({ day: 70, value: 3 });
    expect(latest([])).toBeNull();
  });

  it('the latest-value join puts every event on a value from its own future', () => {
    const rows = join(CUSTOMERS, 'latest');
    expect(rows).toHaveLength(7);
    expect(rows.every((r) => r.fromFuture)).toBe(true);
  });

  it('the as-of join never uses the future', () => {
    const rows = join(CUSTOMERS, 'asof');
    expect(rows.some((r) => r.fromFuture)).toBe(false);
    expect(rows.every((r) => r.age !== null && r.age >= 0)).toBe(true);
  });

  it('the leak inflates a simple rule: 7 of 7 against 5 of 7', () => {
    const leaky = ruleAccuracy(join(CUSTOMERS, 'latest'));
    const honest = ruleAccuracy(join(CUSTOMERS, 'asof'));
    expect(leaky).toEqual({ correct: 7, total: 7, caught: 3, defaults: 3 });
    expect(honest).toEqual({ correct: 5, total: 7, caught: 1, defaults: 3 });
  });

  it('a short time-to-live turns old values into "no value"', () => {
    const rows = join(CUSTOMERS, 'asof', 10);
    expect(rows.filter((r) => r.used === null).length).toBeGreaterThan(0);
    const wide = join(CUSTOMERS, 'asof', 60);
    expect(wide.filter((r) => r.used === null)).toHaveLength(0);
  });
});
