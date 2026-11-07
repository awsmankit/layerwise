import { describe, expect, it } from 'vitest';
import {
  COHORTS,
  DETECT_DAY,
  FIRST_STAGES,
  FIX_READY,
  FLEET,
  HOLD,
  HORIZON,
  RECALL_START,
  daysToShare,
  deviceState,
  firstConnect,
  recallCurve,
  recallExpected,
  rollout,
  schedule,
  unit,
} from './no-ota-updates';

describe('no OTA updates what-if', () => {
  it('is deterministic', () => {
    expect(unit(5, 1)).toBe(unit(5, 1));
    expect(rollout(10, false).fixed).toEqual(rollout(10, false).fixed);
    expect(recallCurve()).toEqual(recallCurve());
  });
  it('builds the stage plan: everyone at once, or 1%, 50%, 100% spaced by the watching time', () => {
    expect(schedule(100)).toEqual([{ share: 1, start: FIX_READY }]);
    expect(schedule(5)).toEqual([
      { share: 0.05, start: FIX_READY },
      { share: 0.5, start: FIX_READY + HOLD },
      { share: 1, start: FIX_READY + 2 * HOLD },
    ]);
    expect(schedule(50)).toEqual([
      { share: 0.5, start: FIX_READY },
      { share: 1, start: FIX_READY + HOLD },
    ]);
  });
  it('shares the fleet into the example cohorts', () => {
    // devices that connect on 20 or more of the first 40 days are the "most days" group
    let often = 0;
    for (let i = 0; i < FLEET; i++) {
      let n = 0;
      for (let d = 0; d < 40; d++) if (firstConnect(i, d) === d) n++;
      if (n >= 14) often++;
    }
    expect(often / FLEET).toBeGreaterThan(COHORTS[0].share - 0.05);
    expect(often / FLEET).toBeLessThan(COHORTS[0].share + 0.06);
  });
  it('the fix curve never falls, starts at zero before the fix is ready and passes 90% within the horizon', () => {
    for (const f of FIRST_STAGES) {
      const r = rollout(f, false);
      expect(r.fixed[0]).toBe(0);
      expect(r.fixed[FIX_READY - 1]).toBe(0);
      for (let d = 1; d <= HORIZON; d++) expect(r.fixed[d]).toBeGreaterThanOrEqual(r.fixed[d - 1]);
      expect(daysToShare(r.fixed, 0.9)).not.toBeNull();
    }
  });
  it('a smaller first stage reaches fewer devices early (monotone in the first stage size) but the tail is the same', () => {
    const early = FIRST_STAGES.map((f) => rollout(f, false).fixed[FIX_READY + 2]);
    for (let i = 1; i < early.length; i++) expect(early[i]).toBeGreaterThanOrEqual(early[i - 1]);
    const all = rollout(100, false);
    const slow = rollout(1, false);
    expect(Math.abs(all.fixed[HORIZON] - slow.fixed[HORIZON])).toBeLessThan(0.01);
  });
  it('updates beat a recall by a wide margin: the example numbers', () => {
    const r = rollout(10, false);
    const recall = recallCurve();
    // a month after the bug is found
    expect(r.fixed[30]).toBeGreaterThan(0.8);
    expect(recall[30]).toBeLessThan(0.15);
    // at 90 days most devices have the fix by OTA, a minority by recall
    expect(r.fixed[HORIZON]).toBeGreaterThan(0.93);
    expect(recall[HORIZON]).toBeLessThan(0.4);
    // nothing returned before the recall opens
    expect(recall[RECALL_START - 1]).toBe(0);
  });
  it('the simulated recall tracks the expected value 1 - (1 - rate)^days', () => {
    const recall = recallCurve();
    expect(recallExpected(RECALL_START - 1)).toBe(0);
    expect(recallExpected(RECALL_START)).toBeCloseTo(0.005, 12);
    for (const d of [20, 40, 60, 90]) expect(Math.abs(recall[d] - recallExpected(d))).toBeLessThan(0.03);
  });
  it('a bad fix: staging limits how many devices get it, and rollback removes it from the devices that come back', () => {
    const exposure = FIRST_STAGES.map((f) => Math.max(...rollout(f, true).onBad));
    for (let i = 1; i < exposure.length; i++) expect(exposure[i]).toBeGreaterThanOrEqual(exposure[i - 1]);
    expect(exposure[0]).toBeLessThan(0.01); // 1% first stage
    expect(exposure[exposure.length - 1]).toBeGreaterThan(0.4); // everyone at once
    const all = rollout(100, true);
    // nobody gets the bad update after it was caught
    for (const g of all.got) if (g !== null) expect(g).toBeLessThanOrEqual(DETECT_DAY);
    // it is gone from almost every device by the end, but not from devices that never reconnect
    expect(all.onBad[HORIZON]).toBeLessThan(all.onBad[DETECT_DAY] / 50);
    expect(all.onBad[HORIZON]).toBeGreaterThan(0);
  });
  it('dot states follow the rollout', () => {
    const r = rollout(100, false);
    const i = r.got.findIndex((g) => g !== null && g <= 6);
    expect(deviceState(i, 0, r)).toBe('bug');
    expect(deviceState(i, 10, r)).toBe('fixed');
    const bad = rollout(100, true);
    const k = bad.got.findIndex((g, n) => g !== null && bad.rolledBack[n] !== null);
    const gotDay = bad.got[k]!;
    const backDay = bad.rolledBack[k]!;
    expect(deviceState(k, gotDay, bad)).toBe('bad');
    expect(deviceState(k, backDay, bad)).toBe('bug');
    expect(deviceState(k, gotDay - 1, bad)).toBe('bug');
    expect(deviceState(k, 3, null)).toBe('bug');
  });
});
