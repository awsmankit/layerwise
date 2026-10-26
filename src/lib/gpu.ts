import type { Gpu } from '../data/gpus';
import {
  models,
  weightPrecisions,
  kvPrecisions,
  RESERVE_FRACTION,
  RUNTIME_GB,
  type ModelId,
  type WeightPrecision,
  type KvPrecision,
} from '../games/fitmodel';

/**
 * Back-of-envelope LLM serving estimates.
 *
 * Decode reads every weight, plus every active sequence's KV cache, from
 * memory once per generated token step. Per-user tokens per second is
 * therefore about
 *
 *     effective bandwidth / (weight bytes + users x KV bytes per user)
 *
 * which is an upper bound set by memory, not by arithmetic. Real engines
 * reach some fraction of it, so a single `efficiency` factor stands in for
 * kernel quality, scheduling and overheads.
 */

/** Share of ideal bandwidth scaling kept when a model is split across several devices. */
export const PARALLEL_EFFICIENCY: Record<number, number> = { 1: 1, 2: 0.9, 4: 0.8, 8: 0.7 };
export const DEFAULT_EFFICIENCY = 0.65;

export type Estimate = {
  weightsGB: number;
  kvPerUserGB: number;
  capacityGB: number;
  usedGB: number;
  fits: boolean;
  /** Most concurrent users the memory allows at this context length (0 if the weights alone do not fit). */
  maxUsers: number;
  /** Tokens per second each user sees during decode. 0 when it does not fit. */
  perUserTokS: number;
  /** Tokens per second across all users. */
  totalTokS: number;
  /** Fewest devices of this kind on which the weights and the cache would fit. */
  devicesNeeded: number;
};

export function usableGB(gpu: Gpu, count: number): number {
  return gpu.memGB * count * (1 - RESERVE_FRACTION) - RUNTIME_GB * count;
}

export function estimate(
  gpu: Gpu,
  count: number,
  model: ModelId,
  weights: WeightPrecision,
  kv: KvPrecision,
  ctx: number,
  users: number,
  efficiency = DEFAULT_EFFICIENCY,
): Estimate {
  const m = models[model];
  const weightsGB = m.paramsB * weightPrecisions[weights].bytes;
  const kvBytesPerToken = 2 * m.layers * m.kvHeads * m.headDim * kvPrecisions[kv].bytes;
  const kvPerUserGB = (kvBytesPerToken * ctx) / 1e9;

  const capacityGB = usableGB(gpu, count);
  const usedGB = weightsGB + users * kvPerUserGB;
  const fits = usedGB <= capacityGB;
  const maxUsers = capacityGB <= weightsGB ? 0 : Math.floor((capacityGB - weightsGB) / kvPerUserGB);

  const perDevice = gpu.memGB * (1 - RESERVE_FRACTION) - RUNTIME_GB;
  const devicesNeeded = perDevice <= 0 ? Infinity : Math.max(1, Math.ceil(usedGB / perDevice));

  const parallel = PARALLEL_EFFICIENCY[count] ?? 0.7;
  const effectiveBW = gpu.bwGBs * count * parallel * efficiency;
  const perUserTokS = fits ? effectiveBW / usedGB : 0;
  const totalTokS = fits ? perUserTokS * users : 0;

  return { weightsGB, kvPerUserGB, capacityGB, usedGB, fits, maxUsers, perUserTokS, totalTokS, devicesNeeded };
}
