import { describe, expect, it } from 'vitest';
import { QUESTIONS, RUN_COUNT, SLOW_MS, SPANS, answerFor, makeRuns, mulberry32, sampleRuns, selfTime, spanCost, totalCost } from './trace-viewer';

describe('the example trace', () => {
  it('has one root, every other span has a parent, and children sit inside their parent', () => {
    const roots = SPANS.filter((s) => s.parent === null);
    expect(roots).toHaveLength(1);
    for (const s of SPANS.filter((x) => x.parent !== null)) {
      const p = SPANS.find((x) => x.id === s.parent)!;
      expect(s.startMs).toBeGreaterThanOrEqual(p.startMs);
      expect(s.startMs + s.durMs).toBeLessThanOrEqual(p.startMs + p.durMs);
    }
  });
  it('the root own time is what the children leave over', () => {
    expect(selfTime(SPANS[0])).toBe(8900 - (1200 + 350 + 1280 + 3000 + 400 + 2200 + 300));
    expect(selfTime(SPANS[0])).toBe(170);
  });
  it('prices spans at the example rates', () => {
    expect(spanCost(SPANS[1])).toBeCloseTo((1900 * 3 + 120 * 15) / 1e6, 10);
    expect(spanCost(SPANS[6])).toBeCloseTo(0.02505, 6);
    expect(totalCost()).toBeCloseTo(0.0417, 6);
  });
  it('the final call costs about 60% of the run', () => {
    expect(spanCost(SPANS[6]) / totalCost()).toBeCloseTo(0.6007, 3);
  });
  it('answers the four questions', () => {
    const ids = Object.fromEntries(QUESTIONS.map((q) => [q.id, answerFor(q.id)]));
    expect(ids).toEqual({ slow: 5, costly: 7, failed: 5, empty: 3 });
  });
});

describe('sampling', () => {
  it('is deterministic', () => {
    expect(makeRuns()).toEqual(makeRuns());
    const a = mulberry32(1);
    const b = mulberry32(1);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  const runs = makeRuns();
  it('makes 1,000 runs with 21 errors and 30 slow runs', () => {
    expect(runs).toHaveLength(RUN_COUNT);
    expect(runs.filter((r) => r.error)).toHaveLength(21);
    expect(runs.filter((r) => r.durMs >= SLOW_MS)).toHaveLength(30);
  });
  it('head sampling at 100% keeps everything', () => {
    expect(sampleRuns(runs, 'head', 1)).toMatchObject({ kept: 1000, errorsKept: 21, slowKept: 30 });
  });
  it('head sampling at 10% keeps about a tenth and loses most errors', () => {
    expect(sampleRuns(runs, 'head', 0.1)).toMatchObject({ kept: 99, errorsKept: 2, slowKept: 1 });
  });
  it('head sampling at 1% can lose every error', () => {
    expect(sampleRuns(runs, 'head', 0.01)).toMatchObject({ kept: 12, errorsKept: 0, slowKept: 0 });
  });
  it('tail sampling keeps every error and slow run and a share of the rest', () => {
    expect(sampleRuns(runs, 'tail', 0.1)).toMatchObject({ kept: 146, errorsKept: 21, slowKept: 30 });
    expect(sampleRuns(runs, 'tail', 0.01)).toMatchObject({ kept: 62, errorsKept: 21, slowKept: 30 });
  });
});
