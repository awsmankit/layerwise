/*
 * Rollout simulator: shadow, canary or A/B for a new model that may be worse than the old one.
 * All traffic, rates and regressions are invented for the lesson; the random numbers are seeded, so the
 * same settings always give the same result.
 *
 * Each hour, requests arrive. The "bad outcome" rate of the old model is `baseRate`. The new model is worse
 * by `delta` percentage points in the chosen scenario. We compare the two groups with a pooled two-proportion
 * z statistic (the same test for every strategy) and halt the rollout if the strategy's rule fires.
 */
import { mulberry32 } from './data-prep';

export type Strategy = 'shadow' | 'canary' | 'ab';
export type ScenarioId = 'bug' | 'small' | 'behaviour' | 'none';

export const SCENARIOS: { id: ScenarioId; label: string; detail: string; delta: number; visibleInShadow: boolean }[] = [
  { id: 'bug', label: 'A bug: 3 points worse', detail: 'The new model is wrong more often because of a pipeline mismatch. It shows up on any real traffic.', delta: 0.03, visibleInShadow: true },
  { id: 'small', label: 'A small drop: 1 point worse', detail: 'A subtle regression. It needs many requests to tell from noise.', delta: 0.01, visibleInShadow: true },
  { id: 'behaviour', label: 'Hurts users: 2 points worse, invisible in shadow', detail: 'The model scores fine on its own predictions but changes what users do. Only users who see its output reveal it.', delta: 0.02, visibleInShadow: false },
  { id: 'none', label: 'No regression: the new model is fine', detail: 'Nothing is wrong. Any halt is a false alarm.', delta: 0, visibleInShadow: true },
];

export const STRATEGIES: { id: Strategy; label: string; detail: string }[] = [
  { id: 'shadow', label: 'Shadow', detail: 'The new model sees a copy of all traffic. Users only ever see the old model.' },
  { id: 'canary', label: 'Canary', detail: 'A small share of users get the new model. The check runs every hour and halts if the new group is clearly worse.' },
  { id: 'ab', label: 'A/B test', detail: 'Half of users get the new model for a planned period. One analysis at the end.' },
];

export type Settings = {
  strategy: Strategy;
  scenario: ScenarioId;
  /** canary share of traffic, 0 to 1 */
  share: number;
  requestsPerHour: number;
  /** hours before an outcome is known */
  labelDelay: number;
  /** halt when the z statistic reaches this (canary and shadow; the A/B test uses 1.96 at the end) */
  zHalt: number;
  /** length of the experiment (A/B) or the longest the rollout may run (canary, shadow) */
  hours: number;
  baseRate: number;
  seed: number;
};

export const DEFAULTS: Settings = { strategy: 'canary', scenario: 'bug', share: 0.05, requestsPerHour: 2000, labelDelay: 0, zHalt: 3, hours: 168, baseRate: 0.05, seed: 1 };

export const MIN_NEW_CASES = 100;
export const AB_SHARE = 0.5;
export const AB_Z = 1.96;

export type Point = {
  hour: number;
  /** cumulative cases and bad outcomes in each group, among outcomes already known */
  n0: number;
  x0: number;
  n1: number;
  x1: number;
  z: number | null;
  /** whether the rollout's rule looks at this hour */
  looked: boolean;
};

export type Run = {
  points: Point[];
  /** hour at which the rollout was halted (or, for an A/B test, found worse), or null */
  haltHour: number | null;
  /** requests answered by the new model for real users */
  servedNew: number;
  /** expected extra bad outcomes among real users, servedNew x delta */
  extraBad: number;
  delta: number;
  zNeeded: number;
};

function gauss(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/** Number of successes in n trials: exact for small n, normal approximation otherwise. */
export function binomial(n: number, p: number, rand: () => number): number {
  if (n <= 0 || p <= 0) return 0;
  if (p >= 1) return n;
  if (n <= 30) {
    let k = 0;
    for (let i = 0; i < n; i++) if (rand() < p) k++;
    return k;
  }
  const k = Math.round(n * p + Math.sqrt(n * p * (1 - p)) * gauss(rand));
  return Math.max(0, Math.min(n, k));
}

/** Pooled two-proportion z statistic for "group 1 has a higher bad-outcome rate than group 0". */
export function zStat(n0: number, x0: number, n1: number, x1: number): number | null {
  if (n0 <= 0 || n1 <= 0) return null;
  const pooled = (x0 + x1) / (n0 + n1);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / n0 + 1 / n1));
  if (se === 0) return null;
  return (x1 / n1 - x0 / n0) / se;
}

export function simulate(s: Settings): Run {
  const sc = SCENARIOS.find((x) => x.id === s.scenario)!;
  const rand = mulberry32(s.seed * 7919 + 13);
  const share = s.strategy === 'shadow' ? 1 : s.strategy === 'ab' ? AB_SHARE : s.share;
  const zNeeded = s.strategy === 'ab' ? AB_Z : s.zHalt;
  const observedDelta = s.strategy === 'shadow' && !sc.visibleInShadow ? 0 : sc.delta;
  const lastHour = s.strategy === 'ab' ? s.hours + s.labelDelay : s.hours;

  const hourly: { n0: number; x0: number; n1: number; x1: number }[] = [];
  const points: Point[] = [];
  let haltHour: number | null = null;
  let servedNew = 0;
  for (let h = 1; h <= lastHour; h++) {
    const traffic = s.strategy === 'ab' && h > s.hours ? 0 : s.requestsPerHour;
    const n1 = s.strategy === 'shadow' ? traffic : Math.round(traffic * share);
    const n0 = s.strategy === 'shadow' ? traffic : traffic - n1;
    hourly.push({ n0, x0: binomial(n0, s.baseRate, rand), n1, x1: binomial(n1, s.baseRate + observedDelta, rand) });
    if (s.strategy !== 'shadow') servedNew += n1;
    // outcomes known so far: hours up to h - labelDelay
    const known = h - s.labelDelay;
    let n0c = 0;
    let x0c = 0;
    let n1c = 0;
    let x1c = 0;
    for (let i = 0; i < known; i++) {
      n0c += hourly[i].n0;
      x0c += hourly[i].x0;
      n1c += hourly[i].n1;
      x1c += hourly[i].x1;
    }
    const z = n1c >= MIN_NEW_CASES ? zStat(n0c, x0c, n1c, x1c) : null;
    const looked = s.strategy === 'ab' ? h === lastHour : true;
    points.push({ hour: h, n0: n0c, x0: x0c, n1: n1c, x1: x1c, z, looked });
    if (looked && z !== null && z >= zNeeded) {
      haltHour = h;
      break;
    }
  }
  if (s.strategy === 'ab') servedNew = Math.round(s.requestsPerHour * AB_SHARE) * s.hours;
  return { points, haltHour, servedNew, extraBad: servedNew * sc.delta, delta: sc.delta, zNeeded };
}

export type Summary = {
  runs: number;
  detectionRate: number;
  medianHours: number | null;
  medianExtraBad: number;
  medianServed: number;
};

function median(v: number[]): number {
  if (v.length === 0) return 0;
  const a = [...v].sort((x, y) => x - y);
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

export function summarise(s: Settings, runs = 200): Summary {
  const hours: number[] = [];
  const extra: number[] = [];
  const served: number[] = [];
  let detected = 0;
  for (let i = 0; i < runs; i++) {
    const r = simulate({ ...s, seed: s.seed * 1000 + i });
    if (r.haltHour !== null) {
      detected++;
      hours.push(r.haltHour);
    }
    extra.push(r.extraBad);
    served.push(r.servedNew);
  }
  return { runs, detectionRate: detected / runs, medianHours: hours.length ? median(hours) : null, medianExtraBad: median(extra), medianServed: median(served) };
}
