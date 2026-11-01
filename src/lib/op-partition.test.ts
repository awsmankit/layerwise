import { describe, expect, it } from 'vitest';
import { GRAPHS, evaluate, segmentsOf } from './op-partition';

const tfm = GRAPHS.find((g) => g.id === 'tfm')!;
const cnn = GRAPHS.find((g) => g.id === 'cnn')!;
const p = { speedup: 10, handoffMs: 0.3 };

describe('segmentsOf', () => {
  it('groups consecutive ops with the same placement', () => {
    expect(segmentsOf([true, true, false, true])).toEqual([
      { start: 0, end: 1, accel: true },
      { start: 2, end: 2, accel: false },
      { start: 3, end: 3, accel: true },
    ]);
  });
  it('handles all supported and none supported', () => {
    expect(segmentsOf([true, true])).toHaveLength(1);
    expect(segmentsOf([false, false])).toEqual([{ start: 0, end: 1, accel: false }]);
  });
});

describe('graph definitions', () => {
  it('have one support flag per op', () => {
    for (const g of GRAPHS) expect(g.supported).toHaveLength(g.ops.length);
  });
});

describe('the transformer example in the lesson (speed-up 10, hand-off 0.3 ms)', () => {
  const r = evaluate(tfm.ops, tfm.supported, p);
  it('splits into four accelerator partitions and eight hand-offs', () => {
    expect(r.partitions).toBe(4);
    expect(r.handoffs).toBe(8);
  });
  it('takes 29.1 ms on the CPU alone', () => {
    expect(r.cpuOnlyMs).toBeCloseTo(29.1, 9);
  });
  it('spends 2.2 ms on the CPU, 2.69 ms on the accelerator and 2.4 ms on hand-offs: 7.29 ms in all', () => {
    expect(r.cpuComputeMs).toBeCloseTo(2.2, 9);
    expect(r.accelComputeMs).toBeCloseTo(2.69, 9);
    expect(r.handoffTotalMs).toBeCloseTo(2.4, 9);
    expect(r.totalMs).toBeCloseTo(7.29, 9);
  });
  it('would take 3.51 ms with every op supported (one partition)', () => {
    expect(r.allSupportedMs).toBeCloseTo(29.1 / 10 + 0.6, 9);
    const all = evaluate(tfm.ops, tfm.ops.map(() => true), p);
    expect(all.partitions).toBe(1);
    expect(all.totalMs).toBeCloseTo(r.allSupportedMs, 9);
  });
  it('stops paying off when each hand-off costs about 3.0 ms', () => {
    // (29.1 - 2.2 - 2.69) / 8
    expect(r.breakEvenHandoffMs).toBeCloseTo(3.026, 3);
    const at = evaluate(tfm.ops, tfm.supported, { speedup: 10, handoffMs: r.breakEvenHandoffMs! });
    expect(at.totalMs).toBeCloseTo(at.cpuOnlyMs, 9);
  });
});

describe('the CNN example', () => {
  it('runs as one partition with softmax left on the CPU', () => {
    const r = evaluate(cnn.ops, cnn.supported, p);
    expect(r.partitions).toBe(1);
    expect(r.handoffs).toBe(2);
  });
  it('splits into two partitions if the second depthwise conv is unsupported', () => {
    const s = [...cnn.supported];
    s[3] = false;
    const r = evaluate(cnn.ops, s, p);
    expect(r.partitions).toBe(2);
    expect(r.handoffs).toBe(4);
  });
  it('has no hand-offs and no break-even with nothing supported', () => {
    const r = evaluate(cnn.ops, cnn.ops.map(() => false), p);
    expect(r.partitions).toBe(0);
    expect(r.totalMs).toBeCloseTo(r.cpuOnlyMs, 9);
    expect(r.breakEvenHandoffMs).toBeNull();
  });
});
