import { describe, expect, it } from 'vitest';
import { analyse, CLIP_REFERENCE, FACTS, factsKept, pct, SYSTEMS, systemRows } from './caption-lab';

describe('captions lab', () => {
  it('the reference sentence has 23 words', () => {
    expect(analyse(CLIP_REFERENCE).score.refLen).toBe(23);
  });

  it('a perfect caption has no errors and keeps every fact', () => {
    const a = analyse(CLIP_REFERENCE);
    expect(a.score.edits).toBe(0);
    expect(a.keptCount).toBe(FACTS.length);
  });

  it('counts the invented systems by hand', () => {
    // A: coats to coat, the to a. B: "not" missing, nine to five. C: your, and, the, at, from missing.
    // D: bring to ring, coats to goats, cancelled to cancel, past to pass, gate to great. E: "four" missing.
    const rows = Object.fromEntries(systemRows().map((r) => [r.system.id, r]));
    expect(rows.a.errors).toBe(2);
    expect(rows.b.errors).toBe(2);
    expect(rows.c.errors).toBe(5);
    expect(rows.d.errors).toBe(5);
    expect(rows.e.errors).toBe(1);
    expect(rows.a.wer).toBeCloseTo(2 / 23, 12);
    expect(rows.c.wer).toBeCloseTo(5 / 23, 12);
    expect(rows.e.wer).toBeCloseTo(1 / 23, 12);
  });

  it('keeps the facts the caption still carries', () => {
    const kept = Object.fromEntries(systemRows().map((r) => [r.system.id, r.keptCount]));
    expect(kept).toEqual({ a: 4, b: 2, c: 4, d: 2, e: 3 });
  });

  it('shows why word error rate alone misleads: the lowest rate is not the most usable caption', () => {
    const rows = systemRows();
    const bestWer = rows.reduce((m, r) => (r.wer < m.wer ? r : m));
    const mostFacts = Math.max(...rows.map((r) => r.keptCount));
    expect(bestWer.system.id).toBe('e');
    expect(bestWer.keptCount).toBeLessThan(mostFacts);
    // B and A have the same rate but very different consequences.
    const a = rows.find((r) => r.system.id === 'a')!;
    const b = rows.find((r) => r.system.id === 'b')!;
    expect(a.wer).toBe(b.wer);
    expect(a.keptCount).toBeGreaterThan(b.keptCount);
    // C has a worse rate than A and still keeps as many facts.
    const c = rows.find((r) => r.system.id === 'c')!;
    expect(c.wer).toBeGreaterThan(a.wer);
    expect(c.keptCount).toBe(a.keptCount);
  });

  it('a dropped "not" loses the rain fact even though the caption reads smoothly', () => {
    const f = factsKept('The trip is cancelled if it rains').find((x) => x.fact.id === 'rain')!;
    expect(f.kept).toBe(false);
  });

  it('ignores case and punctuation and has five systems with unique ids', () => {
    expect(analyse(CLIP_REFERENCE.toUpperCase()).score.edits).toBe(0);
    expect(new Set(SYSTEMS.map((s) => s.id)).size).toBe(SYSTEMS.length);
  });

  it('formats percentages to one decimal place', () => {
    expect(pct(2 / 23)).toBe('8.7%');
    expect(pct(0)).toBe('0.0%');
    expect(pct(NaN)).toBe('undefined');
  });
});
