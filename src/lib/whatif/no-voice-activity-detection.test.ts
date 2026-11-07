import { describe, expect, it } from 'vitest';
import {
  BATTERY_WH,
  CELLS,
  FALSE_ALARM,
  averagePowerMw,
  batteryHours,
  dutyCycle,
  energyPerDayMWh,
  makeMinute,
  minuteCounts,
  missedWordsPerDay,
  wordsPerDay,
} from './no-voice-activity-detection';

describe('no voice-activity-detection what-if', () => {
  it('without a gate the big model runs all day: 40.5 mW, 972 mWh a day, 27 hours of battery (generic example figures)', () => {
    expect(dutyCycle(0.1, 0.05, false)).toBe(1);
    expect(averagePowerMw(1, false)).toBeCloseTo(40.5, 10);
    expect(energyPerDayMWh(0.1, 0.05, false)).toBeCloseTo(972, 8);
    expect(batteryHours(0.1, 0.05, false)).toBeCloseTo(1100 / 40.5, 10);
    expect(batteryHours(0.1, 0.05, false)).toBeCloseTo(27.16, 2);
  });
  it('with a gate, 10% speech and 5% misses (hand-checked)', () => {
    // duty = 0.1 * 0.95 + 0.9 * 0.03 = 0.095 + 0.027 = 0.122
    expect(dutyCycle(0.1, 0.05, true)).toBeCloseTo(0.122, 10);
    // power = 0.5 + 0.3 + 0.122 * 40 = 5.68 mW
    expect(averagePowerMw(0.122, true)).toBeCloseTo(5.68, 10);
    expect(energyPerDayMWh(0.1, 0.05, true)).toBeCloseTo(5.68 * 24, 8);
    expect(batteryHours(0.1, 0.05, true)).toBeCloseTo((BATTERY_WH * 1000) / 5.68, 8);
    expect(batteryHours(0.1, 0.05, true) / 24).toBeCloseTo(8.07, 2);
  });
  it('the more of the day is speech, the shorter the battery life; the gate always beats running all day', () => {
    let last = Infinity;
    for (const s of [0.02, 0.1, 0.2, 0.3, 0.5]) {
      const h = batteryHours(s, 0.05, true);
      expect(h).toBeLessThan(last);
      expect(h).toBeGreaterThan(batteryHours(s, 0.05, false));
      last = h;
    }
  });
  it('a higher miss rate saves only a little energy but loses words', () => {
    const e0 = energyPerDayMWh(0.1, 0, true);
    const e30 = energyPerDayMWh(0.1, 0.3, true);
    expect(e30).toBeLessThan(e0);
    expect((e0 - e30) / e0).toBeLessThan(0.25);
    // 10% of a day is 8,640 s; at 2.5 words per second that is 21,600 words; 5% missed is 1,080
    expect(wordsPerDay(0.1)).toBeCloseTo(21600, 6);
    expect(missedWordsPerDay(0.1, 0.05, true)).toBeCloseTo(1080, 6);
    expect(missedWordsPerDay(0.1, 0.3, true)).toBeGreaterThan(missedWordsPerDay(0.1, 0.05, true));
    expect(missedWordsPerDay(0.1, 0.3, false)).toBe(0);
  });
  it('the example minute: the right number of speech seconds, deterministic, and no misses without a gate', () => {
    const a = makeMinute(0.1, 0.05, true);
    expect(a).toHaveLength(CELLS);
    expect(a.filter((c) => c.speech)).toHaveLength(6);
    expect(makeMinute(0.1, 0.05, true)).toEqual(a);
    const off = minuteCounts(makeMinute(0.1, 0.05, false));
    expect(off.missed).toBe(0);
    expect(off.running).toBe(CELLS);
    expect(off.onSilence).toBe(CELLS - 6);
  });
  it('raising the speech share only adds speech seconds; raising the miss rate only adds missed seconds', () => {
    const speechAt = (s: number) => new Set(makeMinute(s, 0, true).flatMap((c, i) => (c.speech ? [i] : [])));
    const small = speechAt(0.1);
    const big = speechAt(0.4);
    for (const i of small) expect(big.has(i)).toBe(true);
    const missedAt = (m: number) => new Set(makeMinute(0.4, m, true).flatMap((c, i) => (c.missed ? [i] : [])));
    const lo = missedAt(0.1);
    const hi = missedAt(0.4);
    for (const i of lo) expect(hi.has(i)).toBe(true);
    expect(hi.size).toBeGreaterThanOrEqual(lo.size);
  });
  it('a missed second is speech whose gate stayed closed, so its word is lost; at a 100% miss rate every word is lost', () => {
    const all = minuteCounts(makeMinute(0.3, 1, true));
    expect(all.missed).toBe(all.spoken);
    expect(all.heard).toBe(0);
    for (const c of makeMinute(0.3, 0.4, true)) if (c.missed) expect(c.open).toBe(false);
  });
  it('false alarms are a fixed small share of quiet time', () => {
    expect(FALSE_ALARM).toBe(0.03);
    const c = makeMinute(0.1, 0, true);
    expect(c.filter((x) => x.falseAlarm).length).toBeLessThan(8);
  });
});
