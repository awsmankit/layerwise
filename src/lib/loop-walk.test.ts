import { describe, expect, it } from 'vitest';
import { LOOP_CODE, loopSteps } from './loop-walk';

describe('loopSteps', () => {
  const steps = loopSteps([72, 85, 90, 64]);
  it('has two set-up steps, two per box, then the average and the print', () => {
    expect(steps).toHaveLength(2 + 4 * 2 + 2);
  });
  it('keeps a running total that ends at 311 and an average of 77.75', () => {
    expect(steps.filter((s) => s.line === 3).map((s) => s.vars.total)).toEqual([72, 157, 247, 311]);
    const last = steps[steps.length - 1];
    expect(last.vars.average).toBe(77.75);
    expect(last.printed).toBe('77.75');
  });
  it('only points at lines that exist, and at boxes in order', () => {
    for (const s of steps) expect(s.line).toBeLessThan(LOOP_CODE.length);
    expect(steps.filter((s) => s.line === 2).map((s) => s.box)).toEqual([0, 1, 2, 3]);
  });
});
