import { describe, expect, it } from 'vitest';
import { monthYear, shortDay } from './dates';

describe('dates', () => {
  it('uses three-letter months in every engine', () => {
    expect(monthYear('2025-09-01')).toBe('Sep 2025');
    expect(shortDay('2025-09-14')).toBe('14 Sep 2025');
  });
  it('reads timestamps in UTC', () => {
    expect(shortDay('2026-01-31T23:30:00Z')).toBe('31 Jan 2026');
    expect(shortDay('2026-02-01T00:30:00+02:00')).toBe('31 Jan 2026');
  });
});
