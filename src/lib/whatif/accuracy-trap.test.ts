import { describe, expect, it } from 'vitest';
import { accuracy, accuracyPrefersBaseline, alwaysNo, crossoverEvents, detector, precision, recall, total } from './accuracy-trap';

describe('accuracy trap what-if', () => {
  it('always-no on 10 events in 1000 clips scores 99% and finds nothing', () => {
    const c = alwaysNo(10);
    expect(c).toEqual({ tp: 0, fp: 0, fn: 10, tn: 990 });
    expect(accuracy(c)).toBeCloseTo(0.99, 10);
    expect(recall(c)).toBe(0);
    expect(precision(c)).toBeNull();
  });
  it('the example detector at 10 events: 8 found, 20 false alarms', () => {
    const c = detector(10);
    // 80% of 10 = 8; 2% of 990 = 19.8 -> 20
    expect(c).toEqual({ tp: 8, fp: 20, fn: 2, tn: 970 });
    expect(total(c)).toBe(1000);
    expect(accuracy(c)).toBeCloseTo(0.978, 10);
    expect(recall(c)).toBeCloseTo(0.8, 10);
    expect(precision(c)).toBeCloseTo(8 / 28, 10);
  });
  it('accuracy prefers the do-nothing baseline when events are rare', () => {
    expect(accuracyPrefersBaseline(10)).toBe(true);
    expect(accuracyPrefersBaseline(150)).toBe(false);
  });
  it('the baseline wins until events reach about 1 in 30 clips for this detector', () => {
    // baseline accuracy = 1 - e/1000. detector errors = (e - tp) + fp. Baseline errors = e.
    // baseline wins when tp < fp, i.e. 0.8e < 0.02(1000 - e)  =>  e < 24.4
    const x = crossoverEvents();
    expect(x).toBeGreaterThanOrEqual(23);
    expect(x).toBeLessThanOrEqual(25);
    expect(accuracyPrefersBaseline(x)).toBe(true);
    expect(accuracyPrefersBaseline(x + 1)).toBe(false);
  });
  it('precision rises as events become more common (same detector)', () => {
    const p = [5, 10, 50, 100, 200].map((e) => precision(detector(e)) as number);
    for (let i = 1; i < p.length; i++) expect(p[i]).toBeGreaterThan(p[i - 1]);
  });
  it('counts always add up to the population', () => {
    for (const e of [1, 7, 33, 200]) {
      expect(total(alwaysNo(e))).toBe(1000);
      expect(total(detector(e))).toBe(1000);
    }
  });
});

import { cells } from './accuracy-trap';
describe('accuracy trap cells', () => {
  it('lays out one cell per clip with the right counts', () => {
    for (const e of [1, 10, 100]) {
      for (const c of [alwaysNo(e), detector(e)]) {
        const cs = cells(c);
        expect(cs).toHaveLength(1000);
        expect(cs.filter((x) => x === 'tp')).toHaveLength(c.tp);
        expect(cs.filter((x) => x === 'fn')).toHaveLength(c.fn);
        expect(cs.filter((x) => x === 'fp')).toHaveLength(c.fp);
        expect(cs.filter((x) => x === 'tn')).toHaveLength(c.tn);
      }
    }
  });
  it('events stay in the same cells in both models', () => {
    const a = cells(alwaysNo(10)).map((x) => x === 'fn');
    const b = cells(detector(10)).map((x) => x === 'fn' || x === 'tp');
    expect(a).toEqual(b);
  });
});
