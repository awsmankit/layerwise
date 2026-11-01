/*
 * Arithmetic for the "Real-time on a budget" lesson: the deadline a block of audio sets, a simplified
 * latency breakdown for a block-based pipeline, power from the inference rate, and a seeded generator of
 * invented per-run timings that shows why one benchmark number can mislead. Pure functions, no DOM.
 * Every timing the generators produce is made up for teaching: none is a measurement of any device.
 */

export type Rng = () => number;

/** A small seeded generator (mulberry32), so the same seed always draws the same numbers. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One standard-normal draw (Box-Muller). */
export function gaussian(rng: Rng): number {
  const u = Math.max(rng(), 1e-12);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ---------- blocks and deadlines ---------- */

/** How long one block of `block` samples lasts at `rate` samples a second, in milliseconds. This is the deadline. */
export const periodMs = (rate: number, block: number): number => (block / rate) * 1000;

/** Blocks (and so inferences, if the model runs once per block) per second. */
export const blocksPerSecond = (rate: number, block: number): number => rate / block;

export type PipelineShape = {
  /** Samples per second. */
  rate: number;
  /** Samples handed to the code at a time, which is also the hop between analysis windows. */
  block: number;
  /** Samples in one analysis window (for a frame-based model). Use the block size if there is no overlap. */
  window: number;
  /** Extra future frames the model waits for before it answers (a non-causal model). 0 for a causal one. */
  lookaheadFrames: number;
  /** Everything else in the path, in ms: converters, driver, wireless link. */
  otherMs: number;
};

export type LatencyParts = {
  /** Waiting for a block to fill. */
  fillMs: number;
  /** The slot in which the block is processed, before its output is played. */
  slotMs: number;
  /** Future samples the algorithm needs: the window overhang plus any look-ahead frames. */
  lookaheadMs: number;
  otherMs: number;
  totalMs: number;
};

/**
 * Worst-case delay from sound in to sound out for a simple double-buffered, block-based pipeline:
 * one block to fill, one block-long slot to process it (compute must fit inside the slot), the
 * algorithm's own look-ahead, plus other fixed delays. A deliberate simplification: real systems differ.
 * With an STFT of window N and hop H, an output sample is only complete N - H samples after its block
 * has arrived, which is where the window overhang comes from.
 */
export function latencyParts(p: PipelineShape): LatencyParts {
  const period = periodMs(p.rate, p.block);
  const overhang = Math.max(0, p.window - p.block);
  const lookaheadMs = ((overhang + p.lookaheadFrames * p.block) / p.rate) * 1000;
  const fillMs = period;
  const slotMs = period;
  return { fillMs, slotMs, lookaheadMs, otherMs: p.otherMs, totalMs: fillMs + slotMs + lookaheadMs + p.otherMs };
}

/* ---------- invented compute times ---------- */

export type ComputeModel = {
  /** Typical time for one inference, in ms. */
  meanMs: number;
  /** Spread of ordinary run-to-run variation, as the sigma of a log-normal (0.05 is about 5%). */
  jitter: number;
  /** Chance that a block hits something slow: an interrupt, a cache miss, a clock change. */
  spikeChance: number;
  /** How many times longer a slow block takes. */
  spikeFactor: number;
};

/** `n` made-up per-block compute times with the given model. Deterministic for a given seed. */
export function computeTimes(n: number, m: ComputeModel, seed = 1): Float64Array {
  const rng = mulberry32(seed);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let t = m.meanMs * Math.exp(m.jitter * gaussian(rng) - (m.jitter * m.jitter) / 2);
    if (rng() < m.spikeChance) t *= m.spikeFactor;
    out[i] = t;
  }
  return out;
}

/** The value at the given fraction (0 to 1) of the sorted data, by the nearest-rank method. */
export function percentile(values: ArrayLike<number>, fraction: number): number {
  const n = values.length;
  if (n === 0) return NaN;
  const sorted = Array.from(values).sort((a, b) => a - b);
  const rank = Math.min(n, Math.max(1, Math.ceil(fraction * n)));
  return sorted[rank - 1];
}

export const mean = (values: ArrayLike<number>): number => {
  let s = 0;
  for (let i = 0; i < values.length; i++) s += values[i];
  return values.length ? s / values.length : NaN;
};

export type DeadlineReport = {
  periodMs: number;
  blocks: number;
  /** Blocks whose compute took longer than the period: each one is an audible glitch in a real-time path. */
  misses: number;
  missRate: number;
  p50: number;
  p99: number;
  p999: number;
  max: number;
  mean: number;
  /** Average compute divided by the period: the share of the processor this model uses. */
  load: number;
};

export function deadlineReport(times: ArrayLike<number>, period: number): DeadlineReport {
  let misses = 0;
  let maxT = 0;
  for (let i = 0; i < times.length; i++) {
    if (times[i] > period) misses++;
    if (times[i] > maxT) maxT = times[i];
  }
  const avg = mean(times);
  return {
    periodMs: period,
    blocks: times.length,
    misses,
    missRate: times.length ? misses / times.length : 0,
    p50: percentile(times, 0.5),
    p99: percentile(times, 0.99),
    p999: percentile(times, 0.999),
    max: maxT,
    mean: avg,
    load: avg / period,
  };
}

/* ---------- power ---------- */

/** Average power in milliwatts for a model run once per block: idle power plus inferences per second times energy each. */
export function averagePowerMw(rate: number, block: number, energyPerInferenceUj: number, idleMw: number): number {
  // microjoules per second = microwatts, so divide by 1000 for milliwatts
  return idleMw + (blocksPerSecond(rate, block) * energyPerInferenceUj) / 1000;
}

/** Hours a battery lasts at a constant power: capacity in milliwatt-hours divided by milliwatts. */
export const batteryHours = (capacityMwh: number, powerMw: number): number => capacityMwh / powerMw;

/* ---------- invented benchmark runs ---------- */

export type BenchmarkModel = {
  /** Latency once everything has settled, in ms. */
  steadyMs: number;
  /** How many runs the start-up slowness lasts (lazy set-up, cold caches, a low clock). */
  warmupRuns: number;
  /** How many times slower the very first run is. */
  warmupFactor: number;
  /** The run at which the chip starts to heat up and slow down. */
  throttleStart: number;
  /** Runs over which the slowdown builds up. */
  throttleRamp: number;
  /** How many times slower the chip is once it has throttled. */
  throttleFactor: number;
  /** Ordinary run-to-run variation (log-normal sigma). */
  noise: number;
};

/** An invented series of per-run latencies with a warm-up phase and a later thermal slowdown. */
export function benchmarkSeries(runs: number, m: BenchmarkModel, seed = 3): Float64Array {
  const rng = mulberry32(seed);
  const out = new Float64Array(runs);
  const tau = Math.max(1, m.warmupRuns / 3);
  for (let i = 0; i < runs; i++) {
    const warm = 1 + (m.warmupFactor - 1) * Math.exp(-i / tau);
    const x = Math.min(1, Math.max(0, (i - m.throttleStart) / Math.max(1, m.throttleRamp)));
    const hot = 1 + (m.throttleFactor - 1) * (x * x * (3 - 2 * x));
    let t = m.steadyMs * warm * hot * Math.exp(m.noise * gaussian(rng) - (m.noise * m.noise) / 2);
    if (rng() < 0.01) t *= 2.5;
    out[i] = t;
  }
  return out;
}

export type Stat = 'mean' | 'median' | 'p99' | 'max';

/** One summary statistic over runs [skip, skip + count). */
export function summarise(series: ArrayLike<number>, skip: number, count: number, stat: Stat): number {
  const part = Array.from(series).slice(skip, skip + count);
  if (!part.length) return NaN;
  switch (stat) {
    case 'mean':
      return mean(part);
    case 'median':
      return percentile(part, 0.5);
    case 'p99':
      return percentile(part, 0.99);
    case 'max':
      return Math.max(...part);
  }
}
