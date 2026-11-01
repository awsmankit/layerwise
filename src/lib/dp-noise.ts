/*
 * Logic for the differential-privacy noise demo in responsible/privacy-engineering-for-ai.
 *
 * The data are invented: 20 imaginary people, each with a yes/no flag. The query is a count ("how
 * many people have the flag?"). Adding or removing one person changes a count by at most 1, so the
 * sensitivity is 1, and the Laplace mechanism adds noise from a Laplace distribution with scale
 * 1 / epsilon (Dwork and Roth, "The Algorithmic Foundations of Differential Privacy", Definition 3.3
 * and Theorem 3.6; counting queries in section 3.3). All random numbers come from a seeded
 * generator, so the same seed always gives the same histogram.
 */

/** A small, fast, seedable random number generator (mulberry32). Returns numbers in [0, 1). */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One draw from the Laplace distribution with the given scale, centred on zero.
 * It is an exponential draw with a random sign. The log never sees zero because 1 - r > 0.
 */
export function sampleLaplace(rng: () => number, scale: number): number {
  const magnitude = -scale * Math.log(1 - rng());
  return rng() < 0.5 ? -magnitude : magnitude;
}

/** A noisy count: the true count plus Laplace noise of scale sensitivity / epsilon. */
export function noisyCount(rng: () => number, trueCount: number, epsilon: number, sensitivity = 1): number {
  return trueCount + sampleLaplace(rng, sensitivity / epsilon);
}

/** The scale of the noise for a counting query. */
export const noiseScale = (epsilon: number, sensitivity = 1) => sensitivity / epsilon;

/** The average size of the noise: equal to the scale (the mean of |Laplace(b)| is b). */
export const expectedAbsError = (epsilon: number) => 1 / epsilon;

/** The standard deviation of the noise: sqrt(2) x scale. */
export const noiseStdDev = (epsilon: number) => Math.SQRT2 / epsilon;

/** Chance that the noise is no bigger than k in either direction: 1 - exp(-k x epsilon). */
export const probNoiseWithin = (k: number, epsilon: number) => 1 - Math.exp(-k * epsilon);

/** The most that one answer can change the odds that a given person is in the data: a factor of e^epsilon. */
export const maxOddsFactor = (epsilon: number) => Math.exp(epsilon);

/**
 * An attacker knows every other person in the data and wants to tell whether one more person is in
 * (count c + 1) or out (count c), from a single noisy answer. The best rule is "in if the answer is
 * above c + 0.5". With equal prior chances it is right with probability 1 - 0.5 x exp(-epsilon / 2).
 */
export const membershipGuessAccuracy = (epsilon: number) => 1 - 0.5 * Math.exp(-epsilon / 2);

/** How many queries of epsilon each fit in a total budget, using simple composition (the epsilons add up). */
export const queriesInBudget = (totalEpsilon: number, perQuery: number) => Math.floor(totalEpsilon / perQuery + 1e-9);

/** The standard deviation of the average of n repeated noisy answers to the same query (fresh noise each time). */
export const averageStdDev = (epsilon: number, n: number) => noiseStdDev(epsilon) / Math.sqrt(n);

/** The privacy cost of asking the same query n times, each at epsilon (simple composition). */
export const totalEpsilonSpent = (epsilon: number, n: number) => epsilon * n;

/** The epsilon you may spend per query to ask n queries within a total budget. */
export const epsilonPerQuery = (totalEpsilon: number, n: number) => totalEpsilon / n;

/* ---------- the invented dataset ---------- */

export interface Person {
  id: number;
  name: string;
  flag: boolean;
}

/** 20 invented people. Their names are placeholders, and the flag is just "yes" or "no". */
export const PEOPLE: Person[] = [
  'Ada', 'Ben', 'Cho', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivo', 'Jun',
  'Kai', 'Lea', 'Max', 'Noa', 'Omar', 'Pia', 'Quin', 'Rae', 'Sol', 'Tia',
].map((name, id) => ({ id, name, flag: [1, 4, 5, 7, 11, 12, 15].includes(id) }));

/** The person the learner can toggle in and out of the data. */
export const TARGET_ID = 7; // Hana, who has the flag

export const trueCount = (people: Person[], excludeId: number | null): number =>
  people.filter((p) => p.flag && p.id !== excludeId).length;

/* ---------- histograms ---------- */

export interface Histogram {
  /** The first bin value (answers are rounded to whole numbers and clamped to the range) */
  lo: number;
  counts: number[];
  runs: number;
}

/** Run the noisy count many times and count how often each (rounded) answer comes up. */
export function runMany(seed: number, trueValue: number, epsilon: number, runs: number, lo: number, hi: number): Histogram {
  const rng = makeRng(seed);
  const counts = new Array(hi - lo + 1).fill(0);
  for (let i = 0; i < runs; i++) {
    const v = Math.round(noisyCount(rng, trueValue, epsilon));
    counts[Math.min(hi, Math.max(lo, v)) - lo]++;
  }
  return { lo, counts, runs };
}

/** Of the runs, the share whose rounded answer is exactly right. */
export const shareExact = (h: Histogram, trueValue: number) => h.counts[trueValue - h.lo] / h.runs;

/** The mean of the unclamped answers over many runs (useful to show that the noise has no bias). */
export function meanAnswer(seed: number, trueValue: number, epsilon: number, runs: number): number {
  const rng = makeRng(seed);
  let sum = 0;
  for (let i = 0; i < runs; i++) sum += noisyCount(rng, trueValue, epsilon);
  return sum / runs;
}

/** The epsilon choices on the slider. */
export const EPSILONS = [0.1, 0.25, 0.5, 1, 2, 5] as const;
