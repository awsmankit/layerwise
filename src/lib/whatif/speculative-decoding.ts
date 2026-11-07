/**
 * What if the big model checks every token itself? Speculative decoding (Leviathan, Kalman and Matias, 2023):
 * a small draft model proposes gamma tokens, the big model checks all of them in one pass, keeps the ones it agrees
 * with (until the first it rejects) and always adds one token of its own. So one big-model pass writes between 1 and
 * gamma + 1 tokens, and the text has the same distribution as the big model alone.
 * The paper's simplifying assumption: each draft token is accepted with the same probability alpha, independently.
 * Under it, the expected number of tokens per big-model pass is (1 - alpha^(gamma+1)) / (1 - alpha),
 * and the expected speed-up in wall time is that divided by (gamma * c + 1), where c is the cost of one draft run
 * compared with one big-model run (Theorem 3.8).
 */

export const MAX_GAMMA = 8;

const round6 = (x: number) => Math.round(x * 1e6) / 1e6;

/** Expected tokens written per big-model pass: 1 + alpha + alpha^2 + ... + alpha^gamma. */
export function expectedTokens(alpha: number, gamma: number): number {
  if (alpha >= 1) return gamma + 1;
  if (alpha <= 0) return 1;
  return round6((1 - Math.pow(alpha, gamma + 1)) / (1 - alpha));
}

/** Expected wall-time speed-up against the big model alone (Theorem 3.8), with draft cost coefficient c. */
export function speedup(alpha: number, gamma: number, c: number): number {
  return round6(expectedTokens(alpha, gamma) / (gamma * c + 1));
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SIM_ROUNDS = 5000;

/** A fixed grid of random draws: draws[r][p] decides whether the draft token at position p in pass r is accepted (accepted when below alpha). */
const draws: number[][] = (() => {
  const rnd = mulberry32(20221130);
  return Array.from({ length: SIM_ROUNDS }, () => Array.from({ length: MAX_GAMMA }, () => Math.round(rnd() * 1e6) / 1e6));
})();

/** In pass r, how many draft tokens are accepted before the first rejection (0 to gamma). */
export function acceptedIn(r: number, alpha: number, gamma: number): number {
  let n = 0;
  while (n < gamma && draws[r][n] < alpha) n++;
  return n;
}

export type Round = { accepted: number; gamma: number; rejected: boolean; tokens: number };

/** The first `count` passes of the simulation, for drawing. Tokens written = accepted + 1 (the big model's own token). */
export function rounds(alpha: number, gamma: number, count: number): Round[] {
  return Array.from({ length: count }, (_, r) => {
    const accepted = acceptedIn(r, alpha, gamma);
    return { accepted, gamma, rejected: accepted < gamma, tokens: accepted + 1 };
  });
}

/** Average tokens per big-model pass over the whole simulated set. */
export function simulatedMean(alpha: number, gamma: number): number {
  let total = 0;
  for (let r = 0; r < SIM_ROUNDS; r++) total += acceptedIn(r, alpha, gamma) + 1;
  return round6(total / SIM_ROUNDS);
}

/** Big-model passes needed to write n tokens: n alone, about n / expected with drafting. */
export function passesFor(n: number, alpha: number, gamma: number, speculative: boolean): number {
  return speculative ? round6(n / expectedTokens(alpha, gamma)) : n;
}
