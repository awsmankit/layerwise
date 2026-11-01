/**
 * A weighted scorecard for choosing between models on your own task. The three candidate "tiers" and all their numbers
 * are INVENTED examples, not real products or measurements. The method is what matters: filter on hard limits first,
 * then weigh quality, cost and latency by what your task needs, and check how fragile the pick is.
 */

export interface Candidate {
  id: string;
  name: string;
  /** Score on your own eval set, 0 to 100 (example). */
  quality: number;
  /** Dollars per 1,000 requests (example). */
  costPer1k: number;
  /** Median seconds to a complete answer (example). */
  latencyS: number;
}

export const EXAMPLE_MODELS: Candidate[] = [
  { id: 'large', name: 'Model L (large tier)', quality: 92, costPer1k: 12, latencyS: 2.4 },
  { id: 'mid', name: 'Model M (mid tier)', quality: 88, costPer1k: 3, latencyS: 1.1 },
  { id: 'small', name: 'Model S (small tier)', quality: 79, costPer1k: 0.4, latencyS: 0.4 },
];

export interface Weights {
  quality: number;
  cost: number;
  latency: number;
}

export type Criterion = keyof Weights;

/** Min-max scale to 0..1 across the candidates. If every value is equal, everyone gets 1. */
export function scale(values: number[], higherIsBetter: boolean): number[] {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  if (hi === lo) return values.map(() => 1);
  return values.map((v) => (higherIsBetter ? (v - lo) / (hi - lo) : (hi - v) / (hi - lo)));
}

export interface Scored {
  id: string;
  name: string;
  /** Per-criterion scores, 0 to 1. */
  parts: Weights;
  /** Weighted score, 0 to 100. Zero total weight gives everyone 0. */
  score: number;
  /** Dropped because it is below the minimum quality. */
  excluded: boolean;
}

/**
 * Score the candidates. Models below `minQuality` are excluded before weighing (a hard limit, not a trade-off), and
 * the 0..1 scaling is done among the models that remain.
 */
export function scoreAll(cands: Candidate[], w: Weights, minQuality = 0): Scored[] {
  const kept = cands.filter((c) => c.quality >= minQuality);
  const q = scale(kept.map((c) => c.quality), true);
  const c$ = scale(kept.map((c) => c.costPer1k), false);
  const l = scale(kept.map((c) => c.latencyS), false);
  const total = w.quality + w.cost + w.latency;
  const byId = new Map<string, Scored>();
  kept.forEach((c, i) => {
    const parts = { quality: q[i], cost: c$[i], latency: l[i] };
    const raw = w.quality * parts.quality + w.cost * parts.cost + w.latency * parts.latency;
    byId.set(c.id, { id: c.id, name: c.name, parts, score: total > 0 ? (100 * raw) / total : 0, excluded: false });
  });
  return cands.map((c) => byId.get(c.id) ?? { id: c.id, name: c.name, parts: { quality: 0, cost: 0, latency: 0 }, score: 0, excluded: true });
}

/** The highest-scoring candidate that was not excluded, or null if all were. Ties go to the earlier candidate. */
export function pick(cands: Candidate[], w: Weights, minQuality = 0): Scored | null {
  let best: Scored | null = null;
  for (const s of scoreAll(cands, w, minQuality)) if (!s.excluded && (best === null || s.score > best.score)) best = s;
  return best;
}

export interface Flip {
  /** Weight at which the pick first changes (the first sampled value with a different pick). */
  at: number;
  from: string;
  to: string;
}

/**
 * Sweep one criterion's weight from 0 to `max` in steps, keeping the other weights fixed, and list where the pick
 * changes. Shows how fragile a choice is to the weights you happened to type in.
 */
export function flips(cands: Candidate[], w: Weights, key: Criterion, minQuality = 0, max = 100, step = 1): Flip[] {
  const out: Flip[] = [];
  let prev: string | null = null;
  for (let v = 0; v <= max; v += step) {
    const p = pick(cands, { ...w, [key]: v }, minQuality);
    const id = p ? p.id : null;
    if (prev !== null && id !== null && id !== prev) out.push({ at: v, from: prev, to: id });
    if (id !== null) prev = id;
  }
  return out;
}

export const PRESETS: { id: string; label: string; w: Weights; note: string }[] = [
  { id: 'quality', label: 'Quality first', w: { quality: 70, cost: 15, latency: 15 }, note: 'High-stakes drafting where a better answer is worth the price.' },
  { id: 'balanced', label: 'Balanced', w: { quality: 40, cost: 30, latency: 30 }, note: 'A general assistant inside a product.' },
  { id: 'bulk', label: 'Bulk and cheap', w: { quality: 25, cost: 65, latency: 10 }, note: 'Labelling a million records overnight.' },
  { id: 'live', label: 'Live and fast', w: { quality: 25, cost: 10, latency: 65 }, note: 'Autocomplete or a voice assistant, where every second counts.' },
];
