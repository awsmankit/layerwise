import { describe, expect, it } from 'vitest';
import { config, harmRatio, plannedExposure, simulate } from './no-canary-release';

describe('no canary release what-if', () => {
  it('the ramp is 1% for 10 minutes, 5% for 10, 25% for 10, then everyone; ship-to-all is 100% from minute 0', () => {
    expect([0, 9, 10, 19, 20, 29, 30, 59].map((t) => plannedExposure('canary', t))).toEqual([0.01, 0.01, 0.05, 0.05, 0.25, 0.25, 1, 1]);
    expect(plannedExposure('all', 0)).toBe(1);
  });
  it('ship to all, 20% of requests broken, 600 requests a minute: 120 failures in minute 0, alarm after 1 minute, 3 more minutes of rollback, 480 users harmed', () => {
    const r = simulate('all', 0.2, 600);
    expect(r.minutes[0].harmed).toBeCloseTo(120, 9);
    expect(r.minutes[0].alarm).toBe(true);
    expect(r.alarmAt).toBe(1);
    expect(r.rolledBackAt).toBe(4);
    expect(r.harmed).toBeCloseTo(480, 9);
    expect(r.harmedAtAlarm).toBeCloseTo(120, 9);
    expect(r.minutes[4].exposure).toBe(0);
    expect(r.minutes[3].exposure).toBe(1);
  });
  it('canary, same bad change: 1.2 failures a minute at 1%, 6 a minute at 5%; the window reaches 21.6 failures at the end of minute 11; 42 users harmed', () => {
    const r = simulate('canary', 0.2, 600);
    expect(r.minutes[5].harmed).toBeCloseTo(1.2, 9);
    expect(r.minutes[10].harmed).toBeCloseTo(6, 9);
    expect(r.minutes[10].windowFailures).toBeCloseTo(9 * 1.2 + 6, 9);
    expect(r.minutes[10].alarm).toBe(false);
    expect(r.minutes[11].windowFailures).toBeCloseTo(8 * 1.2 + 12, 9);
    expect(r.minutes[11].alarm).toBe(true);
    expect(r.alarmAt).toBe(12);
    expect(r.rolledBackAt).toBe(15);
    // 10 min x 1.2 + 5 min x 6 (minutes 10 to 14, ramp frozen at 5% during rollback)
    expect(r.harmed).toBeCloseTo(12 + 30, 9);
    expect(r.peakExposure).toBe(0.05);
  });
  it('the canary detects later but harms far fewer users: 480 vs 42, about 11 times fewer', () => {
    const all = simulate('all', 0.2, 600);
    const can = simulate('canary', 0.2, 600);
    expect(can.alarmAt!).toBeGreaterThan(all.alarmAt!);
    expect(can.harmed).toBeLessThan(all.harmed);
    expect(harmRatio(0.2, 600)).toBeCloseTo(480 / 42, 9);
  });
  it('harm never decreases over time, and stops growing once the bad version is gone', () => {
    const r = simulate('all', 0.1, 600);
    for (let i = 1; i < r.minutes.length; i++) expect(r.minutes[i].cumulative).toBeGreaterThanOrEqual(r.minutes[i - 1].cumulative);
    expect(r.minutes[r.minutes.length - 1].cumulative).toBe(r.harmed);
    expect(r.minutes[r.rolledBackAt!].cumulative).toBe(r.minutes[r.minutes.length - 1].cumulative);
  });
  it('a bad change that breaks 1% of requests is below the 2% alarm line: nobody notices, both ways of releasing it keep harming users', () => {
    const all = simulate('all', 0.01, 600);
    const can = simulate('canary', 0.01, 600);
    expect(all.alarmAt).toBeNull();
    expect(can.alarmAt).toBeNull();
    expect(all.harmed).toBeCloseTo(6 * 60, 9);
    // exposure-minutes: 0.01x10 + 0.05x10 + 0.25x10 + 1x30 = 33.1; times 600 x 0.01
    expect(can.harmed).toBeCloseTo(33.1 * 6, 9);
  });
  it('the alarm also needs 20 failures: with very little traffic a 20% failure share is not enough evidence yet', () => {
    const quiet = simulate('all', 0.2, 50);
    // 10 failures a minute, so the alarm waits for the second minute
    expect(quiet.alarmAt).toBe(2);
    const tiny = simulate('canary', 0.2, 50);
    expect(tiny.alarmAt!).toBeGreaterThan(12);
  });
  it('a larger failure share is caught sooner and harms more with ship-to-all; the canary harm stays small', () => {
    const lo = simulate('all', 0.05, 600);
    const hi = simulate('all', 0.4, 600);
    expect(hi.harmed).toBeGreaterThan(lo.harmed);
    expect(simulate('canary', 0.4, 600).harmed).toBeLessThan(hi.harmed / 10);
    expect(simulate('canary', 0.4, 600).alarmAt!).toBeLessThanOrEqual(simulate('canary', 0.05, 600).alarmAt!);
  });
  it('zero failures: nobody is harmed and nothing is rolled back', () => {
    const r = simulate('canary', 0, 600);
    expect(r.harmed).toBe(0);
    expect(r.alarmAt).toBeNull();
    expect(harmRatio(0, 600)).toBeNull();
    expect(config.horizonMinutes).toBe(60);
  });
});
