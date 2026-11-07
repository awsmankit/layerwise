/**
 * What if devices can never be updated over the air (OTA)? A SIMULATION with made-up example numbers, not data from any product.
 * A fleet of 2,000 devices ships with a bug that is found on day 0 (days are counted from the day the bug was found).
 * A fix is ready on day 3. A device only gets it when it next connects. Some devices connect almost daily, some rarely.
 * Without OTA, the only fix is a recall: the owner has to send the device back, which a small share of owners do each day.
 * Every figure on the page comes from these functions. Deterministic: no Math.random.
 */

export const FLEET = 2000;
/** Days shown, counted from the day the bug was found. */
export const HORIZON = 90;
/** Days from finding the bug to a tested fix (example). */
export const FIX_READY = 3;
/** Days each stage of a staged rollout is watched before the next one opens (example). */
export const HOLD = 3;
/** If the fix itself is bad, problems are recognised at the end of this day (the first stage's watching window). */
export const DETECT_DAY = FIX_READY + HOLD - 1;
/** A recall needs time to set up, then each owner returns the device with this chance each day (example). */
export const RECALL_START = 10;
export const RECALL_RATE = 0.005;
/** How devices connect: share of the fleet, and the chance a device connects on any given day (example). */
export const COHORTS = [
  { name: 'connects most days', share: 0.5, p: 0.5 },
  { name: 'connects now and then', share: 0.3, p: 0.1 },
  { name: 'mostly offline', share: 0.2, p: 0.02 },
] as const;
/** First-stage sizes the slider offers, in percent of the fleet. 100 means everyone at once. */
export const FIRST_STAGES = [1, 5, 10, 25, 50, 100] as const;

/** A fixed pseudo-random number in [0, 1) for a device and a purpose. Same input, same output, on server and browser. */
export function unit(device: number, salt: number): number {
  let t = (Math.imul(device + 1, 0x9e3779b1) ^ Math.imul(salt + 7, 0x85ebca6b)) >>> 0;
  for (let r = 0; r < 3; r++) {
    t = (t + 0x6d2b79f5) >>> 0;
    let z = t;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    t = (z ^ (z >>> 14)) >>> 0;
  }
  return t / 4294967296;
}

type Device = { p: number; rank: number };
let devices: Device[] | null = null;
function fleet(): Device[] {
  if (devices) return devices;
  devices = Array.from({ length: FLEET }, (_, i) => {
    const u = unit(i, 1);
    let acc = 0;
    let p: number = COHORTS[COHORTS.length - 1].p;
    for (const c of COHORTS) {
      acc += c.share;
      if (u < acc) {
        p = c.p;
        break;
      }
    }
    return { p, rank: unit(i, 2) };
  });
  return devices;
}

/** First day on or after `from` that device i connects, or null if it does not connect in the horizon. */
export function firstConnect(i: number, from: number): number | null {
  const p = fleet()[i].p;
  for (let d = Math.max(0, from); d <= HORIZON; d++) if (unit(i, 1000 + d) < p) return d;
  return null;
}

export type Stage = { share: number; start: number };

/** Stages of a staged rollout: first the given percent, then half the fleet, then everyone, each after HOLD days of watching. */
export function schedule(firstPercent: number): Stage[] {
  if (firstPercent >= 100) return [{ share: 1, start: FIX_READY }];
  const stages: Stage[] = [{ share: firstPercent / 100, start: FIX_READY }];
  let next = FIX_READY + HOLD;
  if (firstPercent < 50) {
    stages.push({ share: 0.5, start: next });
    next += HOLD;
  }
  stages.push({ share: 1, start: next });
  return stages;
}

/** The day device i is first offered the fix. */
function offeredDay(i: number, stages: Stage[]): number {
  const rank = fleet()[i].rank;
  for (const s of stages) if (rank < s.share) return s.start;
  return stages[stages.length - 1].start;
}

export type Rollout = {
  firstPercent: number;
  badFix: boolean;
  /** day each device got the update (null: not within the horizon, or the rollout was halted before it) */
  got: (number | null)[];
  /** day each device got the rollback of a bad update (null if never, or if it never had the bad update) */
  rolledBack: (number | null)[];
  /** share of the fleet running the update (good fix) by day 0..HORIZON */
  fixed: number[];
  /** share of the fleet running the bad update, by day */
  onBad: number[];
};

export function rollout(firstPercent: number, badFix: boolean): Rollout {
  const stages = schedule(firstPercent);
  const got: (number | null)[] = [];
  const rolledBack: (number | null)[] = [];
  for (let i = 0; i < FLEET; i++) {
    let g = firstConnect(i, offeredDay(i, stages));
    // a bad update is spotted at the end of DETECT_DAY and the rollout halts: later devices never get it
    if (badFix && g !== null && g > DETECT_DAY) g = null;
    got.push(g);
    rolledBack.push(badFix && g !== null ? firstConnect(i, DETECT_DAY + 1) : null);
  }
  const fixed: number[] = [];
  const onBad: number[] = [];
  for (let d = 0; d <= HORIZON; d++) {
    let f = 0;
    let b = 0;
    for (let i = 0; i < FLEET; i++) {
      const g = got[i];
      if (g === null || g > d) continue;
      if (!badFix) f++;
      else if (rolledBack[i] === null || rolledBack[i]! > d) b++;
    }
    fixed.push(f / FLEET);
    onBad.push(b / FLEET);
  }
  return { firstPercent, badFix, got, rolledBack, fixed, onBad };
}

/** Day each device's owner returns it in a recall (null: not within the horizon). */
export function recallDay(i: number): number | null {
  for (let d = RECALL_START; d <= HORIZON; d++) if (unit(i, 5000 + d) < RECALL_RATE) return d;
  return null;
}

/** Share of the fleet fixed by recall, by day 0..HORIZON. */
export function recallCurve(): number[] {
  const days = Array.from({ length: FLEET }, (_, i) => recallDay(i));
  return Array.from({ length: HORIZON + 1 }, (_, d) => days.filter((x) => x !== null && x <= d).length / FLEET);
}

/** The expected recall share for comparison: 1 - (1 - rate)^(days since the recall opened). */
export function recallExpected(day: number): number {
  return day < RECALL_START ? 0 : 1 - Math.pow(1 - RECALL_RATE, day - RECALL_START + 1);
}

/** First day a curve reaches the target share, or null. */
export function daysToShare(curve: number[], target: number): number | null {
  const d = curve.findIndex((v) => v >= target);
  return d < 0 ? null : d;
}

export type DotState = 'bug' | 'fixed' | 'bad';

/** State of device i on a day, for the dot grid. mode: 'ota' with a rollout, or 'recall'. */
export function deviceState(i: number, day: number, r: Rollout | null): DotState {
  if (r === null) {
    const d = recallDay(i);
    return d !== null && d <= day ? 'fixed' : 'bug';
  }
  const g = r.got[i];
  if (g === null || g > day) return 'bug';
  if (!r.badFix) return 'fixed';
  const rb = r.rolledBack[i];
  return rb === null || rb > day ? 'bad' : 'bug';
}

/** How many of the dots (every 10th device) to draw. */
export const DOT_STEP = 10;
