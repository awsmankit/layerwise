import { describe, expect, it } from 'vitest';
import { LINES, exposure, falseAlarms, itemRanges, matches, scenarios, segments, tally } from './no-pii-filter';

describe('no PII filter what-if', () => {
  it('has twelve lines and only obviously fake data', () => {
    expect(LINES).toHaveLength(12);
    const all = LINES.map((l) => l.text).join('\n');
    for (const e of all.match(/[A-Za-z0-9._-]+@[A-Za-z0-9.-]+/g) ?? []) expect(e).toMatch(/@example\.com\.?$/);
    for (const p of all.match(/\b555[-. ]\d{4}\b/g) ?? []) expect(p).toMatch(/^555[-. ]01\d\d$/);
    // every listed item really is a substring of its line
    for (const l of LINES) for (const it of l.items) expect(l.text.includes(it.text)).toBe(true);
  });
  it('the filter catches 9 of 17 personal items by hand count', () => {
    // emails 4 (lines 1, 4, 8, 11), phones 3 (lines 2, 4, 9), IDs 2 (lines 3, 8) = 9. Missed: 4 names, 1 spelled email,
    // 1 phone in words, 1 ID with a space, 1 address = 8.
    const t = tally();
    expect(t.items).toBe(17);
    expect(t.caught).toBe(9);
    expect(t.missed).toBe(8);
    expect(t.byKind.name).toEqual({ total: 4, caught: 0 });
    expect(t.byKind.email).toEqual({ total: 5, caught: 4 });
    expect(t.byKind.phone).toEqual({ total: 4, caught: 3 });
    expect(t.byKind.id).toEqual({ total: 3, caught: 2 });
    expect(t.byKind.address).toEqual({ total: 1, caught: 0 });
  });
  it('lines with a leftover item are counted, and one harmless part number is hidden by mistake', () => {
    const t = tally();
    expect(t.dirtyLines).toBe(7);
    expect(t.falseAlarms).toBe(1);
    expect(falseAlarms(LINES[11])).toHaveLength(1);
    expect(itemRanges(LINES[0]).map((r) => r.caught)).toEqual([false, true]);
  });
  it('matches are sorted and never empty', () => {
    const m = matches(LINES[3].text);
    expect(m.map((x) => x.tag)).toEqual(['[PHONE]', '[EMAIL]']);
    for (const x of m) expect(x.end).toBeGreaterThan(x.start);
  });
  it('segments rebuild the original text when the filter is off', () => {
    for (const l of LINES) expect(segments(l, false).map((s) => s.text).join('')).toBe(l.text);
  });
  it('with the filter on, caught items become tags and missed ones stay visible', () => {
    const segs = segments(LINES[0], true);
    expect(segs.filter((s) => s.type === 'caught')).toHaveLength(1);
    expect(segs.filter((s) => s.type === 'missed').map((s) => s.text)).toEqual(['Alex Testuser']);
    expect(segments(LINES[11], true).some((s) => s.type === 'false')).toBe(true);
  });
  it('exposure multiplies items, days and readers and shrinks with every lever', () => {
    expect(exposure(8, 365, 3)).toBe(8760);
    expect(exposure(8, 30, 3)).toBeLessThan(exposure(8, 365, 3));
    expect(exposure(8, 365, 1)).toBeLessThan(exposure(8, 365, 3));
    const s = scenarios(365, 3);
    expect(s.map((x) => x.score)).toEqual([17 * 365 * 3, 8 * 365 * 3, 8 * 30 * 1]);
    expect(s[0].score).toBeGreaterThan(s[1].score);
    expect(s[1].score).toBeGreaterThan(s[2].score);
  });
  it('never raises the retention in the third scenario', () => {
    expect(scenarios(7, 1)[2].days).toBe(7);
  });
});
