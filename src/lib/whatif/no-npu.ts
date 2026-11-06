/**
 * What if the device has no neural accelerator? An EXAMPLE small-device latency budget.
 * Audio arrives in blocks; each block must be processed before the next one arrives.
 * The throughput figures below are generic example numbers chosen for the demo.
 * They are not measurements of, or claims about, any chip or product.
 */

export const RATE = 16000;
export const BLOCKS = 40;
/** Example effective speed, in million multiply-adds per second, for a small CPU-class core running the model. */
export const EXAMPLE_CPU_MMACS_PER_S = 250;
/** Example effective speed for an accelerator-class engine running the same model. */
export const EXAMPLE_NPU_MMACS_PER_S = 5000;
/** Example fixed cost per block to hand work to the accelerator and get the answer back, in milliseconds. */
export const EXAMPLE_NPU_HANDOFF_MS = 0.25;
/** Example fixed cost per block on the CPU (buffers, framing), in milliseconds. */
export const EXAMPLE_CPU_FIXED_MS = 0.1;
/** Example chance that a block runs slow (an interrupt, a cache miss) and how much slower it runs. */
export const SPIKE_CHANCE = 0.1;
export const SPIKE_FACTOR = 1.6;
export const JITTER = 0.08;

export type Kind = 'cpu' | 'npu';

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Time the block takes to arrive, which is also how long we have to process the previous one. */
export function deadlineMs(blockSamples: number, rate = RATE): number {
  return (blockSamples / rate) * 1000;
}

/** Typical (no slow blocks) time for one block of work, in milliseconds. */
export function baseMs(kind: Kind, mmacsPerBlock: number): number {
  return kind === 'cpu'
    ? EXAMPLE_CPU_FIXED_MS + (mmacsPerBlock / EXAMPLE_CPU_MMACS_PER_S) * 1000
    : EXAMPLE_NPU_HANDOFF_MS + (mmacsPerBlock / EXAMPLE_NPU_MMACS_PER_S) * 1000;
}

/** One seeded slowdown factor per block. The same factors are used for both kinds, so the comparison is fair. */
export function blockFactors(n = BLOCKS, seed = 31): number[] {
  const r = rng(seed);
  return Array.from({ length: n }, () => {
    const j = 1 + (r() * 2 - 1) * JITTER;
    const spike = r() < SPIKE_CHANCE ? SPIKE_FACTOR : 1;
    return j * spike;
  });
}

export type Run = {
  latencies: number[];
  missed: boolean[];
  missCount: number;
  meanMs: number;
  worstMs: number;
  deadlineMs: number;
  /** mean time used as a share of the deadline; above 100% the device cannot keep up even on a good block */
  load: number;
};

export function run(kind: Kind, mmacsPerBlock: number, blockSamples: number, n = BLOCKS, seed = 31): Run {
  const dl = deadlineMs(blockSamples);
  const base = baseMs(kind, mmacsPerBlock);
  const latencies = blockFactors(n, seed).map((f) => base * f);
  const missed = latencies.map((l) => l > dl);
  const meanMs = latencies.reduce((a, b) => a + b, 0) / n;
  return {
    latencies,
    missed,
    missCount: missed.filter(Boolean).length,
    meanMs,
    worstMs: Math.max(...latencies),
    deadlineMs: dl,
    load: meanMs / dl,
  };
}

/** Largest model (million multiply-adds per block) whose typical block still fits the deadline on this kind. */
export function largestModelThatFits(kind: Kind, blockSamples: number): number {
  const dl = deadlineMs(blockSamples);
  const fixed = kind === 'cpu' ? EXAMPLE_CPU_FIXED_MS : EXAMPLE_NPU_HANDOFF_MS;
  const speed = kind === 'cpu' ? EXAMPLE_CPU_MMACS_PER_S : EXAMPLE_NPU_MMACS_PER_S;
  return Math.max(0, ((dl - fixed) / 1000) * speed);
}
