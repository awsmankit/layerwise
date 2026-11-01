/*
 * Logic for the drift lessons in systems/monitoring-and-drift: the drift statistics (PSI, the
 * Kolmogorov-Smirnov statistic and its asymptotic p-value), four invented 120-day scenarios, a
 * label-delay model, and the scoring used by the "Drift Watch" game.
 *
 * Everything here is invented data from a seeded generator, so the same settings always draw the
 * same stream. PSI and the KS statistic and p-value are unit-tested against reference values
 * computed with numpy and scipy (see drift-watch.test.ts).
 */
import { makeRng } from './dp-noise';

/* ---------- random numbers ---------- */

/** One standard normal draw (Box-Muller). The log never sees zero because 1 - r > 0. */
export function gauss(rng: () => number): number {
  const u = 1 - rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** `n` standard normal draws from a seed. */
export function normals(seed: number, n: number): number[] {
  const rng = makeRng(seed);
  const out: number[] = new Array(n);
  for (let i = 0; i < n; i++) out[i] = gauss(rng);
  return out;
}

/* ---------- statistics ---------- */

export const sortedCopy = (xs: ArrayLike<number>): Float64Array => Float64Array.from(xs as ArrayLike<number>).sort();

/** Quantile of an already sorted array, with linear interpolation (numpy's default method). */
export function quantileSorted(sorted: ArrayLike<number>, q: number): number {
  const n = sorted.length;
  const pos = q * (n - 1);
  const lo = Math.floor(pos);
  const hi = Math.min(n - 1, lo + 1);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** Interior edges of `bins` equal-frequency bins of the reference: the 1/bins ... (bins-1)/bins quantiles. */
export function quantileEdges(refSorted: ArrayLike<number>, bins = 10): number[] {
  const edges: number[] = [];
  for (let i = 1; i < bins; i++) edges.push(quantileSorted(refSorted, i / bins));
  return edges;
}

/** Bin index of x: the number of edges strictly below x, so x equal to an edge falls in the lower bin. */
export function binIndex(edges: number[], x: number): number {
  let lo = 0;
  let hi = edges.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (edges[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Share of values in each bin (edges.length + 1 bins; the first and last are open-ended). */
export function binShares(edges: number[], xs: ArrayLike<number>): number[] {
  const counts = new Array(edges.length + 1).fill(0);
  for (let i = 0; i < xs.length; i++) counts[binIndex(edges, xs[i])]++;
  return counts.map((c) => c / xs.length);
}

/** Smallest share allowed in a bin, so an empty bin does not make PSI infinite. */
export const PSI_FLOOR = 1e-4;

/** Population stability index from two lists of bin shares: the sum of (actual - expected) x ln(actual / expected). */
export function psiFromShares(expected: number[], actual: number[]): number {
  let total = 0;
  for (let i = 0; i < expected.length; i++) {
    const e = Math.max(expected[i], PSI_FLOOR);
    const a = Math.max(actual[i], PSI_FLOOR);
    total += (a - e) * Math.log(a / e);
  }
  return total;
}

/** PSI of a current sample against a reference, using bins that hold equal shares of the reference. */
export function psi(refSorted: ArrayLike<number>, current: ArrayLike<number>, bins = 10): number {
  const edges = quantileEdges(refSorted, bins);
  return psiFromShares(binShares(edges, refSorted), binShares(edges, current));
}

/** Two-sample Kolmogorov-Smirnov statistic: the biggest gap between the two cumulative distributions. Both inputs sorted. */
export function ksStatistic(aSorted: ArrayLike<number>, bSorted: ArrayLike<number>): number {
  const n = aSorted.length;
  const m = bSorted.length;
  let i = 0;
  let j = 0;
  let d = 0;
  while (i < n && j < m) {
    const x = Math.min(aSorted[i], bSorted[j]);
    while (i < n && aSorted[i] <= x) i++;
    while (j < m && bSorted[j] <= x) j++;
    d = Math.max(d, Math.abs(i / n - j / m));
  }
  return d;
}

/** The Kolmogorov distribution's upper tail, Q(z) = 2 x sum of (-1)^(k-1) exp(-2 k^2 z^2). Same as scipy.special.kolmogorov. */
export function kolmogorovSf(z: number): number {
  if (z <= 0) return 1;
  if (z < 1.18) {
    // Series in exp(-(2k-1)^2 pi^2 / (8 z^2)), which converges fast for small z.
    const y = Math.exp((-Math.PI * Math.PI) / (8 * z * z));
    let sum = 0;
    for (let k = 1; k <= 25; k++) sum += Math.pow(y, (2 * k - 1) * (2 * k - 1));
    return Math.min(1, Math.max(0, 1 - (Math.sqrt(2 * Math.PI) / z) * sum));
  }
  let sum = 0;
  for (let k = 1; k <= 25; k++) {
    const term = Math.exp(-2 * k * k * z * z);
    sum += (k % 2 === 1 ? 1 : -1) * term;
    if (term < 1e-18) break;
  }
  return Math.min(1, Math.max(0, 2 * sum));
}

/** Asymptotic two-sided p-value of the KS test from the limiting Kolmogorov distribution (scipy.stats.kstwobign). Close to exact tests when both samples are large. */
export function ksPValue(d: number, n: number, m: number): number {
  return kolmogorovSf(Math.sqrt((n * m) / (n + m)) * d);
}

/** Share of the population the standard normal puts below x. Abramowitz and Stegun 7.1.26 via erf, accurate to about 1.5e-7. */
export function normalCdf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  const erf = 1 - poly * Math.exp((-x * x) / 2);
  return x >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

/** The KS statistic you would expect between two normals with the same spread whose means differ by `shift` standard deviations: 2 x Phi(shift / 2) - 1. */
export const expectedKsForShift = (shift: number): number => 2 * normalCdf(Math.abs(shift) / 2) - 1;

/** The standard normal's deciles (its 10 percent, 20 percent ... 90 percent points), which are the PSI bin edges when the reference is a standard normal. */
const NORMAL_DECILES = [-1.2815515655446004, -0.8416212335729142, -0.5244005127080409, -0.2533471031357997, 0, 0.2533471031357997, 0.5244005127080407, 0.8416212335729143, 1.2815515655446004];

/** The PSI you would see, with infinite data, if a standard normal reference became a normal with the given mean shift and spread ratio. Ten equal-frequency bins. */
export function expectedPsi(meanShift: number, sdRatio = 1): number {
  const cum = [0, ...NORMAL_DECILES.map((q) => normalCdf((q - meanShift) / sdRatio)), 1];
  const expected = new Array(10).fill(0.1);
  const actual = cum.slice(1).map((c, i) => c - cum[i]);
  return psiFromShares(expected, actual);
}

/** Chance that at least one of k independent tests fires by luck, each at significance level alpha: 1 - (1 - alpha)^k. */
export const chanceOfAnyFalseAlarm = (k: number, alpha: number): number => 1 - Math.pow(1 - alpha, k);

/* ---------- detector settings ---------- */

export type Method = 'psi' | 'ks' | 'ksp';

export const METHODS: { id: Method; label: string; hint: string }[] = [
  { id: 'psi', label: 'PSI', hint: 'Population stability index: how far the share of values in each reference decile has moved.' },
  { id: 'ks', label: 'KS statistic', hint: 'The largest gap between the two cumulative distributions. A size of difference, from 0 to 1.' },
  { id: 'ksp', label: 'KS p-value', hint: 'The chance of a gap this big if nothing had changed. Alert when it falls below your cut-off.' },
];

/** Threshold choices per method. For "ksp" the value is the significance level alpha (alert when p < alpha). */
export const THRESHOLDS: Record<Method, number[]> = {
  psi: [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.5, 1],
  ks: [0.03, 0.05, 0.075, 0.1, 0.15, 0.2, 0.3, 0.4],
  ksp: [0.05, 0.01, 0.001, 0.0001, 0.000001],
};

export const WINDOWS = [1, 3, 7, 14] as const;
export const SAMPLE_SIZES = [50, 200, 1000] as const;
export const LABEL_DELAYS = [0, 7, 14, 30] as const;

export type Settings = { method: Method; threshold: number; window: number; n: number };

/* ---------- scenarios ---------- */

export const DAYS = 120;
export const REF_DAYS = 30;
const BASE_MEAN = 20;
const BASE_SD = 5;
export const BASE_ACC = 0.92;
/** An accuracy this far under the baseline counts as real harm. */
export const ACC_DROP = 0.04;
/** Labelled outcomes per day, for the label-delay model (invented). */
export const LABELLED_PER_DAY = 200;
const ACC_WINDOW = 7;

export type Decision = 'retrain' | 'fix-upstream' | 'adjust-monitor';

export const DECISIONS: { id: Decision; label: string }[] = [
  { id: 'retrain', label: 'Retrain on recent data' },
  { id: 'fix-upstream', label: 'Fix the data upstream, keep the model' },
  { id: 'adjust-monitor', label: 'Leave the model, change the monitor' },
];

export type Scenario = {
  id: string;
  name: string;
  story: string;
  /** What the upstream check finds once an alert makes you look. */
  finding: string;
  correct: Decision;
  why: string;
  seed: number;
  /** First day the data really changes, or null if it never does. Shown on the chart once revealed. */
  eventDay: number | null;
  /** First day the change is big enough to count as a signal: alerts before it are scored as false alarms. */
  signalDay: number | null;
  /** Mean of the feature on a given day, in raw units, and a spread multiplier, plus an affine map for the unit bug. */
  shift: (day: number) => { mean: number; scale: number; offset: number };
  /** Accuracy the model would have on a given day, before sampling noise. */
  accuracy: (day: number) => number;
};

const sd = BASE_SD;
/** Invented link between how far the feature has moved (in standard deviations) and how much accuracy the model loses. */
const accuracyAt = (shiftSigma: number) => BASE_ACC - 0.12 * Math.min(1, Math.abs(shiftSigma));
const creep = (d: number) => Math.min(1, Math.max(0, (d - 50) / 60));

export const SCENARIOS: Scenario[] = [
  {
    id: 'sudden',
    name: 'Sudden shift',
    story: 'On day 60 a batch of new machines goes live and the sensor reads about half a standard deviation warmer.',
    finding: 'The pipeline is unchanged and the raw readings really are higher: new hardware.',
    correct: 'retrain',
    why: 'Real change in the world, and the model is now wrong about it, so it needs fresh labelled data.',
    seed: 1101,
    eventDay: 60,
    signalDay: 60,
    shift: (d) => ({ mean: BASE_MEAN + (d >= 60 ? 0.5 * sd : 0), scale: 1, offset: 0 }),
    accuracy: (d) => accuracyAt(d >= 60 ? 0.5 : 0),
  },
  {
    id: 'gradual',
    name: 'Slow creep',
    story: 'From day 50 the sensor ages and reads a little higher each day, reaching one standard deviation by day 110.',
    finding: 'The pipeline is unchanged. The readings drift up steadily as sensors age.',
    correct: 'retrain',
    why: 'Real, slow change. Retrain on recent labels, and consider a regular retraining schedule.',
    seed: 2202,
    eventDay: 50,
    signalDay: 60,
    shift: (d) => ({ mean: BASE_MEAN + sd * creep(d), scale: 1, offset: 0 }),
    accuracy: (d) => accuracyAt(creep(d)),
  },
  {
    id: 'weekly',
    name: 'Weekly rhythm, no drift',
    story: 'Nothing is wrong. The sensor runs a little warmer at the start of each week and cooler at the end, and the model copes.',
    finding: 'The same weekly wave appears in last year\'s data. Accuracy on labelled outcomes is unchanged.',
    correct: 'adjust-monitor',
    why: 'Nothing is broken. Compare against a window that covers whole weeks, or a longer reference, instead of retraining.',
    seed: 3303,
    eventDay: null,
    signalDay: null,
    shift: (d) => ({ mean: BASE_MEAN + 0.35 * sd * Math.sin((2 * Math.PI * d) / 7), scale: 1, offset: 0 }),
    accuracy: () => BASE_ACC,
  },
  {
    id: 'bug',
    name: 'Unit change bug',
    story: 'On day 70 a firmware update makes the sensor report degrees Fahrenheit instead of Celsius.',
    finding: 'The release notes show the sensor now sends Fahrenheit. The world did not change; the data format did.',
    correct: 'fix-upstream',
    why: 'Retraining would teach the model the bug. Fix or convert the feed and keep the model.',
    seed: 4404,
    eventDay: 70,
    signalDay: 70,
    shift: (d) => (d >= 70 ? { mean: BASE_MEAN, scale: 1.8, offset: 32 } : { mean: BASE_MEAN, scale: 1, offset: 0 }),
    accuracy: (d) => (d >= 70 ? 0.55 : BASE_ACC),
  },
];

export const scenarioById = (id: string): Scenario => SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];

/** First day on which the model's expected accuracy is at least ACC_DROP below baseline, or null. */
export function harmDay(scn: Scenario): number | null {
  for (let d = 0; d < DAYS; d++) if (BASE_ACC - scn.accuracy(d) >= ACC_DROP - 1e-12) return d;
  return null;
}

/** Feature value drawn for one day: (mean + sd x z) mapped through the scenario's affine change. */
function dayValues(scn: Scenario, day: number, n: number): Float64Array {
  const z = normals(scn.seed * 7919 + day * 104729 + n, n);
  const { mean, scale, offset } = scn.shift(day);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = (mean + BASE_SD * z[i]) * scale + offset;
  return out;
}

const streamCache = new Map<string, { days: Float64Array[]; refSorted: Float64Array; edges: number[]; refShares: number[] }>();

export function streamFor(scn: Scenario, n: number) {
  const key = `${scn.id}:${n}`;
  let s = streamCache.get(key);
  if (!s) {
    const days: Float64Array[] = [];
    for (let d = 0; d < DAYS; d++) days.push(dayValues(scn, d, n));
    const pooled = new Float64Array(REF_DAYS * n);
    for (let d = 0; d < REF_DAYS; d++) pooled.set(days[d], d * n);
    const refSorted = pooled.sort();
    const edges = quantileEdges(refSorted, 10);
    s = { days, refSorted, edges, refShares: binShares(edges, refSorted) };
    streamCache.set(key, s);
  }
  return s;
}

export type DayStat = { day: number; psi: number; ks: number; p: number };

const statCache = new Map<string, DayStat[]>();

/** All three statistics for every monitored day, pooling the last `window` days against the 30-day reference. */
export function statSeries(scn: Scenario, n: number, window: number): DayStat[] {
  const key = `${scn.id}:${n}:${window}`;
  const hit = statCache.get(key);
  if (hit) return hit;
  const { days, refSorted, edges, refShares } = streamFor(scn, n);
  const out: DayStat[] = [];
  for (let d = REF_DAYS + window - 1; d < DAYS; d++) {
    const pooled = new Float64Array(window * n);
    for (let k = 0; k < window; k++) pooled.set(days[d - window + 1 + k], k * n);
    const sorted = pooled.sort();
    const ks = ksStatistic(refSorted, sorted);
    out.push({
      day: d,
      psi: psiFromShares(refShares, binShares(edges, pooled)),
      ks,
      p: ksPValue(ks, refSorted.length, pooled.length),
    });
  }
  statCache.set(key, out);
  return out;
}

/** The number the chart plots for a method. For the p-value it is -log10 p, so a bigger bar always means stronger evidence. */
export function plotValue(s: DayStat, method: Method): number {
  if (method === 'psi') return s.psi;
  if (method === 'ks') return s.ks;
  return -Math.log10(Math.max(s.p, 1e-300));
}

export function isAlert(s: DayStat, st: Settings): boolean {
  if (st.method === 'psi') return s.psi >= st.threshold;
  if (st.method === 'ks') return s.ks >= st.threshold;
  return s.p < st.threshold;
}

/** The plotted threshold line for a method and threshold. */
export function plotThreshold(method: Method, threshold: number): number {
  return method === 'ksp' ? -Math.log10(threshold) : threshold;
}

/* ---------- label delay ---------- */

/** Accuracy measured on each day's labelled outcomes (binomial noise around the scenario's true accuracy). */
export function dailyAccuracy(scn: Scenario): number[] {
  const rng = makeRng(scn.seed * 31 + 7);
  const out: number[] = [];
  for (let d = 0; d < DAYS; d++) {
    const p = scn.accuracy(d);
    let hits = 0;
    for (let i = 0; i < LABELLED_PER_DAY; i++) if (rng() < p) hits++;
    out.push(hits / LABELLED_PER_DAY);
  }
  return out;
}

/** Average accuracy over the reference period, the level the accuracy monitor compares against. */
export function accuracyBaseline(acc: number[]): number {
  let base = 0;
  for (let d = 0; d < REF_DAYS; d++) base += acc[d];
  return base / REF_DAYS;
}

/**
 * What an accuracy monitor can see on day t when outcome labels arrive `delay` days late: the 7-day
 * average of accuracy up to day t - delay. Null before there is a full window of labelled days
 * after the reference period.
 */
export function visibleAccuracy(acc: number[], delay: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let t = 0; t < DAYS; t++) {
    const last = t - delay;
    if (last - (ACC_WINDOW - 1) < REF_DAYS) {
      out.push(null);
      continue;
    }
    let sum = 0;
    for (let k = 0; k < ACC_WINDOW; k++) sum += acc[last - k];
    out.push(sum / ACC_WINDOW);
  }
  return out;
}

/** First day the delayed accuracy monitor alerts: its 7-day average is ACC_DROP under the reference-period accuracy. */
export function accuracyAlertDay(acc: number[], delay: number): number | null {
  const base = accuracyBaseline(acc);
  const vis = visibleAccuracy(acc, delay);
  for (let t = 0; t < DAYS; t++) {
    const v = vis[t];
    if (v !== null && v <= base - ACC_DROP) return t;
  }
  return null;
}

/* ---------- scoring ---------- */

/** Points are invented weights, not real costs. Lower is better. */
export const COST = { falseAlarmDay: 1, harmDay: 3, wrongDecision: 10 } as const;

export type RunResult = {
  scenario: string;
  /** Days on which the detector fired. */
  alertDays: number[];
  /** First alert on or after the day the change became a real signal, or null. */
  detectedOn: number | null;
  /** Alert days before the change was a real signal (every alert day when nothing changes). */
  falseAlarmDays: number;
  /** Days the model was harmed before anyone was alerted. */
  harmedDays: number;
  /** Points, without any decision penalty. */
  cost: number;
  /** True if the detector fired at all, so a decision is needed. */
  needsDecision: boolean;
};

export function runDetector(scn: Scenario, st: Settings): RunResult {
  const series = statSeries(scn, st.n, st.window);
  const alertDays = series.filter((s) => isAlert(s, st)).map((s) => s.day);
  const event = scn.signalDay;
  const harm = harmDay(scn);
  let detectedOn: number | null = null;
  let falseAlarmDays = 0;
  for (const d of alertDays) {
    if (event !== null && d >= event) {
      detectedOn = d;
      break;
    }
    falseAlarmDays++;
  }
  let harmedDays = 0;
  if (harm !== null) harmedDays = detectedOn === null ? DAYS - harm : Math.max(0, detectedOn - harm);
  return {
    scenario: scn.id,
    alertDays,
    detectedOn,
    falseAlarmDays,
    harmedDays,
    cost: falseAlarmDays * COST.falseAlarmDay + harmedDays * COST.harmDay,
    needsDecision: event === null ? alertDays.length > 0 : detectedOn !== null,
  };
}

/** Total cost across all four scenarios with one set of settings, assuming every decision is right. */
export function totalCost(st: Settings): { total: number; runs: RunResult[] } {
  const runs = SCENARIOS.map((s) => runDetector(s, st));
  return { total: runs.reduce((a, r) => a + r.cost, 0), runs };
}

/** The cheapest settings on the grid, for the given sample size. Ties go to the earlier (simpler) setting. */
export function bestSettings(n: number): { settings: Settings; total: number } {
  let best: { settings: Settings; total: number } | null = null;
  for (const m of METHODS) {
    for (const w of WINDOWS) {
      for (const t of THRESHOLDS[m.id]) {
        const settings: Settings = { method: m.id, threshold: t, window: w, n };
        const { total } = totalCost(settings);
        if (!best || total < best.total) best = { settings, total };
      }
    }
  }
  return best as { settings: Settings; total: number };
}

/** Which threshold index is the sensible starting point for each method. */
export const DEFAULT_THRESHOLD: Record<Method, number> = { psi: 0.2, ks: 0.15, ksp: 0.01 };

export const fmtThreshold = (method: Method, t: number): string => {
  if (method === 'ksp') return `p < ${t < 0.001 ? t.toExponential(0).replace('e-', ' x 10^-') : t}`;
  return String(t);
};

/* ---------- the "slider" demo: reference against a current sample ---------- */

export const SLIDER_REF_N = 2000;
const SLIDER_MAX_N = 20000;
let sliderZ: number[] | null = null;
let sliderRef: Float64Array | null = null;

function sliderData() {
  if (!sliderZ) {
    sliderZ = normals(777, SLIDER_MAX_N);
    sliderRef = sortedCopy(normals(555, SLIDER_REF_N));
  }
  return { z: sliderZ, ref: sliderRef as Float64Array };
}

export type SliderResult = {
  psi: number;
  ks: number;
  p: number;
  refCounts: number[];
  curCounts: number[];
  edges: number[];
};

export const HIST_MIN = -5;
export const HIST_MAX = 5;
export const HIST_BINS = 25;

function histogram(xs: ArrayLike<number>): number[] {
  const out = new Array(HIST_BINS).fill(0);
  for (let i = 0; i < xs.length; i++) {
    const k = Math.floor(((xs[i] - HIST_MIN) / (HIST_MAX - HIST_MIN)) * HIST_BINS);
    out[Math.min(HIST_BINS - 1, Math.max(0, k))]++;
  }
  return out.map((c) => c / xs.length);
}

/** Reference: 2,000 standard normal values. Current: `n` values from a normal with the given mean shift and spread ratio, built from the same fixed draws so sliding is smooth. */
export function sliderStats(meanShift: number, sdRatio: number, n: number): SliderResult {
  const { z, ref } = sliderData();
  const cur = new Float64Array(n);
  for (let i = 0; i < n; i++) cur[i] = meanShift + sdRatio * z[i];
  const curSorted = cur.slice().sort();
  const edges = quantileEdges(ref, 10);
  const ks = ksStatistic(ref, curSorted);
  return {
    psi: psiFromShares(binShares(edges, ref), binShares(edges, cur)),
    ks,
    p: ksPValue(ks, ref.length, n),
    refCounts: histogram(ref),
    curCounts: histogram(cur),
    edges,
  };
}

/** The traffic-light band for a PSI value under the common 0.1 and 0.25 rules of thumb. */
export function psiBand(v: number): 'stable' | 'moderate' | 'large' {
  if (v < 0.1) return 'stable';
  if (v < 0.25) return 'moderate';
  return 'large';
}
