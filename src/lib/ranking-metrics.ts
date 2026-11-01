/** Ranking metrics for a list of results: precision@k, recall@k and DCG / NDCG@k. Pure functions, no DOM. */

export type Gain = 'linear' | 'exponential';

/** Gain of one result: the relevance grade itself, or 2^grade - 1 (the form used by many search systems). */
export function gainOf(rel: number, gain: Gain = 'linear'): number {
  return gain === 'exponential' ? 2 ** rel - 1 : rel;
}

/** Discounted cumulative gain of the first k results: the sum of gain / log2(rank + 1), rank starting at 1. */
export function dcg(rels: number[], k: number, gain: Gain = 'linear'): number {
  let s = 0;
  for (let i = 0; i < Math.min(k, rels.length); i++) s += gainOf(rels[i], gain) / Math.log2(i + 2);
  return s;
}

/** The best DCG@k those grades could reach: the same grades sorted from highest to lowest. */
export function idealDcg(rels: number[], k: number, gain: Gain = 'linear'): number {
  return dcg([...rels].sort((a, b) => b - a), k, gain);
}

/** DCG@k divided by the ideal DCG@k, so a perfect ordering scores 1. A list with nothing relevant scores 0. */
export function ndcg(rels: number[], k: number, gain: Gain = 'linear'): number {
  const ideal = idealDcg(rels, k, gain);
  return ideal === 0 ? 0 : dcg(rels, k, gain) / ideal;
}

/** Share of the first k results that are relevant (grade above the threshold). */
export function precisionAtK(rels: number[], k: number, threshold = 0): number {
  const n = Math.min(k, rels.length);
  if (k <= 0) return 0;
  let hit = 0;
  for (let i = 0; i < n; i++) if (rels[i] > threshold) hit++;
  return hit / k;
}

/** Share of all relevant items that appear in the first k results. totalRelevant counts relevant items anywhere, including ones never retrieved. */
export function recallAtK(rels: number[], k: number, totalRelevant: number, threshold = 0): number {
  if (totalRelevant <= 0) return 0;
  let hit = 0;
  for (let i = 0; i < Math.min(k, rels.length); i++) if (rels[i] > threshold) hit++;
  return hit / totalRelevant;
}
