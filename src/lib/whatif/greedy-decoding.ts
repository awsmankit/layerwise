/**
 * What if the model always picks the most likely token? A toy next-token table (a "bigram" table: the next word
 * depends only on the last word). The probabilities below are invented for teaching and are NOT from any real model.
 * Greedy decoding always takes the top entry. Sampling reshapes the probabilities with a temperature, keeps only the
 * smallest set of tokens whose probabilities add up to top-p, and draws one with a seeded random number generator.
 */

export type Dist = Record<string, number>;

/** Toy table: P(next token | last token). Each row adds up to 1. Invented numbers, labelled as a toy on screen. */
export const table: Record<string, Dist> = {
  the: { cat: 0.3, dog: 0.28, mat: 0.22, park: 0.2 },
  a: { cat: 0.4, dog: 0.35, mat: 0.25 },
  cat: { sat: 0.5, ran: 0.3, and: 0.2 },
  dog: { ran: 0.45, sat: 0.4, and: 0.15 },
  sat: { on: 0.8, '.': 0.1, and: 0.1 },
  ran: { to: 0.7, on: 0.2, '.': 0.1 },
  on: { the: 0.7, a: 0.3 },
  to: { the: 0.8, a: 0.2 },
  mat: { '.': 0.5, and: 0.3, the: 0.2 },
  park: { '.': 0.5, and: 0.3, the: 0.2 },
  and: { the: 0.5, a: 0.3, ran: 0.2 },
  '.': { the: 0.6, a: 0.4 },
};

export const START = 'the';
export const LENGTH = 24;
export const vocabSize = Object.keys(table).length;

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The most likely next token. Ties go to the first listed. */
export function top(d: Dist): string {
  let best = '';
  let bp = -1;
  for (const [k, p] of Object.entries(d)) {
    if (p > bp) {
      best = k;
      bp = p;
    }
  }
  return best;
}

/** Temperature: p^(1/T), renormalised. Below 1 it sharpens (leans to the top), above 1 it flattens. */
export function withTemperature(d: Dist, t: number): Dist {
  const raw = Object.entries(d).map(([k, p]) => [k, Math.pow(p, 1 / t)] as const);
  const total = raw.reduce((s, [, x]) => s + x, 0);
  return Object.fromEntries(raw.map(([k, x]) => [k, x / total]));
}

/** Top-p (nucleus): keep the smallest group of most likely tokens whose probabilities add up to at least p, then renormalise. */
export function withTopP(d: Dist, p: number): Dist {
  const sorted = Object.entries(d).sort((a, b) => b[1] - a[1]);
  const kept: [string, number][] = [];
  let cum = 0;
  for (const [k, x] of sorted) {
    kept.push([k, x]);
    cum += x;
    if (cum >= p - 1e-12) break;
  }
  const total = kept.reduce((s, [, x]) => s + x, 0);
  return Object.fromEntries(kept.map(([k, x]) => [k, x / total]));
}

/** The distribution the sampler really draws from: temperature first, then top-p. */
export function sampler(d: Dist, temperature: number, topP: number): Dist {
  return withTopP(withTemperature(d, temperature), topP);
}

function draw(d: Dist, u: number): string {
  let cum = 0;
  let last = '';
  for (const [k, p] of Object.entries(d)) {
    cum += p;
    last = k;
    if (u < cum) return k;
  }
  return last;
}

/** Writes `length` tokens after START. mode 'greedy' ignores the seed. */
export function generate(mode: 'greedy' | 'sample', opts: { temperature: number; topP: number; seed: number; length?: number } = { temperature: 1, topP: 1, seed: 1 }): string[] {
  const length = opts.length ?? LENGTH;
  const rnd = mulberry32(opts.seed);
  const out: string[] = [];
  let last = START;
  for (let i = 0; i < length; i++) {
    const d = table[last];
    const next = mode === 'greedy' ? top(d) : draw(sampler(d, opts.temperature, opts.topP), rnd());
    out.push(next);
    last = next;
  }
  return out;
}

/** The token each step looked at before choosing (START first). */
export function contexts(tokens: string[]): string[] {
  return [START, ...tokens.slice(0, -1)];
}

/** Marks tokens that belong to a 3-token group that already appeared earlier in the text. */
export function repeated(tokens: string[]): boolean[] {
  const seen = new Set<string>();
  const flag = tokens.map(() => false);
  for (let i = 0; i + 2 < tokens.length; i++) {
    const key = tokens.slice(i, i + 3).join(' ');
    if (seen.has(key)) flag[i] = flag[i + 1] = flag[i + 2] = true;
    seen.add(key);
  }
  return flag;
}

/** Share of 3-token groups that are new (1 means no repetition at all). */
export function distinct3(tokens: string[]): { distinct: number; total: number } {
  const groups: string[] = [];
  for (let i = 0; i + 2 < tokens.length; i++) groups.push(tokens.slice(i, i + 3).join(' '));
  return { distinct: new Set(groups).size, total: groups.length };
}

export function uniqueTokens(tokens: string[]): number {
  return new Set(tokens).size;
}

/** Length of the loop greedy decoding falls into, or 0 if the text never repeats exactly. */
export function loopLength(tokens: string[]): number {
  for (let len = 1; len <= Math.floor(tokens.length / 2); len++) {
    for (let start = 0; start + 2 * len <= tokens.length; start++) {
      let same = true;
      for (let k = 0; k < len; k++) if (tokens[start + k] !== tokens[start + len + k]) same = false;
      if (same && start + 2 * len === tokens.length - ((tokens.length - start) % len)) return len;
    }
  }
  return 0;
}
