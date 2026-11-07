/**
 * What if we retrieve far too many passages? A TOY question that needs three facts. A retriever returns 30 passages, best
 * first. Three of them are the facts (gold); the rest are distractors. The model reads the top k.
 *
 * Two simple, stated TOY rules turn that into a chance of a right answer. They are shaped like what the paper
 * "Lost in the Middle" reports in its abstract (information in the middle of a long input is used less well than at the
 * beginning or end), but the numbers are chosen for the demo, not measured:
 *   1. A fact in passage number r of k sits at relative position x = (r - 0.5) / k (near 0 = start, near 1 = end) is read with reliability
 *        U(x) = 0.6 + 0.4 * (2x - 1)^2      (about 1.0 at the very ends, 0.6 in the middle)
 *   2. Every extra passage in the context adds noise, so all reliabilities are multiplied by
 *        N(k) = 1 - 0.012 * (k - 1)
 * A fact that is not in the context is guessed with chance GUESS. The answer needs all three facts, so
 *   success(k) = product over the three facts of (in context ? U(x) * N(k) : GUESS).
 * Cost = tokens sent times an EXAMPLE price. Nothing here is a benchmark result.
 */

export const TOTAL = 30;
export const GOLD_RANKS = [1, 4, 7] as const;
export const TOKENS_PER_PASSAGE = 150;
export const OVERHEAD_TOKENS = 150; // instructions and the question
export const PRICE_PER_MILLION = 3; // example: dollars per million input tokens
export const GUESS = 0.2;
export const NOISE_PER_PASSAGE = 0.012;

const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

export function recall(k: number): number {
  return GOLD_RANKS.filter((r) => r <= k).length / GOLD_RANKS.length;
}

/** Reliability of reading a passage at the given rank when the context holds k passages. */
export function reliability(rank: number, k: number): number {
  const x = (rank - 0.5) / k;
  const u = 0.6 + 0.4 * (2 * x - 1) ** 2;
  return r6(u * (1 - NOISE_PER_PASSAGE * (k - 1)));
}

export type Fact = { rank: number; inContext: boolean; reliability: number };

export function facts(k: number): Fact[] {
  return GOLD_RANKS.map((rank) => {
    const inContext = rank <= k;
    return { rank, inContext, reliability: inContext ? reliability(rank, k) : GUESS };
  });
}

export function success(k: number): number {
  return r6(facts(k).reduce((p, f) => p * f.reliability, 1));
}

export function tokens(k: number): number {
  return OVERHEAD_TOKENS + k * TOKENS_PER_PASSAGE;
}

/** Dollars for one question at the example price. */
export function cost(k: number): number {
  return r6((tokens(k) * PRICE_PER_MILLION) / 1e6);
}

/** Dollars per correct answer: cost divided by the chance the answer is right. */
export function costPerCorrect(k: number): number {
  return r6(cost(k) / success(k));
}

/** The k with the highest success (the smallest k wins a tie). */
export function bestK(): number {
  let best = 1;
  for (let k = 2; k <= TOTAL; k++) if (success(k) > success(best)) best = k;
  return best;
}

/** The k with the lowest cost per correct answer. */
export function cheapestK(): number {
  let best = 1;
  for (let k = 2; k <= TOTAL; k++) if (costPerCorrect(k) < costPerCorrect(best)) best = k;
  return best;
}

export function isGold(rank: number): boolean {
  return (GOLD_RANKS as readonly number[]).includes(rank);
}

export const curve = () => Array.from({ length: TOTAL }, (_, i) => ({ k: i + 1, recall: recall(i + 1), success: success(i + 1), tokens: tokens(i + 1), cost: cost(i + 1) }));
