/**
 * What if we never check results group by group? A TOY test set of 1,000 made-up people in two groups.
 * The per-group accuracy and miss rates are example settings chosen for the demo, not measurements of any real system.
 * Everything on screen (counts, intervals, pass or fail) is computed from them here.
 */

export const TOTAL = 1000;
/** Share of people in each group who truly have the thing the model looks for (example). */
export const POSITIVE_RATE = 0.3;
/** Example settings: how often the model is right, and how often it misses a true case. */
export const settings = {
  A: { accuracy: 0.96, missRate: 0.04 },
  B: { accuracy: 0.72, missRate: 0.4 },
} as const;
/** An example release rule: "ship if the overall accuracy is at least 90 percent". */
export const RULE = 0.9;

export type GroupKey = 'A' | 'B';

export type GroupResult = {
  key: GroupKey;
  n: number;
  positives: number;
  errors: number;
  correct: number;
  /** True cases the model missed. */
  missed: number;
  accuracy: number;
  /** Share of true cases the model missed. */
  missShare: number;
  accuracyCI: [number, number];
  missCI: [number, number];
};

/** 95 percent Wilson score interval for k out of n. Returns [0, 1] when n is 0. */
export function wilson(k: number, n: number, z = 1.96): [number, number] {
  if (n <= 0) return [0, 1];
  const p = k / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return [Math.max(0, centre - half), Math.min(1, centre + half)];
}

/** Whole people in group B for a minority share in percent (at least 1, at most TOTAL - 1). */
export function groupSizes(minorityPct: number, total = TOTAL): { nA: number; nB: number } {
  const nB = Math.min(total - 1, Math.max(1, Math.round((total * minorityPct) / 100)));
  return { nA: total - nB, nB };
}

export function groupResult(key: GroupKey, n: number): GroupResult {
  const s = settings[key];
  const positives = Math.round(n * POSITIVE_RATE);
  const errors = Math.round(n * (1 - s.accuracy));
  const missed = Math.min(errors, Math.round(positives * s.missRate));
  const correct = n - errors;
  return {
    key,
    n,
    positives,
    errors,
    correct,
    missed,
    accuracy: correct / n,
    missShare: positives === 0 ? 0 : missed / positives,
    accuracyCI: wilson(correct, n),
    missCI: wilson(missed, positives),
  };
}

export type Split = { A: GroupResult; B: GroupResult; overall: number; overallCI: [number, number]; gap: number };

export function evaluate(minorityPct: number): Split {
  const { nA, nB } = groupSizes(minorityPct);
  const A = groupResult('A', nA);
  const B = groupResult('B', nB);
  const correct = A.correct + B.correct;
  const total = A.n + B.n;
  const overall = correct / total;
  return { A, B, overall, overallCI: wilson(correct, total), gap: overall - B.accuracy };
}

/** Does the overall number alone pass the release rule? */
export const passesOverall = (s: Split, rule = RULE) => s.overall >= rule;
/** Does every group pass the same rule? */
export const passesEveryGroup = (s: Split, rule = RULE) => s.A.accuracy >= rule && s.B.accuracy >= rule;

/** Largest minority share (whole percent, 1 to 50) at which the overall rule still passes. 0 if none. */
export function largestSharePassing(rule = RULE): number {
  let last = 0;
  for (let p = 1; p <= 50; p++) if (passesOverall(evaluate(p), rule)) last = p;
  return last;
}

/** Which of `n` dots are errors, spread evenly. */
export function errorDots(n: number, errors: number): boolean[] {
  const out: boolean[] = [];
  for (let i = 0; i < n; i++) out.push(Math.floor(((i + 1) * errors) / n) > Math.floor((i * errors) / n));
  return out;
}
