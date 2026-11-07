import { describe, expect, it } from 'vitest';
import { HANG_SECONDS, LOOP_CALLS, MAX_ATTEMPTS, PLAN, RATES, TASKS, makePlan, runAll, runTask, type Plan } from './no-tool-error-handling';

/** A hand-made plan for task 0 only: the draws say which attempts fail at p = 0.5. */
const plan = (draw: number[], kind: Plan['kind'][number], backup: boolean): Plan => ({
  draw: [draw],
  kind: [kind],
  hasBackup: [backup],
});
// 0.1 fails at p = 0.5, 0.9 succeeds

describe('no-tool-error-handling', () => {
  it('with no errors both ways finish all 20 tasks on the first try', () => {
    for (const h of [true, false]) {
      const s = runAll(0, h);
      expect(s.correct).toBe(TASKS);
      expect(s.counts.ok).toBe(TASKS);
      expect(s.calls).toBe(TASKS);
      expect(s.seconds).toBe(8); // 20 calls x 0.4 s
    }
  });

  it('a timeout with no handling hangs until the run is killed', () => {
    const r = runTask(0, 0.5, false, plan([0.1, 0.9, 0.9, 0.9], 'timeout', true));
    expect(r.outcome).toBe('crashed');
    expect(r.seconds).toBe(HANG_SECONDS);
    expect(r.calls).toBe(1);
  });

  it('an error reply with no handling becomes a made-up result', () => {
    const r = runTask(0, 0.5, false, plan([0.1, 0.9, 0.9, 0.9], 'error', true));
    expect(r.outcome).toBe('invented');
    expect(r.calls).toBe(1);
  });

  it('too many requests with no handling loops until the step limit', () => {
    const r = runTask(0, 0.5, false, plan([0.1, 0.1, 0.1, 0.1], 'throttle', true));
    expect(r.outcome).toBe('looped');
    expect(r.calls).toBe(LOOP_CALLS);
    expect(r.seconds).toBe(1.6); // 8 x 0.2 s
  });

  it('with handling a failure that clears is retried after a 1 s wait', () => {
    const r = runTask(0, 0.5, true, plan([0.1, 0.9, 0.9, 0.9], 'error', false));
    expect(r.outcome).toBe('retried');
    expect(r.calls).toBe(2);
    expect(r.seconds).toBe(1.8); // 0.4 + wait 1 + 0.4
  });

  it('waits grow 1, 2, 4 s and the third retry can still succeed', () => {
    const r = runTask(0, 0.5, true, plan([0.1, 0.1, 0.1, 0.9], 'throttle', false));
    expect(r.outcome).toBe('retried');
    expect(r.attempts.map((a) => a.waitBefore)).toEqual([0, 1, 2, 4]);
    expect(r.seconds).toBe(8); // 0.2 + (1 + 0.2) + (2 + 0.2) + (4 + 0.4)
  });

  it('after four failed attempts it uses a backup if there is one, otherwise it asks', () => {
    const withBackup = runTask(0, 0.5, true, plan([0.1, 0.1, 0.1, 0.1], 'error', true));
    expect(withBackup.outcome).toBe('backup');
    expect(withBackup.calls).toBe(MAX_ATTEMPTS);
    const without = runTask(0, 0.5, true, plan([0.1, 0.1, 0.1, 0.1], 'error', false));
    expect(without.outcome).toBe('asked');
    expect(without.calls).toBe(MAX_ATTEMPTS);
  });

  it('the shipped 20-task run at a 30% failure rate, checked against the random table', () => {
    const failFirst = PLAN.draw.filter((d) => d[0] < 0.3).length;
    const raw = runAll(0.3, false);
    expect(raw.correct).toBe(TASKS - failFirst);
    expect(raw.correct).toBe(13);
    expect(raw.counts.crashed + raw.counts.invented + raw.counts.looped).toBe(failFirst);
    expect(raw.counts).toMatchObject({ crashed: 2, invented: 4, looped: 1 });
    const safe = runAll(0.3, true);
    expect(safe.correct).toBe(19);
    expect(safe.counts.asked).toBe(1);
    expect(safe.broken).toBe(0);
  });

  it('handling never makes fewer tasks correct, and no handling never gets better as errors rise', () => {
    let prev = Infinity;
    for (const pct of RATES) {
      const p = pct / 100;
      const raw = runAll(p, false);
      const safe = runAll(p, true);
      expect(safe.correct).toBeGreaterThanOrEqual(raw.correct);
      expect(raw.correct).toBeLessThanOrEqual(prev);
      prev = raw.correct;
      expect(safe.counts.crashed + safe.counts.invented + safe.counts.looped).toBe(0);
      expect(Object.values(safe.counts).reduce((a, b) => a + b, 0)).toBe(TASKS);
    }
  });

  it('is deterministic and the plan has a draw for every attempt', () => {
    expect(runAll(0.3, true)).toEqual(runAll(0.3, true));
    expect(makePlan(37)).toEqual(PLAN);
    expect(PLAN.draw.every((d) => d.length === MAX_ATTEMPTS)).toBe(true);
  });
});
