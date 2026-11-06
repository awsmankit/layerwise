/**
 * What if nobody watches the model after launch? A SIMULATION, not a measurement of any real product.
 * One input feature, two classes, a classifier fixed on launch day. The inputs slowly shift each day.
 * A monitor that needs no labels compares the recent input average with the launch data and alerts.
 * Accuracy is known here only because we made the data; a real team usually has no labels.
 */

export const DAYS = 120;
export const PER_DAY = 200;
/** Class centres sit at -GAP/2 and +GAP/2, spread (standard deviation) 1. The model says "class B" when x > 0. */
export const GAP = 3;
export const WINDOW = 7;
/** Users complain when the 7-day accuracy drops below this (an example assumption). */
export const COMPLAINT_ACCURACY = 0.85;
/** The monitor alerts when the 7-day input average has moved this many launch-day standard deviations. */
export const ALERT_SHIFT = 0.2;

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

function gauss(r: () => number): number {
  const u = Math.max(r(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}

/** Standard normal cumulative distribution (Abramowitz and Stegun 7.1.26 for erf). */
export function normCdf(x: number): number {
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * z);
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  const erf = 1 - poly * Math.exp(-z * z);
  return 0.5 * (1 + (x >= 0 ? erf : -erf));
}

/** Exact accuracy of the launch-day classifier when every input has shifted by s. */
export function expectedAccuracy(shift: number, gap = GAP): number {
  return (normCdf(gap / 2 - shift) + normCdf(gap / 2 + shift)) / 2;
}

/** Standard deviation of the launch-day inputs (two classes, mixed 50/50). */
export const refSd = Math.sqrt(1 + (GAP / 2) ** 2);

export type Sim = {
  rate: number;
  /** accuracy each day, from that day's 200 labelled examples */
  daily: number[];
  /** accuracy averaged over the last 7 days */
  acc: number[];
  /** the monitor's number: how far the 7-day input average moved, in launch-day standard deviations */
  shift: number[];
  /** first day the monitor alerts, or null */
  alertDay: number | null;
  /** first day the 7-day accuracy is under the complaint line, or null */
  complaintDay: number | null;
};

/** Run the simulation. `rate` is how far the inputs move each day (in the same units as the class gap of 3). */
export function simulate(rate: number, days = DAYS, perDay = PER_DAY, seed = 3): Sim {
  const daily: number[] = [];
  const means: number[] = [];
  for (let d = 0; d < days; d++) {
    // one noise stream per day, so changing the drift speed keeps the same random draws
    const r = rng(seed * 1000 + d);
    const s = rate * d;
    let right = 0;
    let sum = 0;
    for (let i = 0; i < perDay; i++) {
      const isB = r() < 0.5;
      const x = (isB ? GAP / 2 : -GAP / 2) + s + gauss(r);
      sum += x;
      if ((x > 0) === isB) right++;
    }
    daily.push(right / perDay);
    means.push(sum / perDay);
  }
  const avg = (a: number[], d: number) => {
    const from = Math.max(0, d - WINDOW + 1);
    let t = 0;
    for (let i = from; i <= d; i++) t += a[i];
    return t / (d - from + 1);
  };
  const acc = daily.map((_, d) => avg(daily, d));
  const shift = means.map((_, d) => Math.abs(avg(means, d)) / refSd);
  let alertDay: number | null = null;
  let complaintDay: number | null = null;
  for (let d = 0; d < days; d++) {
    if (alertDay === null && d >= WINDOW - 1 && shift[d] > ALERT_SHIFT) alertDay = d;
    if (complaintDay === null && d >= WINDOW - 1 && acc[d] < COMPLAINT_ACCURACY) complaintDay = d;
  }
  return { rate, daily, acc, shift, alertDay, complaintDay };
}

/** Days of warning the monitor gives before users complain; null when either never happens. */
export function warningDays(sim: Sim): number | null {
  return sim.alertDay !== null && sim.complaintDay !== null ? sim.complaintDay - sim.alertDay : null;
}
