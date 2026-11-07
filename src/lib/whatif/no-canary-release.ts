/**
 * What if every change goes to every user at once?
 *
 * A deterministic simulation in one-minute steps. A bad change breaks a share of the requests that reach it. Two ways to
 * release it: to everyone at minute 0, or as a canary (1% of traffic for 10 minutes, then 5%, then 25%, then everyone,
 * each step only if the monitor stayed quiet). The monitor and the rollback are the same for both:
 *
 *   Alarm rule (checked at the end of every minute): in the last 10 minutes the new version failed at least 20 requests
 *   AND at least 2% of the requests it served.
 *   Rollback: takes 3 minutes from the alarm; the bad version keeps serving its share meanwhile; then it serves none.
 *
 * Counts are expected values (traffic x share x failure share), not random draws, so every run is identical.
 * Traffic and failure share are EXAMPLES chosen by the sliders. One request stands for one user.
 */

export const config = {
  horizonMinutes: 60,
  windowMinutes: 10,
  minFailures: 20,
  minShare: 0.02,
  rollbackMinutes: 3,
  /** The canary ramp: share of traffic on the new version and how many minutes it stays there before the next step. */
  stages: [
    { share: 0.01, minutes: 10 },
    { share: 0.05, minutes: 10 },
    { share: 0.25, minutes: 10 },
  ],
};

export type Config = typeof config;
export type Plan = 'all' | 'canary';

export type Minute = {
  t: number;
  /** Share of traffic on the new version during this minute. */
  exposure: number;
  /** Requests served by the new version. */
  served: number;
  /** Of those, how many failed (users harmed this minute). */
  harmed: number;
  /** Users harmed so far, up to the end of this minute. */
  cumulative: number;
  /** The monitor's view at the end of this minute. */
  windowFailures: number;
  windowShare: number;
  alarm: boolean;
};

export type Run = {
  plan: Plan;
  minutes: Minute[];
  /** Minutes after release when the alarm fired, or null if it never did. */
  alarmAt: number | null;
  /** Minutes after release when the bad version stopped serving, or null. */
  rolledBackAt: number | null;
  harmed: number;
  /** Users harmed by the time the alarm fired. */
  harmedAtAlarm: number | null;
  peakExposure: number;
};

/** Share of traffic the plan wants on the new version in minute t (before any alarm). */
export function plannedExposure(plan: Plan, t: number, c: Config = config): number {
  if (plan === 'all') return 1;
  let start = 0;
  for (const s of c.stages) {
    if (t < start + s.minutes) return s.share;
    start += s.minutes;
  }
  return 1;
}

export function simulate(plan: Plan, failShare: number, ratePerMin: number, c: Config = config): Run {
  const minutes: Minute[] = [];
  let cumulative = 0;
  let alarmAt: number | null = null;
  let rolledBackAt: number | null = null;
  let frozen = 0;
  let harmedAtAlarm: number | null = null;
  for (let t = 0; t < c.horizonMinutes; t++) {
    let exposure: number;
    if (alarmAt === null) exposure = plannedExposure(plan, t, c);
    else if (t < alarmAt + c.rollbackMinutes) exposure = frozen;
    else exposure = 0;
    if (alarmAt !== null && exposure === 0 && rolledBackAt === null) rolledBackAt = t;
    const served = ratePerMin * exposure;
    const harmed = served * failShare;
    cumulative += harmed;
    let windowFailures = 0;
    let windowServed = 0;
    for (let k = Math.max(0, t - c.windowMinutes + 1); k < t; k++) {
      windowFailures += minutes[k].harmed;
      windowServed += minutes[k].served;
    }
    windowFailures += harmed;
    windowServed += served;
    const windowShare = windowServed > 0 ? windowFailures / windowServed : 0;
    const alarm = alarmAt === null && windowFailures >= c.minFailures && windowShare >= c.minShare - 1e-9;
    if (alarm) {
      alarmAt = t + 1;
      frozen = exposure;
      harmedAtAlarm = cumulative;
    }
    minutes.push({ t, exposure, served, harmed, cumulative, windowFailures, windowShare, alarm });
  }
  return {
    plan,
    minutes,
    alarmAt,
    rolledBackAt,
    harmed: cumulative,
    harmedAtAlarm,
    peakExposure: Math.max(...minutes.map((m) => m.exposure)),
  };
}

/** How many times fewer users the canary harmed, or null when the all-at-once run harmed nobody. */
export function harmRatio(failShare: number, ratePerMin: number, c: Config = config): number | null {
  const all = simulate('all', failShare, ratePerMin, c).harmed;
  const can = simulate('canary', failShare, ratePerMin, c).harmed;
  if (all === 0) return null;
  if (can === 0) return Infinity;
  return all / can;
}
