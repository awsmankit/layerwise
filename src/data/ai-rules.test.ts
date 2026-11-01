import { describe, expect, it } from 'vitest';
import { CHECKED, euFineCeiling, FACETS, filterJurisdictions, isStale, JURISDICTIONS, oldestChecked, TAGS, type Cell } from './ai-rules';

const allCells = JURISDICTIONS.flatMap((j) => FACETS.map((f) => ({ j, f, c: j.cells[f.id] }))).filter((x): x is { j: (typeof JURISDICTIONS)[number]; f: (typeof FACETS)[number]; c: Cell } => x.c !== null);

describe('AI rules data', () => {
  it('every filled cell has at least one source with an https URL, a label and a checked date', () => {
    expect(allCells.length).toBeGreaterThan(30);
    for (const { j, f, c } of allCells) {
      const where = `${j.id}/${f.id}`;
      expect(c.sources.length, where).toBeGreaterThan(0);
      for (const s of c.sources) {
        expect(() => new URL(s.url), where).not.toThrow();
        expect(new URL(s.url).protocol, where).toBe('https:');
        expect(s.label.length, where).toBeGreaterThan(10);
        expect(s.checked, where).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(Number.isNaN(new Date(`${s.checked}T00:00:00Z`).getTime()), where).toBe(false);
      }
    }
  });

  it('every cell has text of a readable length', () => {
    for (const { j, f, c } of allCells) {
      expect(c.text.length, `${j.id}/${f.id}`).toBeGreaterThan(40);
      expect(c.text.length, `${j.id}/${f.id}`).toBeLessThan(900);
    }
  });

  it('every jurisdiction has an instrument-and-dates cell, valid tags and a unique id', () => {
    const ids = JURISDICTIONS.map((j) => j.id);
    expect(new Set(ids).size).toBe(ids.length);
    const tagIds = new Set(TAGS.map((t) => t.id));
    for (const j of JURISDICTIONS) {
      expect(j.cells.status, j.id).not.toBeNull();
      expect(j.tags.length, j.id).toBeGreaterThan(0);
      for (const t of j.tags) expect(tagIds.has(t), `${j.id} ${t}`).toBe(true);
    }
  });

  it('government and primary hosts only: no news or law-firm domains', () => {
    const banned = /(hunton|dentons|wiley|lexology|medianama|wikipedia|blog|firm|llp)/i;
    for (const { j, f, c } of allCells) for (const s of c.sources) expect(banned.test(new URL(s.url).hostname), `${j.id}/${f.id} ${s.url}`).toBe(false);
  });

  it('the checked date is the date of this edit', () => {
    for (const { c } of allCells) expect(oldestChecked(c) <= CHECKED).toBe(true);
  });

  it('flags entries older than six months as stale', () => {
    expect(isStale('2026-11-01', new Date('2026-11-02T00:00:00Z'))).toBe(false);
    expect(isStale('2026-11-01', new Date('2027-05-02T00:00:00Z'))).toBe(false);
    expect(isStale('2026-11-01', new Date('2027-06-01T00:00:00Z'))).toBe(true);
    expect(isStale('not a date', new Date())).toBe(true);
  });

  it('filters by tag, and shows everything when no tag is chosen', () => {
    expect(filterJurisdictions(JURISDICTIONS, [])).toHaveLength(JURISDICTIONS.length);
    const lab = filterJurisdictions(JURISDICTIONS, ['content-labelling']).map((j) => j.id);
    expect(lab).toEqual(expect.arrayContaining(['eu', 'india', 'china', 'korea']));
    expect(lab).not.toContain('japan');
    const both = filterJurisdictions(JURISDICTIONS, ['promotion', 'filing']).map((j) => j.id).sort();
    expect(both).toEqual(['china', 'japan', 'korea']);
  });
});

describe('EU fine ceiling (Article 99)', () => {
  it('uses the higher of the fixed amount and the turnover share', () => {
    // EUR 1 billion turnover: 3% is 30 million, above the 15 million fixed amount.
    expect(euFineCeiling('operator', 1_000_000_000, false)).toBe(30_000_000);
    // EUR 100 million turnover: 3% is 3 million, so the 15 million fixed amount is higher.
    expect(euFineCeiling('operator', 100_000_000, false)).toBe(15_000_000);
    expect(euFineCeiling('prohibited', 1_000_000_000, false)).toBe(70_000_000);
    expect(euFineCeiling('information', 100_000_000, false)).toBe(7_500_000);
  });

  it('uses the lower of the two for an SME', () => {
    expect(euFineCeiling('operator', 10_000_000, true)).toBe(300_000);
    expect(euFineCeiling('operator', 1_000_000_000, true)).toBe(15_000_000);
    expect(euFineCeiling('prohibited', 50_000_000, true)).toBe(3_500_000);
  });

  it('never goes below zero', () => {
    expect(euFineCeiling('operator', -5, false)).toBe(15_000_000);
    expect(euFineCeiling('operator', -5, true)).toBe(0);
  });
});
