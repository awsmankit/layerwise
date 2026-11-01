/*
 * A worked cost comparison of batch and online scoring. Every number is an EXAMPLE chosen for the lesson,
 * not a price list: compute only, on a generic core-hour price, with no storage, network or feature-store cost.
 *
 * Batch scores every entity once a day. Online scores the entities that actually show up, but its servers must be
 * sized for the busiest moment, with headroom, and never below a minimum number of cores.
 */

export type Scenario = {
  /** entities that could be scored (customers, items, devices) */
  entities: number;
  /** share of them that make at least one request in a day */
  activeFraction: number;
  requestsPerActive: number;
  /** CPU time per prediction in milliseconds */
  msPerPrediction: number;
  /** example price of one core for one hour, in dollars */
  coreHourUsd: number;
  /** busiest second as a multiple of the daily average rate */
  peakFactor: number;
  /** share of provisioned capacity you are willing to use at the peak */
  targetUtilisation: number;
  /** the smallest fleet you would run, in cores (two for redundancy) */
  minCores: number;
};

export const EXAMPLE: Scenario = {
  entities: 50_000_000,
  activeFraction: 0.01,
  requestsPerActive: 3,
  msPerPrediction: 20,
  coreHourUsd: 0.04,
  peakFactor: 5,
  targetUtilisation: 0.5,
  minCores: 2,
};

export type Costs = {
  batchPredictions: number;
  batchUsd: number;
  onlinePredictions: number;
  avgRps: number;
  peakRps: number;
  cores: number;
  onlineUsd: number;
  /** share of batch predictions for entities that never asked that day */
  batchWaste: number;
};

export function compare(s: Scenario): Costs {
  const secPerPred = s.msPerPrediction / 1000;
  const batchPredictions = s.entities;
  const batchUsd = (batchPredictions * secPerPred * s.coreHourUsd) / 3600;
  const onlinePredictions = s.entities * s.activeFraction * s.requestsPerActive;
  const avgRps = onlinePredictions / 86_400;
  const peakRps = avgRps * s.peakFactor;
  const cores = Math.max(s.minCores, Math.ceil((peakRps * secPerPred) / s.targetUtilisation));
  const onlineUsd = cores * 24 * s.coreHourUsd;
  return { batchPredictions, batchUsd, onlinePredictions, avgRps, peakRps, cores, onlineUsd, batchWaste: 1 - s.activeFraction };
}

/**
 * The active fraction at which the two cost the same, ignoring the minimum fleet and rounding up to whole cores.
 * Online work grows with activeFraction x requestsPerActive x peakFactor / targetUtilisation; batch does not grow with it.
 */
export function breakEvenActiveFraction(s: Scenario): number {
  return s.targetUtilisation / (s.requestsPerActive * s.peakFactor);
}

/** Sample size per group for a two-sided 5% test with 80% power (z = 1.959964 and 0.841621), comparing two rates. */
export function casesPerGroup(p1: number, p2: number): number {
  const pbar = (p1 + p2) / 2;
  return Math.ceil((2 * pbar * (1 - pbar) * (1.959964 + 0.841621) ** 2) / (p1 - p2) ** 2);
}
