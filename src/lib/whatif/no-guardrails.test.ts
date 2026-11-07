import { describe, expect, it } from 'vitest';
import { FALSE_ALARM_SECONDS, TURNS, falseAlarmSeconds, inputCheckFlags, outputCheckFlags, reached, run } from './no-guardrails';

describe('no-guardrails', () => {
  it('the script has 5 inputs with personal data and 3 replies that break the policy', () => {
    expect(TURNS).toHaveLength(13);
    expect(TURNS.filter((t) => t.inputHasPii).map((t) => t.n)).toEqual([1, 2, 3, 4, 12]);
    expect(TURNS.filter((t) => t.outputBreaksPolicy).map((t) => t.n)).toEqual([7, 9, 10]);
  });

  it('individual rules behave as described', () => {
    expect(inputCheckFlags('write to sam@example.com', 'loose')).toBe(true);
    expect(inputCheckFlags('call 555-0142', 'loose')).toBe(true);
    expect(inputCheckFlags('1234 5678 9012 3456', 'loose')).toBe(true);
    expect(inputCheckFlags('hello there', 'loose')).toBe(false);
    expect(inputCheckFlags('sam dot example at example dot com', 'loose')).toBe(false);
    expect(inputCheckFlags('sam dot example at example dot com', 'tight')).toBe(true);
    expect(outputCheckFlags('12 Example Road, Leeds', 'loose')).toBe(true);
    expect(outputCheckFlags('A full refund is guaranteed.', 'loose')).toBe(true);
    expect(outputCheckFlags('Your refund was paid.', 'loose')).toBe(false);
    expect(outputCheckFlags('Your refund was paid.', 'tight')).toBe(true);
  });

  it('with no guardrails every real problem reaches its destination and nothing is blocked', () => {
    const r = run(false);
    expect(r.input.caught).toBe(0);
    expect(r.input.missed).toBe(5);
    expect(r.output.caught).toBe(0);
    expect(r.output.missed).toBe(3);
    expect(r.input.falseAlarms + r.output.falseAlarms).toBe(0);
    expect(reached(r)).toEqual({ input: 5, output: 3 });
    expect(falseAlarmSeconds(r)).toBe(0);
  });

  it('simple rules catch most but not all, and cost a false alarm', () => {
    const r = run(true, 'loose');
    expect(r.input).toMatchObject({ problems: 5, caught: 4, missed: 1, falseAlarms: 1 });
    expect(r.output).toMatchObject({ problems: 3, caught: 2, missed: 1, falseAlarms: 1 });
    expect(r.input.cells[3]).toBe('missed'); // the email written in words
    expect(r.input.cells[5]).toBe('false'); // the order number
    expect(r.output.cells[7]).toBe('false'); // the careful reply
    expect(r.output.cells[8]).toBe('missed'); // the medical verdict
    expect(falseAlarmSeconds(r)).toBe(2 * FALSE_ALARM_SECONDS);
  });

  it('tighter rules catch more and raise more false alarms', () => {
    const loose = run(true, 'loose');
    const tight = run(true, 'tight');
    expect(tight.input.caught).toBe(5);
    expect(tight.output.caught).toBe(3);
    expect(tight.output.falseAlarms).toBe(2);
    expect(tight.input.caught + tight.output.caught).toBeGreaterThan(loose.input.caught + loose.output.caught);
    expect(falseAlarmSeconds(tight)).toBeGreaterThan(falseAlarmSeconds(loose));
  });

  it('every exchange gets exactly one cell per stage', () => {
    for (const g of [true, false]) {
      const r = run(g);
      expect(r.input.cells).toHaveLength(13);
      expect(r.output.cells).toHaveLength(13);
    }
  });
});
