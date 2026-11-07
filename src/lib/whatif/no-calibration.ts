/**
 * What if the model's confidence is not calibrated? A TOY two-class model on made-up data, not a measurement of any real model.
 * Each example has a raw score (a logit) z. The model reports confidence sigmoid(|z|) in its pick. In this toy the truth is
 * that the pick is right with probability sigmoid(|z| / TRUE_T), so a model with TRUE_T above 1 is overconfident.
 * Temperature scaling divides every score by one number T before the sigmoid. T is fitted on held-out validation data
 * and everything is measured on separate test data. Every figure on the page comes from these functions.
 */

/** How much too sharp the model's scores are (example). 1 would be perfectly calibrated. */
export const TRUE_T = 2.6;
/** Spread of the raw scores (example). */
export const SCORE_SD = 4.5;
export const N_VAL = 2000;
export const N_TEST = 2000;
/** Confidence bins for the reliability diagram: 5 bins of width 0.1 between 0.5 and 1 (a two-class model never says less than 50%). */
export const BINS = 5;
export const BIN_LO = 0.5;

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** Small seeded generator (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Sample = {
  /** size of the raw score, |z| */
  logit: number;
  /** whether the model's pick was right */
  correct: boolean;
};

export function makeSamples(seed: number, n: number): Sample[] {
  const r = rng(seed);
  return Array.from({ length: n }, () => {
    const u = Math.max(r(), 1e-12);
    const z = Math.abs(Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r())) * SCORE_SD;
    return { logit: z, correct: r() < sigmoid(z / TRUE_T) };
  });
}

let valCache: Sample[] | null = null;
let testCache: Sample[] | null = null;
export const validation = () => (valCache ??= makeSamples(11, N_VAL));
export const test = () => (testCache ??= makeSamples(29, N_TEST));

/** The confidence the model reports at temperature T (T = 1 is the raw model). */
export function confidence(s: Sample, T: number): number {
  return sigmoid(s.logit / T);
}

/** Average negative log-likelihood: the score that temperature scaling minimises on the validation set. */
export function nll(samples: Sample[], T: number): number {
  let sum = 0;
  for (const s of samples) {
    const p = Math.min(1 - 1e-12, Math.max(1e-12, confidence(s, T)));
    sum -= Math.log(s.correct ? p : 1 - p);
  }
  return sum / samples.length;
}

/** Fit T by a coarse then a fine grid search over the validation set. */
export function fitTemperature(samples: Sample[]): number {
  let best = 1;
  let bestLoss = Infinity;
  for (let T = 0.5; T <= 6.0001; T += 0.05) {
    const l = nll(samples, T);
    if (l < bestLoss) {
      bestLoss = l;
      best = T;
    }
  }
  const mid = best;
  for (let T = mid - 0.05; T <= mid + 0.0501; T += 0.005) {
    const l = nll(samples, T);
    if (l < bestLoss) {
      bestLoss = l;
      best = T;
    }
  }
  return Math.round(best * 100) / 100;
}

let fitCache: number | null = null;
/** The fitted temperature for the example model. */
export const fittedT = () => (fitCache ??= fitTemperature(validation()));

export type Bin = { lo: number; hi: number; n: number; conf: number; acc: number };

/** Reliability bins: for each confidence range, the average confidence said and the share actually right. */
export function reliability(samples: Sample[], T: number): Bin[] {
  const width = (1 - BIN_LO) / BINS;
  const acc = Array.from({ length: BINS }, () => ({ n: 0, c: 0, r: 0 }));
  for (const s of samples) {
    const c = confidence(s, T);
    const b = Math.min(BINS - 1, Math.floor((c - BIN_LO) / width + 1e-12));
    acc[b].n++;
    acc[b].c += c;
    acc[b].r += s.correct ? 1 : 0;
  }
  return acc.map((a, b) => ({ lo: BIN_LO + b * width, hi: BIN_LO + (b + 1) * width, n: a.n, conf: a.n ? a.c / a.n : 0, acc: a.n ? a.r / a.n : 0 }));
}

/** Expected calibration error: the bins' gaps between confidence and accuracy, weighted by how many examples each holds. */
export function ece(samples: Sample[], T: number): number {
  const bins = reliability(samples, T);
  return bins.reduce((sum, b) => sum + (b.n / samples.length) * Math.abs(b.acc - b.conf), 0);
}

export function meanConfidence(samples: Sample[], T: number): number {
  return samples.reduce((a, s) => a + confidence(s, T), 0) / samples.length;
}

export function accuracy(samples: Sample[]): number {
  return samples.filter((s) => s.correct).length / samples.length;
}

export type ThresholdResult = {
  /** how many examples the rule acts on (confidence at or above the threshold) */
  accepted: number;
  share: number;
  /** share of those that were actually right */
  accuracy: number;
  /** what the model's own confidence promised for those, on average */
  promised: number;
};

/** A rule "act automatically when confidence is at least `threshold`", with the confidence at temperature T. */
export function atThreshold(samples: Sample[], T: number, threshold: number): ThresholdResult {
  const picked = samples.filter((s) => confidence(s, T) >= threshold);
  const n = picked.length;
  return {
    accepted: n,
    share: n / samples.length,
    accuracy: n ? picked.filter((s) => s.correct).length / n : 0,
    promised: n ? picked.reduce((a, s) => a + confidence(s, T), 0) / n : 0,
  };
}
