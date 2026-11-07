/**
 * What if models keep training on their own output?
 * A toy of the idea, not of any real model: a "language" of 12 words where a few are common and many are rare.
 * Generation 0 is the real distribution. Every later generation is "trained" like this:
 *   1. draw N words from the previous generation's model (its probabilities),
 *   2. optionally replace a share `fresh` of those N draws by draws from the real distribution,
 *   3. the new model is simply the word counts divided by N (the maximum-likelihood fit).
 * A word that gets no draws has probability 0 and can never be drawn again from the model: it is gone for good, unless fresh real data brings it back.
 * Everything uses a seeded generator, so the same settings always give the same run.
 */

export const WORDS = ['the', 'of', 'cat', 'tree', 'river', 'lamp', 'spoon', 'comet', 'heron', 'quartz', 'mango', 'zither'] as const;
export const K = WORDS.length;
export const GENERATIONS = 30;
/** Sample sizes offered on the slider. */
export const SAMPLE_SIZES = [20, 30, 50, 100, 200, 500, 1000];
export const DEFAULT_N = 50;
/** Fresh real data shares offered, as fractions of each generation's training set. */
export const FRESH_STEPS = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5];
export const DEFAULT_FRESH = 0.2;
/** The run that is drawn on screen. */
export const SHOWN_SEED = 2;
/** Runs averaged for the dotted line. */
export const RUNS = 30;

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Real word probabilities: proportional to 1 / rank^1.1, rounded to 6 digits. */
export const REAL: number[] = (() => {
  const raw = Array.from({ length: K }, (_, i) => 1 / Math.pow(i + 1, 1.1));
  const z = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => Math.round((v / z) * 1e6) / 1e6);
})();

function sampleCounts(p: number[], n: number, r: () => number): number[] {
  const c = new Array(K).fill(0);
  for (let i = 0; i < n; i++) {
    const u = r();
    let k = 0;
    let acc = p[0];
    while (u > acc && k < K - 1) {
      k++;
      acc += p[k];
    }
    c[k]++;
  }
  return c;
}

/** Probabilities of every generation, index 0 being the real distribution. fresh is a share between 0 and 1. */
export function simulate(n: number, fresh: number, seed: number = SHOWN_SEED, generations: number = GENERATIONS): number[][] {
  const r = mulberry32(seed);
  const nReal = Math.round(fresh * n);
  let p = REAL.slice();
  const out = [p];
  for (let g = 0; g < generations; g++) {
    const own = sampleCounts(p, n - nReal, r);
    const real = nReal > 0 ? sampleCounts(REAL, nReal, r) : new Array(K).fill(0);
    p = own.map((c, i) => (c + real[i]) / n);
    out.push(p);
  }
  return out;
}

/** How many of the 12 words still have probability above zero. */
export function alive(p: number[]): number {
  return p.filter((v) => v > 0).length;
}

/** Entropy in bits: how spread out the model's choices are. The real distribution has about 2.98 bits. */
export function entropyBits(p: number[]): number {
  let h = 0;
  for (const v of p) if (v > 0) h -= v * Math.log2(v);
  return Math.round(h * 1000) / 1000;
}

/** Total probability the model gives to the six rarest words. */
export function tailMass(p: number[]): number {
  return Math.round(p.slice(K - 6).reduce((a, b) => a + b, 0) * 1e6) / 1e6;
}

/** For every word, the first generation at which its probability is zero, or null. */
export function goneAt(run: number[][]): (number | null)[] {
  return WORDS.map((_, i) => {
    const g = run.findIndex((p) => p[i] === 0);
    return g < 0 ? null : g;
  });
}

/** Average number of living words at every generation over seeds 1..RUNS. */
export function averageAlive(n: number, fresh: number): number[] {
  const sum = new Array(GENERATIONS + 1).fill(0);
  for (let s = 1; s <= RUNS; s++) {
    simulate(n, fresh, s).forEach((p, g) => {
      sum[g] += alive(p);
    });
  }
  return sum.map((v) => Math.round((v / RUNS) * 100) / 100);
}

export const freshPct = (f: number) => `${Math.round(f * 100)}%`;
