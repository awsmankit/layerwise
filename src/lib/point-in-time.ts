/*
 * Point-in-time join demo. A feature is a time series of values, and each labelled event needs the value
 * the system would have known at that moment. All customers, dates and numbers are invented for the lesson:
 * card utilisation (percent of the credit limit in use) for a made-up loan-default model.
 */

export type Update = { day: number; value: number };
export type LabelledEvent = { day: number; defaulted: boolean };
export type Customer = { name: string; updates: Update[]; events: LabelledEvent[] };

export const CUSTOMERS: Customer[] = [
  { name: 'Asha', updates: [{ day: 10, value: 30 }, { day: 40, value: 28 }, { day: 70, value: 31 }, { day: 100, value: 29 }, { day: 130, value: 30 }, { day: 160, value: 27 }], events: [{ day: 50, defaulted: false }, { day: 120, defaulted: false }] },
  { name: 'Ben', updates: [{ day: 10, value: 35 }, { day: 40, value: 45 }, { day: 70, value: 55 }, { day: 100, value: 95 }, { day: 130, value: 98 }, { day: 160, value: 99 }], events: [{ day: 75, defaulted: true }] },
  { name: 'Chen', updates: [{ day: 5, value: 40 }, { day: 35, value: 42 }, { day: 65, value: 50 }, { day: 95, value: 60 }, { day: 125, value: 97 }, { day: 155, value: 99 }], events: [{ day: 110, defaulted: true }] },
  { name: 'Dana', updates: [{ day: 15, value: 20 }, { day: 45, value: 22 }, { day: 75, value: 25 }, { day: 105, value: 21 }, { day: 135, value: 23 }, { day: 165, value: 24 }], events: [{ day: 30, defaulted: false }, { day: 90, defaulted: false }] },
  { name: 'Eli', updates: [{ day: 20, value: 60 }, { day: 50, value: 82 }, { day: 80, value: 90 }, { day: 110, value: 96 }, { day: 140, value: 99 }], events: [{ day: 85, defaulted: true }] },
];

export type JoinMode = 'latest' | 'asof';

export type Joined = {
  customer: string;
  eventDay: number;
  defaulted: boolean;
  /** the update that was joined, or null when none qualifies */
  used: Update | null;
  /** true when the joined value was recorded after the event */
  fromFuture: boolean;
  /** days between the value being recorded and the event (negative for the future) */
  age: number | null;
};

/** The value known at `day`: the newest update on or before it, no older than `ttl` days (if given). */
export function asOf(updates: Update[], day: number, ttl?: number): Update | null {
  let best: Update | null = null;
  for (const u of updates) {
    if (u.day <= day && (best === null || u.day > best.day)) best = u;
  }
  if (best && ttl !== undefined && day - best.day > ttl) return null;
  return best;
}

/** The newest update there is, whatever the event date: the mistake. */
export function latest(updates: Update[]): Update | null {
  let best: Update | null = null;
  for (const u of updates) if (best === null || u.day > best.day) best = u;
  return best;
}

export function join(customers: Customer[], mode: JoinMode, ttl?: number): Joined[] {
  const out: Joined[] = [];
  for (const c of customers) {
    for (const e of c.events) {
      const used = mode === 'latest' ? latest(c.updates) : asOf(c.updates, e.day, ttl);
      out.push({ customer: c.name, eventDay: e.day, defaulted: e.defaulted, used, fromFuture: used !== null && used.day > e.day, age: used ? e.day - used.day : null });
    }
  }
  return out;
}

export const RULE_THRESHOLD = 80;

/** The rule a model might learn: predict default when utilisation is above 80. No value means no prediction of default. */
export function ruleAccuracy(rows: Joined[], threshold = RULE_THRESHOLD): { correct: number; total: number; caught: number; defaults: number } {
  let correct = 0;
  let caught = 0;
  let defaults = 0;
  for (const r of rows) {
    const predicted = r.used !== null && r.used.value > threshold;
    if (predicted === r.defaulted) correct++;
    if (r.defaulted) {
      defaults++;
      if (predicted) caught++;
    }
  }
  return { correct, total: rows.length, caught, defaults };
}
