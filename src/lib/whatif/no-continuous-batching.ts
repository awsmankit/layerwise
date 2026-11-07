/**
 * What if the server waits for the whole batch to finish?
 *
 * A server has a fixed number of slots, each able to write one reply at a time, one token per step.
 * Static batching fills every slot, then waits until the longest reply in the group is done before it
 * returns any of them or starts new ones. Continuous batching hands a slot to the next waiting request at
 * the very next step after its reply ends. Reply lengths are a seeded, deterministic EXAMPLE mix of short and
 * long replies. Simplifications: every step takes the same time, prompt reading is ignored, and memory for the
 * KV caches is assumed to be there for every slot.
 */

export const config = {
  /** Slots, that is, replies written at the same time. */
  slots: 8,
  /** Requests already waiting when the run starts. */
  requests: 40,
  /** Example: seconds per step of the whole batch. Memory-bound decode takes about the same time at any batch size here. */
  stepSeconds: 0.03,
  shortest: 8,
  seed: 5,
};

export type Config = typeof config;
export type Mode = 'static' | 'continuous';

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Reply lengths in tokens: `shortest` plus a skewed share of the room up to `longest`.
 * Squaring a uniform number makes most replies short and a few long, like real chat traffic.
 */
export function replyLengths(longest: number, c: Config = config): number[] {
  const rand = rng(c.seed);
  return Array.from({ length: c.requests }, () => {
    const r = rand();
    return c.shortest + Math.floor(r * r * (longest - c.shortest));
  });
}

export type Block = {
  request: number;
  slot: number;
  /** Step at which the reply starts being written, and the step after its last token. */
  start: number;
  end: number;
  /** Step at which the person gets the reply. Equal to `end` unless the reply is held back. */
  released: number;
};

/** Static batching: groups of `slots` requests in order; the group ends when its longest reply ends. */
export function scheduleStatic(lengths: number[], c: Config = config): Block[] {
  const blocks: Block[] = [];
  let t = 0;
  for (let g = 0; g < lengths.length; g += c.slots) {
    const group = lengths.slice(g, g + c.slots);
    const stop = t + Math.max(...group);
    group.forEach((len, k) => blocks.push({ request: g + k, slot: k, start: t, end: t + len, released: stop }));
    t = stop;
  }
  return blocks;
}

/** Continuous batching: the next waiting request takes whichever slot frees up first. */
export function scheduleContinuous(lengths: number[], c: Config = config): Block[] {
  const free = Array.from({ length: c.slots }, () => 0);
  return lengths.map((len, request) => {
    let slot = 0;
    for (let k = 1; k < free.length; k++) if (free[k] < free[slot]) slot = k;
    const start = free[slot];
    free[slot] = start + len;
    return { request, slot, start, end: start + len, released: start + len };
  });
}

export const schedule = (mode: Mode, lengths: number[], c: Config = config) => (mode === 'static' ? scheduleStatic(lengths, c) : scheduleContinuous(lengths, c));

export type Summary = {
  /** Steps until the last reply is written (and released). */
  steps: number;
  tokens: number;
  /** Tokens written as a share of all slot-steps: slots x steps. */
  utilisation: number;
  /** Slot-steps that did no useful work, including the wait for the longest reply. */
  idleSlotSteps: number;
  tokensPerSecond: number;
  /** Average seconds from the start until a person gets their reply. */
  meanReplySeconds: number;
  /** Average steps a finished reply sat held back. */
  meanHeldSteps: number;
};

export function summarise(blocks: Block[], c: Config = config): Summary {
  const steps = Math.max(...blocks.map((b) => b.released));
  const tokens = blocks.reduce((a, b) => a + (b.end - b.start), 0);
  const n = blocks.length;
  return {
    steps,
    tokens,
    utilisation: tokens / (c.slots * steps),
    idleSlotSteps: c.slots * steps - tokens,
    tokensPerSecond: tokens / (steps * c.stepSeconds),
    meanReplySeconds: (blocks.reduce((a, b) => a + b.released, 0) / n) * c.stepSeconds,
    meanHeldSteps: blocks.reduce((a, b) => a + (b.released - b.end), 0) / n,
  };
}

/** Number of slots doing useful work at a step (a reply that has started and not yet ended). */
export const busySlots = (blocks: Block[], step: number) => blocks.filter((b) => b.start <= step && step < b.end).length;

export const longestChoices = [40, 100, 200, 300, 400] as const;
