import { describe, expect, it } from 'vitest';
import { apiMonthly, breakEvenTokens, nodeCapacity, nodeMonthly, nodesNeeded, selfMonthly, selfPerMillion, HOURS_PER_MONTH, type BreakEvenInput } from './breakeven';

// Illustrative numbers only
const base: BreakEvenInput = { gpuHourly: 4, gpus: 1, throughput: 2500, util: 0.4, apiPrice: 4, overhead: 3000 };

describe('self-hosted cost per million tokens', () => {
  it('equals GPU cost per hour divided by tokens per hour, scaled to a million', () => {
    expect(selfPerMillion(base)).toBeCloseTo((4 / (2500 * 0.4 * 3600)) * 1e6, 8);
    expect(selfPerMillion(base)).toBeCloseTo(1.111, 3);
  });

  it('halving utilisation doubles the cost per token', () => {
    expect(selfPerMillion({ ...base, util: 0.2 })).toBeCloseTo(selfPerMillion(base) * 2, 8);
  });

  it('scales with GPUs per node and with throughput', () => {
    expect(selfPerMillion({ ...base, gpus: 2 })).toBeCloseTo(selfPerMillion(base) * 2, 8);
    expect(selfPerMillion({ ...base, throughput: 5000 })).toBeCloseTo(selfPerMillion(base) / 2, 8);
  });

  it('is infinite with no throughput', () => {
    expect(selfPerMillion({ ...base, throughput: 0 })).toBe(Infinity);
  });
});

describe('monthly cost', () => {
  it('a node costs hourly rate times hours in a month', () => {
    expect(nodeMonthly(base)).toBe(4 * HOURS_PER_MONTH);
  });

  it('adds whole nodes as volume grows: a staircase', () => {
    const cap = nodeCapacity(base);
    expect(nodesNeeded(base, 1)).toBe(1);
    expect(nodesNeeded(base, cap)).toBe(1);
    expect(nodesNeeded(base, cap + 1)).toBe(2);
    expect(selfMonthly(base, cap + 1)).toBeCloseTo(2 * nodeMonthly(base) + base.overhead, 6);
  });

  it('costs nothing at zero volume', () => {
    expect(selfMonthly(base, 0)).toBe(0);
    expect(apiMonthly(base, 0)).toBe(0);
  });

  it('the API bill is a straight line', () => {
    expect(apiMonthly(base, 1e9)).toBeCloseTo(4000, 6);
    expect(apiMonthly(base, 2e9)).toBeCloseTo(8000, 6);
  });
});

describe('break-even', () => {
  it('finds a volume where self-hosting stops costing more than the API', () => {
    const t = breakEvenTokens(base)!;
    expect(t).toBeGreaterThan(0);
    expect(selfMonthly(base, t)).toBeLessThanOrEqual(apiMonthly(base, t) + 1e-6);
    // just below it, the API is still cheaper
    expect(selfMonthly(base, t * 0.9)).toBeGreaterThan(apiMonthly(base, t * 0.9));
  });

  it('higher overhead pushes break-even out', () => {
    expect(breakEvenTokens({ ...base, overhead: 10000 })!).toBeGreaterThan(breakEvenTokens(base)!);
  });

  it('while one node has enough capacity, utilisation does not move break-even: only fixed cost and API price do', () => {
    // capacity at 40% and 70% both exceed the break-even volume, so both equal fixed cost / API price per token
    const fixedOverPrice = (nodeMonthly(base) + base.overhead) / (base.apiPrice / 1e6);
    expect(breakEvenTokens(base)).toBeCloseTo(fixedOverPrice, 3);
    expect(breakEvenTokens({ ...base, util: 0.7 })).toBeCloseTo(fixedOverPrice, 3);
  });

  it('once capacity is the limit, better utilisation pulls break-even in', () => {
    const poor = breakEvenTokens({ ...base, util: 0.15 })!; // one node cannot carry the break-even volume
    const good = breakEvenTokens({ ...base, util: 0.4 })!;
    expect(poor).toBeGreaterThan(good);
  });

  it('with very poor utilisation the GPUs cost more per token than the API, so it never breaks even', () => {
    const idle = { ...base, util: 0.1 };
    expect(selfPerMillion(idle)).toBeGreaterThan(idle.apiPrice);
    expect(breakEvenTokens(idle)).toBeNull();
  });

  it('a cheaper API pushes break-even out', () => {
    const cheap = breakEvenTokens({ ...base, apiPrice: 2 });
    expect(cheap === null || cheap > breakEvenTokens(base)!).toBe(true);
  });

  it('never breaks even when the API is cheaper per token than your GPUs', () => {
    expect(breakEvenTokens({ ...base, apiPrice: 0.5 })).toBeNull();
  });

  it('is null for nonsense inputs', () => {
    expect(breakEvenTokens({ ...base, throughput: 0 })).toBeNull();
    expect(breakEvenTokens({ ...base, apiPrice: 0 })).toBeNull();
  });
});
