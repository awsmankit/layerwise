import { describe, expect, it } from 'vitest';
import {
  averagePowerMw,
  batteryHours,
  benchmarkSeries,
  blocksPerSecond,
  computeTimes,
  deadlineReport,
  latencyParts,
  mean,
  mulberry32,
  percentile,
  periodMs,
  summarise,
  type BenchmarkModel,
} from './realtime-budget';

describe('block period', () => {
  it('matches the 256-sample example in Ross Bencina\'s article (about 5.8 ms at 44.1 kHz)', () => {
    expect(periodMs(44100, 256)).toBeCloseTo(5.805, 3);
  });
  it('is 10 ms for 160 samples at 16 kHz and 2 ms for 32 samples', () => {
    expect(periodMs(16000, 160)).toBe(10);
    expect(periodMs(16000, 32)).toBe(2);
  });
  it('counts blocks per second', () => {
    expect(blocksPerSecond(16000, 160)).toBe(100);
    expect(blocksPerSecond(16000, 32)).toBe(500);
  });
});

describe('latency breakdown', () => {
  it('adds the fill block, the processing slot, the window overhang and other delays', () => {
    const l = latencyParts({ rate: 16000, block: 160, window: 400, lookaheadFrames: 0, otherMs: 0 });
    expect(l.fillMs).toBe(10);
    expect(l.slotMs).toBe(10);
    expect(l.lookaheadMs).toBeCloseTo(15, 9); // (400 - 160) / 16000 s
    expect(l.totalMs).toBeCloseTo(35, 9);
  });
  it('shrinks with small blocks and windows', () => {
    const l = latencyParts({ rate: 16000, block: 32, window: 64, lookaheadFrames: 0, otherMs: 0 });
    expect(l.totalMs).toBeCloseTo(6, 9);
  });
  it('charges for look-ahead frames and other delays', () => {
    const l = latencyParts({ rate: 16000, block: 160, window: 160, lookaheadFrames: 2, otherMs: 1.5 });
    expect(l.lookaheadMs).toBeCloseTo(20, 9);
    expect(l.totalMs).toBeCloseTo(10 + 10 + 20 + 1.5, 9);
  });
  it('reproduces the rows of the table in the lesson', () => {
    const row = (rate: number, block: number, window: number, look: number) => latencyParts({ rate, block, window, lookaheadFrames: look, otherMs: 0 });
    expect(row(16000, 160, 160, 0).totalMs).toBeCloseTo(20, 9);
    expect(row(48000, 128, 128, 0).totalMs).toBeCloseTo(5.3333, 4);
    expect(periodMs(48000, 128)).toBeCloseTo(2.6667, 4); // one 128-frame AudioWorklet block at 48 kHz
    expect(row(16000, 160, 400, 2).totalMs).toBeCloseTo(55, 9);
  });
  it('has no overhang when the window is no longer than the block', () => {
    const l = latencyParts({ rate: 16000, block: 160, window: 100, lookaheadFrames: 0, otherMs: 0 });
    expect(l.lookaheadMs).toBe(0);
  });
});

describe('percentile and deadlines', () => {
  it('uses the nearest-rank method', () => {
    const v = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    expect(percentile(v, 0.5)).toBe(5);
    expect(percentile(v, 0.9)).toBe(9);
    expect(percentile(v, 0.99)).toBe(10);
    expect(percentile(v, 0)).toBe(1);
    expect(percentile([], 0.5)).toBeNaN();
  });
  it('counts the blocks that overrun the period', () => {
    const r = deadlineReport([1, 1, 1, 3], 2);
    expect(r.misses).toBe(1);
    expect(r.missRate).toBe(0.25);
    expect(r.max).toBe(3);
    expect(r.mean).toBe(1.5);
    expect(r.load).toBe(0.75);
  });
  it('does not count a block that takes exactly the period', () => {
    expect(deadlineReport([2, 2, 2], 2).misses).toBe(0);
  });
});

describe('invented compute times', () => {
  it('are repeatable for a seed and differ between seeds', () => {
    const m = { meanMs: 1, jitter: 0.05, spikeChance: 0.01, spikeFactor: 4 };
    const a = computeTimes(500, m, 5);
    const b = computeTimes(500, m, 5);
    const c = computeTimes(500, m, 6);
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(Array.from(a)).not.toEqual(Array.from(c));
  });
  it('average close to the requested mean when spikes are rare', () => {
    const t = computeTimes(20000, { meanMs: 2, jitter: 0.05, spikeChance: 0, spikeFactor: 1 }, 2);
    expect(mean(t)).toBeGreaterThan(1.98);
    expect(mean(t)).toBeLessThan(2.02);
  });
  it('produce deadline misses only through spikes when the mean sits well inside the period', () => {
    const calm = deadlineReport(computeTimes(5000, { meanMs: 1, jitter: 0.05, spikeChance: 0, spikeFactor: 1 }, 4), 2);
    expect(calm.misses).toBe(0);
    const spiky = deadlineReport(computeTimes(5000, { meanMs: 1, jitter: 0.05, spikeChance: 0.02, spikeFactor: 4 }, 4), 2);
    expect(spiky.misses).toBeGreaterThan(40);
    expect(spiky.p50).toBeLessThan(2);
    expect(spiky.max).toBeGreaterThan(2);
  });
});

describe('power', () => {
  it('multiplies the inference rate by the energy per inference', () => {
    // 100 inferences a second at 50 microjoules each is 5000 microwatts = 5 mW, plus 1 mW idle
    expect(averagePowerMw(16000, 160, 50, 1)).toBeCloseTo(6, 9);
  });
  it('doubles the active power when the block is halved', () => {
    expect(averagePowerMw(16000, 80, 50, 0)).toBeCloseTo(10, 9);
  });
  it('turns a battery and a power into hours', () => {
    expect(batteryHours(100, 5)).toBe(20);
  });
});

describe('invented benchmark runs', () => {
  const model: BenchmarkModel = { steadyMs: 10, warmupRuns: 10, warmupFactor: 5, throttleStart: 200, throttleRamp: 100, throttleFactor: 1.5, noise: 0.03 };
  const s = benchmarkSeries(600, model, 3);
  it('is repeatable', () => {
    expect(Array.from(benchmarkSeries(600, model, 3))).toEqual(Array.from(s));
  });
  it('starts slow, settles, then slows again once hot', () => {
    expect(s[0]).toBeGreaterThan(30);
    const settled = summarise(s, 30, 100, 'median');
    const hot = summarise(s, 400, 200, 'median');
    expect(settled).toBeGreaterThan(9.5);
    expect(settled).toBeLessThan(10.5);
    expect(hot).toBeGreaterThan(14);
    expect(hot).toBeLessThan(16);
  });
  it('lets the choice of runs and statistic move the answer a long way', () => {
    const first = summarise(s, 0, 10, 'mean');
    const early = summarise(s, 30, 50, 'median');
    const late = summarise(s, 400, 200, 'p99');
    expect(first).toBeGreaterThan(2 * early);
    expect(late).toBeGreaterThan(1.4 * early);
  });
  it('summarises every statistic', () => {
    const v = [1, 2, 3, 4, 100];
    expect(summarise(v, 0, 5, 'mean')).toBe(22);
    expect(summarise(v, 0, 5, 'median')).toBe(3);
    expect(summarise(v, 0, 5, 'p99')).toBe(100);
    expect(summarise(v, 0, 5, 'max')).toBe(100);
    expect(summarise(v, 10, 5, 'max')).toBeNaN();
  });
});

describe('generator', () => {
  it('stays in [0, 1)', () => {
    const r = mulberry32(9);
    for (let i = 0; i < 1000; i++) {
      const x = r();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});
