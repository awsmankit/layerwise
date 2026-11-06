/**
 * What if there is no prompt caching?
 *
 * A long shared prefix (system prompt, examples, a document) is sent again with every call. Without a cache
 * the model reads and bills all of it each time. With a cache, a hit reads the stored prefix at a discount,
 * and a miss pays a surcharge to write it. Price and multipliers are EXAMPLES, labelled on screen.
 */

export type Setup = { pricePerMTok: number; readMultiplier: number; writeMultiplier: number; uniqueTokens: number; calls: number };

export const example: Setup = {
  /** Example input price in dollars per million tokens. */
  pricePerMTok: 3,
  /** Example cached-read price as a share of the normal input price (a documented provider rate is 0.1 for most models). */
  readMultiplier: 0.1,
  /** Example cache-write price as a share of the normal input price (a documented 5-minute write rate is 1.25). */
  writeMultiplier: 1.25,
  /** Tokens that are new in each call (the user's question). */
  uniqueTokens: 500,
  calls: 1000,
};

const val = (s: Partial<Setup>, k: keyof Setup): number => s[k] ?? example[k];

/** Calls out of the total that read the prefix from the cache. */
export const hits = (calls: number, hitRate: number) => Math.round(calls * Math.min(1, Math.max(0, hitRate)));

/** Input tokens sent over all calls. The same with or without a cache: the prefix is resent either way. */
export function tokensSent(prefixTokens: number, s: Partial<Setup> = {}): number {
  return val(s, 'calls') * (prefixTokens + val(s, 'uniqueTokens'));
}

/** Tokens the model must process from scratch (not read from the cache). */
export function tokensFresh(prefixTokens: number, hitRate: number, cache: boolean, s: Partial<Setup> = {}): number {
  const calls = val(s, 'calls');
  const u = val(s, 'uniqueTokens');
  if (!cache) return calls * (prefixTokens + u);
  const h = hits(calls, hitRate);
  return (calls - h) * prefixTokens + calls * u;
}

/** Tokens read from the cache instead of being processed. */
export const tokensFromCache = (prefixTokens: number, hitRate: number, cache: boolean, s: Partial<Setup> = {}) =>
  cache ? hits(val(s, 'calls'), hitRate) * prefixTokens : 0;

/** Total input cost in dollars over all calls. */
export function inputCost(prefixTokens: number, hitRate: number, cache: boolean, s: Partial<Setup> = {}): number {
  const calls = val(s, 'calls');
  const p = val(s, 'pricePerMTok') / 1e6;
  const u = val(s, 'uniqueTokens');
  if (!cache) return calls * (prefixTokens + u) * p;
  const h = hits(calls, hitRate);
  const miss = calls - h;
  return (calls * u + h * prefixTokens * val(s, 'readMultiplier') + miss * prefixTokens * val(s, 'writeMultiplier')) * p;
}

/** Hit rate above which caching is cheaper than no caching: h*read + (1-h)*write = 1. */
export function breakEvenHitRate(s: Partial<Setup> = {}): number {
  const r = val(s, 'readMultiplier');
  const w = val(s, 'writeMultiplier');
  return (w - 1) / (w - r);
}

/** Which of 100 squares (each is calls/100 calls) are hits, spread evenly. */
export function hitPattern(hitRate: number, cells = 100): boolean[] {
  const target = Math.round(Math.min(1, Math.max(0, hitRate)) * cells);
  return Array.from({ length: cells }, (_, i) => Math.floor(((i + 1) * target) / cells) > Math.floor((i * target) / cells));
}
