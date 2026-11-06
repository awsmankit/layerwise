import { describe, expect, it } from 'vitest';
import { ALERT_SHIFT, COMPLAINT_ACCURACY, DAYS, expectedAccuracy, normCdf, refSd, rng, simulate, warningDays } from './no-drift-monitoring';

describe('drift monitoring what-if (simulation)', () => {
  it('has a normal CDF that matches known values', () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 6);
    expect(normCdf(1.5)).toBeCloseTo(0.9331928, 5);
    expect(normCdf(-1)).toBeCloseTo(0.1586553, 5);
  });
  it('launch-day accuracy for class centres 3 apart is about 93.3%', () => {
    expect(expectedAccuracy(0)).toBeCloseTo(0.93319, 4);
    // shift of 1: (Phi(0.5) + Phi(2.5)) / 2
    expect(expectedAccuracy(1)).toBeCloseTo((0.691462 + 0.993790) / 2, 4);
  });
  it('expected accuracy falls steadily as the inputs shift, towards 50%', () => {
    let prev = expectedAccuracy(0);
    for (let s = 0.25; s <= 5; s += 0.25) {
      const a = expectedAccuracy(s);
      expect(a).toBeLessThan(prev);
      prev = a;
    }
    expect(expectedAccuracy(5)).toBeGreaterThan(0.5);
    expect(expectedAccuracy(5)).toBeLessThan(0.52);
  });
  it('is deterministic', () => {
    expect(simulate(0.03)).toEqual(simulate(0.03));
    const a = rng(5);
    const b = rng(5);
    expect(a()).toBe(b());
  });
  it('simulated accuracy follows the exact curve closely (200 examples a day, 7-day average)', () => {
    const sim = simulate(0.03);
    expect(sim.daily).toHaveLength(DAYS);
    for (const d of [30, 60, 100]) {
      // the 7-day average sits at the shift of the middle day
      expect(sim.acc[d]).toBeCloseTo(expectedAccuracy(0.03 * (d - 3)), 1);
    }
  });
  it('the monitor alerts before users complain, and the gap is days long', () => {
    const sim = simulate(0.03);
    expect(sim.alertDay).not.toBeNull();
    expect(sim.complaintDay).not.toBeNull();
    expect(sim.alertDay!).toBeLessThan(sim.complaintDay!);
    expect(warningDays(sim)!).toBeGreaterThan(10);
    // at the alert day accuracy is still above the complaint line
    expect(sim.acc[sim.alertDay!]).toBeGreaterThan(COMPLAINT_ACCURACY);
    expect(sim.shift[sim.alertDay!]).toBeGreaterThan(ALERT_SHIFT);
  });
  it('faster drift moves both days earlier', () => {
    const slow = simulate(0.02);
    const fast = simulate(0.06);
    expect(fast.alertDay!).toBeLessThan(slow.alertDay!);
    expect(fast.complaintDay!).toBeLessThan(slow.complaintDay!);
  });
  it('no drift means no alert and no complaint', () => {
    const sim = simulate(0);
    expect(sim.alertDay).toBeNull();
    expect(sim.complaintDay).toBeNull();
    expect(warningDays(sim)).toBeNull();
    expect(refSd).toBeCloseTo(Math.sqrt(3.25), 10);
  });
});
