/*
 * Logic for the staged-rollout simulator in edge/shipping-to-a-fleet.
 *
 * Everything here is invented for teaching: a fleet of 100,000 devices in three classes, a healthy
 * background failure rate, and a regression that adds failures on one class only. A rollout goes
 * out in stages (a canary, then growing by a fixed factor). After each stage, the share of devices
 * that have reported back is checked against a halt rule: halt if the failure rate among reporting
 * devices in that stage's cohort is at or above a threshold. Failures in a cohort are binomial, so
 * the chance of halting at each stage is an exact binomial tail, and one simulated rollout draws
 * from the same distribution with a seeded random number generator.
 */

export const FLEET = 100_000;
/** Failure rate of a healthy device over the observation window. An invented example. */
export const BASELINE = 0.005;

export type ClassId = 'A' | 'B' | 'C';
export const CLASSES: { id: ClassId; label: string; share: number }[] = [
  { id: 'A', label: 'Recent flagship', share: 0.5 },
  { id: 'B', label: 'Mid-range', share: 0.35 },
  { id: 'C', label: 'Older, low memory', share: 0.15 },
];

export type Scenario = { id: string; label: string; affected: ClassId | null; extra: number; blurb: string };
export const SCENARIOS: Scenario[] = [
  { id: 'lowram', label: 'Fails on older, low-memory devices', affected: 'C', extra: 0.1, blurb: 'The new model runs out of memory on 10% of older devices. They are 15% of the fleet.' },
  { id: 'mid', label: 'Slow path on mid-range devices', affected: 'B', extra: 0.04, blurb: 'A missing accelerator operator makes 4% of mid-range devices time out. They are 35% of the fleet.' },
  { id: 'rare', label: 'Rare bug on recent devices', affected: 'A', extra: 0.01, blurb: 'One in a hundred recent flagships hits a bad input path. They are half the fleet.' },
  { id: 'none', label: 'No regression (control)', affected: null, extra: 0, blurb: 'A healthy update. Any halt is a false alarm.' },
];

export type Config = {
  /** Fraction of the fleet in the first stage, 0.0005 to 0.1. */
  canary: number;
  /** Each stage multiplies the cumulative share by this, until it reaches 100%. */
  growth: number;
  /** Halt if the failure rate among reporting devices in a stage is at or above this. */
  threshold: number;
  /** Share of a stage's devices that have reported back before the decision. */
  reporting: number;
  /** Fill the first stage evenly across device classes instead of in proportion. */
  evenCanary: boolean;
  /** Judge each device class on its own and halt if any class crosses the line, instead of one fleet-wide rate. */
  perClass: boolean;
  scenario: Scenario;
};

/** Cumulative fractions of the fleet after each stage, ending at 1. */
export function stageFractions(canary: number, growth: number): number[] {
  const out: number[] = [];
  let f = Math.min(Math.max(canary, 1 / FLEET), 1);
  while (f < 1 - 1e-12 && out.length < 40) {
    out.push(f);
    f = f * Math.max(growth, 1.01);
  }
  out.push(1);
  return out;
}

export function stageSizes(fractions: number[], fleet = FLEET): number[] {
  let prev = 0;
  return fractions.map((f) => {
    const cum = Math.round(f * fleet);
    const n = cum - prev;
    prev = cum;
    return n;
  });
}

/* ---------- binomial helpers ---------- */

const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

export function logGamma(z: number): number {
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  const x = z - 1;
  let a = LANCZOS[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += LANCZOS[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

export function logPmf(n: number, p: number, k: number): number {
  if (k < 0 || k > n) return -Infinity;
  if (p <= 0) return k === 0 ? 0 : -Infinity;
  if (p >= 1) return k === n ? 0 : -Infinity;
  return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1) + k * Math.log(p) + (n - k) * Math.log(1 - p);
}

/** P(X >= k) for X ~ Binomial(n, p). */
export function binomUpperTail(n: number, p: number, k: number): number {
  if (k <= 0) return 1;
  if (k > n || p <= 0) return 0;
  if (p >= 1) return 1;
  const mean = n * p;
  if (k > mean) {
    let sum = 0;
    for (let i = k; i <= n; i++) {
      const term = Math.exp(logPmf(n, p, i));
      sum += term;
      if (i > mean && term < 1e-18 * Math.max(sum, 1e-300)) break;
    }
    return Math.min(1, sum);
  }
  let lower = 0;
  for (let i = k - 1; i >= 0; i--) {
    const term = Math.exp(logPmf(n, p, i));
    lower += term;
    if (i < mean && term < 1e-18 * Math.max(lower, 1e-300)) break;
  }
  return Math.max(0, 1 - lower);
}

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

/** One Binomial(n, p) draw by inversion of the cumulative distribution. */
export function sampleBinomial(rng: () => number, n: number, p: number): number {
  if (n <= 0 || p <= 0) return 0;
  if (p >= 1) return n;
  const u = rng();
  const mean = n * p;
  let cum = 0;
  for (let i = 0; i <= n; i++) {
    const term = Math.exp(logPmf(n, p, i));
    cum += term;
    if (cum >= u) return i;
    if (i > mean && term < 1e-18) return i;
  }
  return n;
}

/* ---------- the rollout model ---------- */

/** Failure rate of a device: healthy background plus the regression, combined as independent causes. */
export function deviceFailureRate(affected: boolean, extra: number): number {
  return affected ? 1 - (1 - BASELINE) * (1 - extra) : BASELINE;
}

/** Share of each class in a stage. The first stage can be filled evenly across classes. */
export function stageMix(stageIndex: number, evenCanary: boolean): Record<ClassId, number> {
  if (evenCanary && stageIndex === 0) return { A: 1 / 3, B: 1 / 3, C: 1 / 3 };
  return { A: CLASSES[0].share, B: CLASSES[1].share, C: CLASSES[2].share };
}

export type StageRow = {
  index: number;
  cumulative: number;
  cohort: number;
  observed: number;
  /** Expected failure rate among reporting devices in this cohort. */
  rate: number;
  /** Failures at or above which the rule halts. */
  haltAt: number;
  /** Chance the rule halts after this stage, given that the stage was reached. */
  haltProb: number;
  /** Chance this stage is reached at all. */
  reachProb: number;
  /** Expected number of cohort devices in the affected class. */
  affectedDevices: number;
  /** Per-class detail, used when the rule judges each class separately. */
  classes: { id: ClassId; observed: number; rate: number; haltAt: number; haltProb: number }[];
};

export type Analysis = {
  rows: StageRow[];
  /** Expected devices that received the update before the rollout was stopped. */
  expectedExposed: number;
  /** Expected devices in the affected class that received it. */
  expectedAffected: number;
  /** Expected extra failures caused by the regression (beyond the healthy background). */
  expectedExtraFailures: number;
  /** Chance the update reaches the final, 100% stage without a halt. */
  pFull: number;
  /** Chance the rollout is halted at some stage. */
  pHalt: number;
};

export function haltCount(threshold: number, observed: number): number {
  return Math.max(1, Math.ceil(threshold * observed - 1e-9));
}

export function analyse(c: Config): Analysis {
  const fractions = stageFractions(c.canary, c.growth);
  const sizes = stageSizes(fractions);
  const aff = c.scenario.affected;
  let reach = 1;
  const rows: StageRow[] = [];
  let expectedExposed = 0;
  let expectedAffected = 0;
  let expectedExtra = 0;
  let pFull = 1;
  fractions.forEach((f, i) => {
    const mix = stageMix(i, c.evenCanary);
    const cohort = sizes[i];
    const observed = Math.round(cohort * c.reporting);
    let rate = 0;
    let affectedShare = 0;
    for (const cl of CLASSES) {
      const isAff = aff === cl.id;
      rate += mix[cl.id] * deviceFailureRate(isAff, c.scenario.extra);
      if (isAff) affectedShare = mix[cl.id];
    }
    const classes = CLASSES.map((cl) => {
      const isAff = aff === cl.id;
      const rateC = deviceFailureRate(isAff, c.scenario.extra);
      const obsC = Math.round(observed * mix[cl.id]);
      const haltAtC = haltCount(c.threshold, obsC);
      return { id: cl.id, observed: obsC, rate: rateC, haltAt: haltAtC, haltProb: obsC > 0 ? binomUpperTail(obsC, rateC, haltAtC) : 0 };
    });
    let haltAt = haltCount(c.threshold, observed);
    let haltProb = observed > 0 ? binomUpperTail(observed, rate, haltAt) : 0;
    if (c.perClass) {
      haltProb = 1 - classes.reduce((p, x) => p * (1 - x.haltProb), 1);
      haltAt = 0;
    }
    rows.push({ index: i, cumulative: f, cohort, observed, rate, haltAt, haltProb, reachProb: reach, affectedDevices: cohort * affectedShare, classes });
    expectedExposed += reach * cohort;
    expectedAffected += reach * cohort * affectedShare;
    expectedExtra += reach * cohort * affectedShare * c.scenario.extra;
    if (i < fractions.length - 1) pFull *= 1 - haltProb;
    reach *= 1 - haltProb;
  });
  return { rows, expectedExposed, expectedAffected, expectedExtraFailures: expectedExtra, pFull, pHalt: 1 - reach };
}

/** Chance that a healthy update (no regression) is halted by the same rule. */
export function falseHaltProb(c: Config): number {
  const control = SCENARIOS.find((s) => s.id === 'none')!;
  return analyse({ ...c, scenario: control }).pHalt;
}

export type RunRow = { index: number; cohort: number; observed: number; failures: number; rate: number; halted: boolean; haltedClass: ClassId | null };
export type Run = { rows: RunRow[]; haltedAt: number | null; exposed: number; affected: number };

/** One simulated rollout with a seeded random number generator. */
export function simulate(c: Config, seed: number): Run {
  const rng = makeRng(seed);
  const a = analyse(c);
  const rows: RunRow[] = [];
  let exposed = 0;
  let affected = 0;
  let haltedAt: number | null = null;
  for (const r of a.rows) {
    let failures = 0;
    let halted = false;
    let haltedClass: ClassId | null = null;
    if (c.perClass) {
      for (const x of r.classes) {
        const f = sampleBinomial(rng, x.observed, x.rate);
        failures += f;
        if (!halted && x.observed > 0 && f >= x.haltAt) {
          halted = true;
          haltedClass = x.id;
        }
      }
    } else {
      failures = sampleBinomial(rng, r.observed, r.rate);
      halted = r.observed > 0 && failures >= r.haltAt;
    }
    const rate = r.observed > 0 ? failures / r.observed : 0;
    rows.push({ index: r.index, cohort: r.cohort, observed: r.observed, failures, rate, halted, haltedClass });
    exposed += r.cohort;
    affected += r.affectedDevices;
    if (halted) {
      haltedAt = r.index;
      break;
    }
  }
  return { rows, haltedAt, exposed, affected };
}

/* ---------- small rules of thumb used in the lesson ---------- */

/** Devices you must expose to expect at least `failures` failures, when a share of the fleet is affected at rate p. */
export function devicesToSeeFailures(failures: number, affectedShare: number, p: number): number {
  return failures / (affectedShare * p);
}

/** Upper 95% bound on a failure rate after n devices with no failures: solves (1 - p)^n = 0.05. About 3 / n. */
export function zeroFailureUpperBound(n: number): number {
  return 1 - Math.pow(0.05, 1 / n);
}
