/**
 * What if the server handles one request at a time?
 *
 * Decode (writing the reply) reads every weight, plus each active user's KV cache, from memory once
 * per step. That read is the slow part, so serving more users in the same step costs very little extra.
 * All hardware and price figures below are EXAMPLES, not measurements of any real product.
 */

export type Setup = { [K in 'paramsB' | 'bytesPerParam' | 'bandwidthGBs' | 'efficiency' | 'tflops' | 'pricePerHour' | 'memGB' | 'reserveFraction' | 'contextTokens' | 'kvBytesPerToken' | 'replyTokens']: number };

export const example: Setup = {
  /** Example model: 8 billion parameters stored in 16-bit numbers. */
  paramsB: 8,
  bytesPerParam: 2,
  /** Example GPU: memory bandwidth in GB/s, usable fraction of it, effective compute in TFLOP/s. */
  bandwidthGBs: 2000,
  efficiency: 0.65,
  tflops: 400,
  /** Example rental price in dollars per GPU hour. */
  pricePerHour: 2.5,
  /** Example memory for the GPU in GB, of which this share is kept for the runtime and slack. */
  memGB: 80,
  reserveFraction: 0.1,
  /** Example conversation length in tokens, and the 8B-class cache size per token (32 layers, 8 KV heads, 128 wide, 16-bit). */
  contextTokens: 2000,
  kvBytesPerToken: 2 * 32 * 8 * 128 * 2,
  /** Example reply length in tokens. */
  replyTokens: 200,
};

/** Batch sizes the slider offers. */
export const batchSizes = [1, 2, 4, 8, 16, 32, 64] as const;

export const weightsGB = (s: Setup = example) => s.paramsB * s.bytesPerParam;
export const kvPerUserGB = (s: Setup = example) => (s.kvBytesPerToken * s.contextTokens) / 1e9;

/** Seconds for one decode step that serves `batch` users together: the larger of the memory time and the arithmetic time. */
export function stepSeconds(batch: number, s: Setup = example): number {
  const memory = (weightsGB(s) + batch * kvPerUserGB(s)) / (s.bandwidthGBs * s.efficiency);
  const compute = (batch * 2 * s.paramsB * 1e9) / (s.tflops * 1e12);
  return Math.max(memory, compute);
}

/** Tokens per second across all users. */
export const totalTokS = (batch: number, s: Setup = example) => batch / stepSeconds(batch, s);
/** Tokens per second each user sees. */
export const perUserTokS = (batch: number, s: Setup = example) => 1 / stepSeconds(batch, s);

/** Dollars per million generated tokens at this batch size, keeping the GPU rented and busy. */
export const costPerMTok = (batch: number, s: Setup = example) => (s.pricePerHour / 3600 / totalTokS(batch, s)) * 1e6;

/** Most users whose caches fit next to the weights. */
export function maxBatch(s: Setup = example): number {
  const usable = s.memGB * (1 - s.reserveFraction);
  return Math.max(0, Math.floor((usable - weightsGB(s)) / kvPerUserGB(s)));
}

/**
 * Seconds until the LAST of `waiting` people has their whole reply.
 * Batched: everyone is served together. One at a time: each waits for all the replies before theirs.
 */
export function lastReplySeconds(waiting: number, batched: boolean, s: Setup = example): number {
  if (batched) return s.replyTokens * stepSeconds(waiting, s);
  return waiting * s.replyTokens * stepSeconds(1, s);
}

/** Tokens per second across everyone, in the chosen mode. */
export const modeTokS = (waiting: number, batched: boolean, s: Setup = example) => totalTokS(batched ? waiting : 1, s);
export const modeCost = (waiting: number, batched: boolean, s: Setup = example) => costPerMTok(batched ? waiting : 1, s);
