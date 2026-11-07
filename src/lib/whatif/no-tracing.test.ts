import { describe, expect, it } from 'vitest';
import { BAD_STEP, FINAL_ANSWER, STEPS, STEP_COUNT, inspectWithTrace, inspectWithoutTrace, maxMs, rootCause, timeWithTraceSeconds, timeWithoutTraceMinutes, toolSteps, totalMs, trail } from './no-tracing';

describe('no tracing what-if', () => {
  it('is a scripted run of 12 numbered steps', () => {
    expect(STEP_COUNT).toBe(12);
    expect(STEPS.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
  it('the bad tool result is at step 7 and looks successful', () => {
    const s = STEPS[BAD_STEP - 1];
    expect(s.kind).toBe('tool');
    expect(s.name).toBe('get_price');
    expect(s.output).toContain('200 OK');
    expect(s.output).toContain('189');
    expect(s.from).toBeUndefined();
  });
  it('following the wrong number back from the answer gives 12, 10, 8, 7', () => {
    expect(trail()).toEqual([12, 10, 8, 7]);
    expect(rootCause()).toBe(7);
    expect(FINAL_ANSWER).toContain('189');
  });
  it('every link points to an earlier step', () => {
    for (const s of STEPS) if (s.from) expect(s.from).toBeLessThan(s.n);
  });
  it('inspect counts: 4 with a trace, 7 without', () => {
    expect(inspectWithTrace()).toBe(4);
    expect(inspectWithoutTrace()).toBe(7);
    expect(inspectWithTrace()).toBeLessThan(inspectWithoutTrace());
  });
  it('example times: 60 seconds with a trace, 35 minutes without', () => {
    expect(timeWithTraceSeconds()).toBe(60);
    expect(timeWithoutTraceMinutes()).toBe(35);
  });
  it('durations add up', () => {
    expect(totalMs()).toBe(820 + 140 + 610 + 95 + 540 + 70 + 110 + 490 + 260 + 700 + 330 + 180);
    expect(maxMs()).toBe(820);
    expect(toolSteps().map((s) => s.n)).toEqual([2, 4, 6, 7, 9, 11]);
  });
});
