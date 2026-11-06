import { describe, expect, it } from 'vitest';
import {
  MAX_STEPS,
  fmtDuration,
  fmtMoney,
  inputTokens,
  stepCost,
  stepSeconds,
  stepsTaken,
  stopStep,
  totalCost,
  totalSeconds,
} from './no-step-limit';

describe('no-step-limit', () => {
  it('step 1 costs what the example prices say, by hand', () => {
    // 2,000 input tokens x $3 per million = $0.006, plus 300 output tokens x $15 per million = $0.0045
    expect(inputTokens(1)).toBe(2000);
    expect(stepCost(1)).toBeCloseTo(0.0105, 6);
    // step 10 sends 2,000 + 9 x 600 = 7,400 tokens
    expect(inputTokens(10)).toBe(7400);
    expect(stepCost(10)).toBeCloseTo((7400 * 3 + 300 * 15) / 1e6, 9);
  });

  it('the total matches the closed form: n x base + growth x n(n-1)/2 input tokens', () => {
    const n = 200;
    const inTok = n * 2000 + 600 * ((n * (n - 1)) / 2);
    const expected = (inTok * 3 + n * 300 * 15) / 1e6;
    expect(totalCost(n)).toBeCloseTo(expected, 9);
    expect(totalCost(200)).toBeCloseTo(37.92, 2);
    expect(totalCost(0)).toBe(0);
  });

  it('every step costs more than the one before, so the total grows faster than a straight line', () => {
    for (let k = 2; k <= MAX_STEPS; k++) expect(stepCost(k)).toBeGreaterThan(stepCost(k - 1));
    // doubling the steps more than doubles the cost
    expect(totalCost(100)).toBeGreaterThan(2 * totalCost(50));
    expect(totalCost(200)).toBeGreaterThan(2 * totalCost(100));
  });

  it('time per step is 3 s plus input over 20,000 tokens per second', () => {
    expect(stepSeconds(1)).toBeCloseTo(3.1, 9);
    expect(stepSeconds(101)).toBeCloseTo(3 + 62000 / 20000, 9);
    expect(totalSeconds(200) / 60).toBeCloseTo(20.3, 1);
  });

  it('a cap stops the loop at the last step that fits, and never overspends', () => {
    for (const cap of [1, 2, 5, 10, 20]) {
      const n = stopStep(cap);
      expect(totalCost(n)).toBeLessThanOrEqual(cap);
      expect(totalCost(n + 1)).toBeGreaterThan(cap);
    }
    expect(stopStep(5)).toBe(69);
    expect(stopStep(1)).toBe(28);
    expect(stopStep(0)).toBe(0);
    expect(stopStep(1000)).toBe(MAX_STEPS);
  });

  it('a bigger cap allows more steps', () => {
    expect(stopStep(10)).toBeGreaterThan(stopStep(5));
    expect(stopStep(5)).toBeGreaterThan(stopStep(2));
  });

  it('steps taken: capped runs stop, uncapped runs go on', () => {
    expect(stepsTaken(200, true, 5)).toBe(69);
    expect(stepsTaken(30, true, 5)).toBe(30);
    expect(stepsTaken(200, false, 5)).toBe(200);
  });

  it('formats money and time', () => {
    expect(fmtMoney(0.0105)).toBe('$0.011');
    expect(fmtMoney(4.947)).toBe('$4.95');
    expect(fmtMoney(37.92)).toBe('$37.92');
    expect(fmtMoney(1234)).toBe('$1,234');
    expect(fmtDuration(45)).toBe('45 s');
    expect(fmtDuration(282)).toBe('4.7 min');
    expect(fmtDuration(1217)).toBe('20 min');
  });
});
