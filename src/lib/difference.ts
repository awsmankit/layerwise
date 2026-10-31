/**
 * Is model A really better than model B, or is it luck? Pass/fail results on test cases, the bootstrap,
 * paired and unpaired comparisons, how often a small test fools you, sample sizes, and base rates.
 * Every random step uses a seeded generator so results are repeatable.
 */
import { mulberry32 } from './data-prep';

export { mulberry32 };
export type Rand = () => number;

/** z values for a two-sided 5% test and 80% power. */
export const Z_ALPHA = 1.959964;
export const Z_POWER = 0.841621;

export const mean = (xs: ArrayLike<number>) => {
  let s = 0;
  for (let i = 0; i < xs.length; i++) s += xs[i];
  return s / (xs.length || 1);
};

/** Percentile of an already sorted array, with linear interpolation. p is between 0 and 1. */
export function percentile(sorted: ArrayLike<number>, p: number): number {
  const n = sorted.length;
  if (!n) return NaN;
  const pos = Math.min(Math.max(p, 0), 1) * (n - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** The middle `level` of a list of numbers, for example the 95% interval. */
export function interval(values: ArrayLike<number>, level = 0.95): [number, number] {
  const s = Float64Array.from(values as ArrayLike<number>).sort();
  const tail = (1 - level) / 2;
  return [percentile(s, tail), percentile(s, 1 - tail)];
}

export interface Results {
  a: Uint8Array;
  b: Uint8Array;
}

/**
 * Pass/fail results for two models on the same `n` cases. The models pass with probabilities pA and pB.
 * With chance `shared`, a case is equally easy for both (they use the same draw); otherwise the draws are independent.
 * Either way each model passes exactly pA or pB of cases in the long run.
 */
export function drawResults(n: number, pA: number, pB: number, shared: number, rand: Rand): Results {
  const a = new Uint8Array(n);
  const b = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const u = rand();
    const v = rand() < shared ? u : rand();
    a[i] = u < pA ? 1 : 0;
    b[i] = v < pB ? 1 : 0;
  }
  return { a, b };
}

/** Resample one list of results with replacement and return the pass rate of each resample. */
export function bootstrapRate(x: ArrayLike<number>, reps: number, rand: Rand): Float64Array {
  const n = x.length;
  const out = new Float64Array(reps);
  for (let r = 0; r < reps; r++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += x[Math.floor(rand() * n)];
    out[r] = s / n;
  }
  return out;
}

/**
 * Resample the cases and return B's pass rate minus A's, once per resample.
 * Paired: one draw of cases is used for both models, so a hard case stays hard for both.
 * Unpaired: each model gets its own draw, as if they had been tested on different cases.
 */
export function bootstrapDifference(r: Results, reps: number, rand: Rand, paired = true): Float64Array {
  const n = r.a.length;
  const out = new Float64Array(reps);
  for (let k = 0; k < reps; k++) {
    let sa = 0;
    let sb = 0;
    if (paired) {
      for (let i = 0; i < n; i++) {
        const j = Math.floor(rand() * n);
        sa += r.a[j];
        sb += r.b[j];
      }
    } else {
      for (let i = 0; i < n; i++) sa += r.a[Math.floor(rand() * n)];
      for (let i = 0; i < n; i++) sb += r.b[Math.floor(rand() * n)];
    }
    out[k] = (sb - sa) / n;
  }
  return out;
}

/** Observed B minus A, in the same units as a pass rate (0.05 is five points). */
export const observedDifference = (r: Results) => mean(r.b) - mean(r.a);

export interface Verdict {
  /** Observed difference, B minus A. */
  diff: number;
  ci: [number, number];
  /** The interval is entirely above zero (B clearly better) or below zero (A clearly better) or spans zero. */
  call: 'b-better' | 'a-better' | 'unclear';
}

export function judge(r: Results, reps: number, rand: Rand, paired = true, level = 0.95): Verdict {
  const diff = observedDifference(r);
  const ci = interval(bootstrapDifference(r, reps, rand, paired), level);
  return { diff, ci, call: ci[0] > 0 ? 'b-better' : ci[1] < 0 ? 'a-better' : 'unclear' };
}

export interface Experiments {
  trials: number;
  /** The measured B was above, equal to, or below the measured A. */
  bAhead: number;
  tied: number;
  aAhead: number;
  /** Intervals that excluded zero, split by direction. */
  clearB: number;
  clearA: number;
  /** All the observed differences, one per trial. */
  diffs: Float64Array;
}

/**
 * Repeat the whole experiment many times: draw a fresh test set, score both models, run the paired bootstrap.
 * Shows how often a small test puts the worse model ahead, and how often it can tell them apart.
 */
export function runExperiments(n: number, pA: number, pB: number, trials: number, seed: number, shared = 0.6, reps = 200): Experiments {
  const rand = mulberry32(seed);
  const out: Experiments = { trials, bAhead: 0, tied: 0, aAhead: 0, clearB: 0, clearA: 0, diffs: new Float64Array(trials) };
  for (let t = 0; t < trials; t++) {
    const r = drawResults(n, pA, pB, shared, rand);
    const v = judge(r, reps, rand, true);
    out.diffs[t] = v.diff;
    if (v.diff > 0) out.bAhead++;
    else if (v.diff < 0) out.aAhead++;
    else out.tied++;
    if (v.call === 'b-better') out.clearB++;
    if (v.call === 'a-better') out.clearA++;
  }
  return out;
}

/** Standard error of a pass rate p measured on n cases. */
export const standardError = (p: number, n: number) => Math.sqrt((p * (1 - p)) / n);

/** Cases needed in each group to see a change from p1 to p2 with a two-sided 5% test and 80% power (unpaired, normal approximation). */
export function casesPerGroup(p1: number, p2: number, zAlpha = Z_ALPHA, zPower = Z_POWER): number {
  const pbar = (p1 + p2) / 2;
  return Math.ceil((2 * pbar * (1 - pbar) * (zAlpha + zPower) ** 2) / (p1 - p2) ** 2);
}

/**
 * Cases needed when both models are run on the same cases (a paired test of two proportions, McNemar style).
 * `disagree` is the share of cases where exactly one model passes; `delta` the difference in pass rates to detect.
 */
export function pairsNeeded(disagree: number, delta: number, zAlpha = Z_ALPHA, zPower = Z_POWER): number {
  const d = Math.abs(delta);
  return Math.ceil(((zAlpha * Math.sqrt(disagree) + zPower * Math.sqrt(disagree - d * d)) / d) ** 2);
}

/** Chance of at least one false alarm when you run `m` independent comparisons at level `alpha`. */
export const chanceOfAFalseAlarm = (m: number, alpha = 0.05) => 1 - (1 - alpha) ** m;

export interface Frequencies {
  population: number;
  sick: number;
  healthy: number;
  /** Sick people the test flags. */
  truePositives: number;
  /** Healthy people the test flags. */
  falsePositives: number;
  positives: number;
  /** Of everyone flagged, the share who are really sick. */
  shareSick: number;
}

/** The "imagine 1,000 people" table. Sensitivity: share of sick people flagged. falsePositiveRate: share of healthy people flagged. */
export function naturalFrequencies(population: number, prevalence: number, sensitivity: number, falsePositiveRate: number): Frequencies {
  const sick = Math.round(population * prevalence);
  const healthy = population - sick;
  const truePositives = Math.round(sick * sensitivity);
  const falsePositives = Math.round(healthy * falsePositiveRate);
  const positives = truePositives + falsePositives;
  return { population, sick, healthy, truePositives, falsePositives, positives, shareSick: positives ? truePositives / positives : 0 };
}

/**
 * Exact two-sided sign-test p-value for a paired comparison. Only the cases where exactly one model passed count:
 * if the models were equally good, each such case would go to B or A like a fair coin flip.
 */
export function signTestP(bOnly: number, aOnly: number): number {
  const n = bOnly + aOnly;
  if (n === 0) return 1;
  const logChoose = (k: number) => {
    let s = 0;
    for (let i = 1; i <= k; i++) s += Math.log((n - k + i) / i);
    return s;
  };
  const hi = Math.max(bOnly, aOnly);
  let tail = 0;
  for (let k = hi; k <= n; k++) tail += Math.exp(logChoose(k) - n * Math.LN2);
  return Math.min(1, 2 * tail);
}
