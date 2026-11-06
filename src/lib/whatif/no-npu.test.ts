import { describe, expect, it } from 'vitest';
import { EXAMPLE_CPU_MMACS_PER_S, baseMs, blockFactors, deadlineMs, largestModelThatFits, run } from './no-npu';

describe('no accelerator what-if (example numbers)', () => {
  it('a block of 128 samples at 16 kHz is an 8 ms deadline', () => {
    expect(deadlineMs(128)).toBe(8);
    expect(deadlineMs(64)).toBe(4);
    expect(deadlineMs(256)).toBe(16);
  });
  it('hand-checked base times for the example hardware', () => {
    // CPU: 0.1 ms + 1.6 M / 250 M per s = 0.1 + 6.4 = 6.5 ms
    expect(baseMs('cpu', 1.6)).toBeCloseTo(6.5, 10);
    // NPU: 0.25 ms + 1.6 / 5000 s = 0.25 + 0.32 = 0.57 ms
    expect(baseMs('npu', 1.6)).toBeCloseTo(0.57, 10);
    expect(EXAMPLE_CPU_MMACS_PER_S).toBe(250);
  });
  it('is deterministic and uses the same slow blocks for both kinds', () => {
    expect(blockFactors()).toEqual(blockFactors());
    const cpu = run('cpu', 1.6, 128);
    const npu = run('npu', 1.6, 128);
    cpu.latencies.forEach((l, i) => expect(l / baseMs('cpu', 1.6)).toBeCloseTo(npu.latencies[i] / baseMs('npu', 1.6), 9));
  });
  it('the default model misses some deadlines on the CPU and none on the accelerator', () => {
    const cpu = run('cpu', 1.6, 128);
    const npu = run('npu', 1.6, 128);
    expect(cpu.missCount).toBeGreaterThan(0);
    expect(cpu.missCount).toBeLessThan(cpu.latencies.length);
    expect(npu.missCount).toBe(0);
    expect(cpu.worstMs).toBeGreaterThan(cpu.deadlineMs);
  });
  it('a model that is too big misses every block on the CPU, even the good ones', () => {
    const cpu = run('cpu', 3, 128);
    expect(cpu.missCount).toBe(40);
    expect(cpu.load).toBeGreaterThan(1);
  });
  it('misses grow as the model grows, and shrink as the block grows', () => {
    const counts = [0.4, 1.0, 1.6, 2.2, 3.0].map((m) => run('cpu', m, 128).missCount);
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
    expect(run('cpu', 1.6, 64).missCount).toBeGreaterThanOrEqual(run('cpu', 1.6, 128).missCount);
    expect(run('cpu', 1.6, 256).missCount).toBeLessThanOrEqual(run('cpu', 1.6, 128).missCount);
  });
  it('the largest model that fits on the CPU for an 8 ms block is about 1.98 million multiply-adds', () => {
    // (8 - 0.1) ms * 250 M per s = 1.975
    expect(largestModelThatFits('cpu', 128)).toBeCloseTo(1.975, 6);
    expect(largestModelThatFits('npu', 128)).toBeGreaterThan(largestModelThatFits('cpu', 128) * 10);
  });
});
