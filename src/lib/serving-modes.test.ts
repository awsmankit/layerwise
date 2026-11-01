import { describe, expect, it } from 'vitest';
import { EXAMPLE, breakEvenActiveFraction, casesPerGroup, compare } from './serving-modes';

describe('serving-modes', () => {
  it('batch cost: 50 million x 20 ms = 1,000,000 core-seconds = 277.8 core-hours at $0.04', () => {
    const c = compare(EXAMPLE);
    expect(c.batchPredictions).toBe(50_000_000);
    expect(c.batchUsd).toBeCloseTo((1_000_000 / 3600) * 0.04, 10);
    expect(c.batchUsd).toBeCloseTo(11.11, 2);
  });

  it('1% active: 1.5M requests a day, 17.4 requests per second on average, 86.8 at peak, 4 cores, $3.84', () => {
    const c = compare(EXAMPLE);
    expect(c.onlinePredictions).toBe(1_500_000);
    expect(c.avgRps).toBeCloseTo(17.36, 2);
    expect(c.peakRps).toBeCloseTo(86.81, 2);
    expect(c.cores).toBe(4);
    expect(c.onlineUsd).toBeCloseTo(3.84, 10);
    expect(c.batchWaste).toBeCloseTo(0.99, 10);
  });

  it('10% active: 15M requests, 35 cores, $33.60, so batch is cheaper', () => {
    const c = compare({ ...EXAMPLE, activeFraction: 0.1 });
    expect(c.onlinePredictions).toBe(15_000_000);
    expect(c.cores).toBe(35);
    expect(c.onlineUsd).toBeCloseTo(33.6, 10);
    expect(c.onlineUsd).toBeGreaterThan(c.batchUsd);
  });

  it('3% active: 11 cores, $10.56; 50% active: 174 cores, $167.04 (the lesson table)', () => {
    const a = compare({ ...EXAMPLE, activeFraction: 0.03 });
    expect(a.cores).toBe(11);
    expect(a.onlineUsd).toBeCloseTo(10.56, 10);
    const b = compare({ ...EXAMPLE, activeFraction: 0.5 });
    expect(b.onlinePredictions).toBe(75_000_000);
    expect(b.cores).toBe(174);
    expect(b.onlineUsd).toBeCloseTo(167.04, 10);
  });

  it('the fleet never drops below the minimum', () => {
    const c = compare({ ...EXAMPLE, entities: 1000, activeFraction: 0.001 });
    expect(c.cores).toBe(2);
  });

  it('break-even is 0.5 / (3 x 5) = 3.33% of entities active', () => {
    expect(breakEvenActiveFraction(EXAMPLE)).toBeCloseTo(1 / 30, 10);
    const below = compare({ ...EXAMPLE, activeFraction: 0.02 });
    const above = compare({ ...EXAMPLE, activeFraction: 0.05 });
    expect(below.onlineUsd).toBeLessThan(below.batchUsd);
    expect(above.onlineUsd).toBeGreaterThan(above.batchUsd);
  });

  it('casesPerGroup matches the table in "Is the difference real?"', () => {
    expect(casesPerGroup(0.7, 0.8)).toBe(295);
    expect(casesPerGroup(0.7, 0.75)).toBe(1252);
    expect(casesPerGroup(0.7, 0.73)).toBe(3555);
  });
});
