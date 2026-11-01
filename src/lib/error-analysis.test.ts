import { describe, expect, it } from 'vitest';
import { FAILURES, FIXES, TRANSCRIPTS, compareToReference, countTags, failuresCounted, rankFixes, type FailureId, type Tags } from './error-analysis';

const reference = (): Tags => Object.fromEntries(TRANSCRIPTS.map((t) => [t.id, t.reference]));

describe('the scripted transcripts', () => {
  it('are twenty with unique ids and valid tags', () => {
    expect(TRANSCRIPTS).toHaveLength(20);
    expect(new Set(TRANSCRIPTS.map((t) => t.id)).size).toBe(20);
    const ids = FAILURES.map((f) => f.id);
    for (const t of TRANSCRIPTS) expect(ids).toContain(t.reference);
  });
  it('start with the customer and alternate', () => {
    for (const t of TRANSCRIPTS) {
      expect(t.lines[0].who).toBe('customer');
      t.lines.forEach((l, i) => expect(l.who).toBe(i % 2 === 0 ? 'customer' : 'bot'));
    }
  });
});

describe('countTags', () => {
  it('gives the reference counts: 5 made-up, 3 hand-offs, 2 each of the rest, 6 fine', () => {
    expect(countTags(reference())).toEqual({ 'made-up': 5, 'no-handoff': 3, 'lost-context': 2, 'date-maths': 2, tone: 2, fine: 6 });
  });
  it('ignores untagged transcripts', () => {
    expect(countTags({ 1: 'fine', 2: 'made-up' })).toEqual({ 'made-up': 1, 'no-handoff': 0, 'lost-context': 0, 'date-maths': 0, tone: 0, fine: 1 });
  });
});

describe('rankFixes', () => {
  it('puts the made-up fix first on the reference tags: 5 of 14 failures', () => {
    const counts = countTags(reference());
    expect(failuresCounted(counts)).toBe(14);
    const ranked = rankFixes(counts);
    expect(ranked[0].fix.id).toBe('policy');
    expect(ranked[0].removed).toBe(5);
    expect(ranked[0].share).toBeCloseTo(5 / 14, 12);
    expect(ranked[1].fix.id).toBe('handoff');
    expect(ranked[1].removed).toBe(3);
  });
  it('follows the learner: if they tag most as tone, the tone fix wins', () => {
    const counts = countTags({ 1: 'tone', 2: 'tone', 3: 'tone', 4: 'made-up', 5: 'fine' });
    expect(rankFixes(counts)[0].fix.id).toBe('tone');
  });
  it('breaks ties by smaller effort', () => {
    const counts = countTags({ 1: 'lost-context', 2: 'no-handoff' });
    const ranked = rankFixes(counts);
    expect(ranked[0].fix.id).toBe('handoff'); // small effort beats medium at 1 each
  });
  it('shares are zero when there are no failures', () => {
    const ranked = rankFixes(countTags({ 1: 'fine' }));
    expect(ranked.every((r) => r.removed === 0 && r.share === 0)).toBe(true);
  });
  it('every fix removes at least one real failure type', () => {
    for (const f of FIXES) {
      expect(f.removes.length).toBeGreaterThan(0);
      expect(f.removes as FailureId[]).not.toContain('fine');
    }
  });
});

describe('compareToReference', () => {
  it('is perfect when the tags equal the reference', () => {
    const r = compareToReference(reference());
    expect(r.tagged).toBe(20);
    expect(r.agree).toBe(20);
    expect(r.kappa.kappa).toBeCloseTo(1, 12);
  });
  it('counts only tagged transcripts', () => {
    const r = compareToReference({ 1: 'fine', 2: 'tone' });
    expect(r.tagged).toBe(2);
    expect(r.agree).toBe(1);
  });
  it('is hand-checkable: tagging everything "fine" agrees on the 6 fine ones', () => {
    const all: Tags = Object.fromEntries(TRANSCRIPTS.map((t) => [t.id, 'fine' as FailureId]));
    const r = compareToReference(all);
    expect(r.agree).toBe(6);
    // all of A's labels are "fine": p_e = (20/20) * (6/20) = 0.3, p_o = 0.3, kappa = 0
    expect(r.kappa.po).toBeCloseTo(0.3, 12);
    expect(r.kappa.kappa).toBeCloseTo(0, 12);
  });
});
