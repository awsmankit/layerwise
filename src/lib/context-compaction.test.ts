import { describe, expect, it } from 'vitest';
import { BUDGET, COMPACT_AT, FACTS, SCRIPT, SCRIPT_TOTAL, SUMMARY_TOKENS, TURNS, answeredCount, lostAt, simulate } from './context-compaction';

describe('the scripted session', () => {
  it('has 40 consecutive turns and five planted facts on real turns', () => {
    expect(SCRIPT).toHaveLength(TURNS);
    expect(SCRIPT.map((t) => t.n)).toEqual(Array.from({ length: TURNS }, (_, i) => i + 1));
    expect(FACTS).toHaveLength(5);
    for (const f of FACTS) expect(SCRIPT[f.turn - 1].fact).toBe(f.id);
  });
  it('would not fit in the toy window if nothing were removed', () => {
    expect(SCRIPT_TOTAL).toBeGreaterThan(BUDGET);
  });
});

describe('do nothing', () => {
  const r = simulate('none');
  it('overflows the window and stops before turn 40', () => {
    expect(r.overflowAt).toBe(27);
    expect(r.snapshots).toHaveLength(27);
    expect(r.snapshots[r.snapshots.length - 1].overflow).toBe(true);
  });
  it('cannot answer any later question', () => {
    expect(answeredCount(r)).toEqual({ yes: 0, partly: 0, no: 5 });
  });
});

describe('truncate oldest', () => {
  const r = simulate('truncate');
  it('never goes over the window', () => {
    expect(r.overflowAt).toBeNull();
    expect(Math.max(...r.snapshots.map((s) => s.tokens))).toBeLessThanOrEqual(BUDGET);
  });
  it('loses the oldest facts first and keeps the newest', () => {
    expect(r.finalFacts.F1).toBe('lost');
    expect(r.finalFacts.F2).toBe('lost');
    expect(r.finalFacts.F3).toBe('lost');
    expect(r.finalFacts.F4).toBe('full');
    expect(r.finalFacts.F5).toBe('full');
    const l1 = lostAt(r, 'F1')!;
    const l3 = lostAt(r, 'F3')!;
    expect(l1).toBeLessThan(l3);
  });
  it('stays near the limit, so the summed input is the highest of the strategies that finish', () => {
    expect(r.cumulative).toBeGreaterThan(simulate('summarise').cumulative);
    expect(r.cumulative).toBeGreaterThan(simulate('notes').cumulative);
  });
});

describe('summarise', () => {
  const r = simulate('summarise');
  it('compacts twice and the context drops each time', () => {
    expect(r.compactions).toEqual([21, 32]);
    for (const turn of r.compactions) {
      const before = r.snapshots[turn - 2].tokens;
      const after = r.snapshots[turn - 1].tokens;
      expect(after).toBeLessThan(before);
      expect(r.snapshots[turn - 1].blocks.some((b) => b.kind === 'summary' && b.tokens === SUMMARY_TOKENS)).toBe(true);
    }
  });
  it('compacts before the window is full', () => {
    expect(r.overflowAt).toBeNull();
    expect(r.peak).toBeLessThanOrEqual(BUDGET);
    const first = r.snapshots[r.compactions[0] - 2].tokens;
    expect(first).toBeLessThanOrEqual(BUDGET * COMPACT_AT);
  });
  it('keeps a pinned rule, blurs a detail that is summarised twice, and loses what the summary left out', () => {
    expect(r.finalFacts.F1).toBe('summary-kept');
    expect(r.finalFacts.F2).toBe('summary-gist');
    expect(r.finalFacts.F3).toBe('lost');
    expect(r.finalFacts.F4).toBe('lost');
    expect(r.finalFacts.F5).toBe('summary-kept');
    expect(answeredCount(r)).toEqual({ yes: 2, partly: 1, no: 2 });
  });
});

describe('notes file plus retrieval', () => {
  const r = simulate('notes');
  it('stays far below the window', () => {
    expect(r.peak).toBeLessThan(BUDGET / 3);
    expect(r.cumulative).toBeLessThan(simulate('summarise').cumulative / 2);
  });
  it('keeps what the agent chose to write down and loses what it did not', () => {
    expect(r.finalFacts.F1).toBe('notes');
    expect(r.finalFacts.F2).toBe('notes');
    expect(r.finalFacts.F3).toBe('notes');
    expect(r.finalFacts.F4).toBe('lost');
    expect(r.finalFacts.F5).toBe('lost');
    expect(answeredCount(r).yes).toBe(3);
  });
  it('answers every question when the prompt tells the agent what to note, at a small retrieval cost', () => {
    const p = simulate('notes', { notePolicy: true });
    expect(answeredCount(p)).toEqual({ yes: 5, partly: 0, no: 0 });
    expect(p.retrievalTokens).toBeGreaterThan(r.retrievalTokens);
    expect(p.retrievalTokens).toBeLessThan(1000);
  });
});

describe('general', () => {
  it('is deterministic', () => {
    expect(simulate('summarise')).toEqual(simulate('summarise'));
  });
  it('gives each snapshot a token total equal to the sum of its blocks', () => {
    for (const s of ['none', 'truncate', 'summarise', 'notes'] as const) {
      for (const snap of simulate(s).snapshots) expect(snap.tokens).toBe(snap.blocks.reduce((n, b) => n + b.tokens, 0));
    }
  });
  it('does not report a fact before its turn', () => {
    const r = simulate('truncate');
    expect(r.snapshots[0].facts.F5).toBe('not-yet');
  });
});
