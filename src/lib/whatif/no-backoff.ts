/**
 * What if clients retry immediately when the server is overloaded?
 *
 * A small deterministic discrete-time simulation. Each tick the server is offered new requests plus the retries
 * that are due. Below its capacity it serves them all. Above it, it also wastes some work on every request it has
 * to turn away, so the more it is overloaded the less it actually serves. All numbers are EXAMPLES chosen to show
 * the shape, not measurements of any real service.
 */

export type Strategy = 'immediate' | 'backoff';

export const config = {
  /** Requests the server can finish per tick when it is not overloaded. */
  capacity: 20,
  /** New requests per tick in normal times, below capacity. */
  baseArrivals: 14,
  /** A short burst of extra demand: ticks [spikeStart, spikeEnd) have this many new requests each. */
  spikeStart: 5,
  spikeEnd: 10,
  spikeArrivals: 40,
  /** Share of one request's work wasted on turning away a request (parsing, queueing, an error reply). */
  rejectCost: 0.1,
  /** A client gives up this many ticks after its first try. */
  deadline: 40,
  /** Backoff: the wait before retry k is a random whole number of ticks from 1 to min(maxWait, 2^k). */
  maxWait: 16,
  ticks: 80,
  seed: 7,
} as const;

export type Config = { [K in keyof typeof config]: number };

/** Small seeded generator (mulberry32) so the same inputs always give the same run. */
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

/** How many of `offered` requests the server finishes this tick. Overload wastes capacity on the rejects. */
export function served(offered: number, c: Config = config): number {
  if (offered <= c.capacity) return offered;
  return Math.max(0, Math.floor((c.capacity - c.rejectCost * offered) / (1 - c.rejectCost)));
}

export const newArrivals = (tick: number, c: Config = config) => (tick >= c.spikeStart && tick < c.spikeEnd ? c.spikeArrivals : c.baseArrivals);

export type Tick = {
  tick: number;
  /** New requests plus retries that hit the server this tick. */
  offered: number;
  /** Requests finished. */
  served: number;
  /** Requests turned away this tick (they will retry). */
  rejected: number;
  /** Requests still waiting to retry after this tick. */
  waiting: number;
  /** Total clients that have given up so far. */
  gaveUp: number;
  /** Total requests finished so far. */
  done: number;
};

type Req = { born: number; fails: number; due: number };

export function simulate(strategy: Strategy, c: Config = config): Tick[] {
  const rand = rng(c.seed);
  let pending: Req[] = [];
  let gaveUp = 0;
  let done = 0;
  const out: Tick[] = [];
  for (let tick = 0; tick < c.ticks; tick++) {
    const fresh = newArrivals(tick, c);
    const due = pending.filter((r) => r.due <= tick);
    const later = pending.filter((r) => r.due > tick);
    const queue: Req[] = [...due.sort((a, b) => a.born - b.born)];
    for (let i = 0; i < fresh; i++) queue.push({ born: tick, fails: 0, due: tick });
    const offered = queue.length;
    const ok = served(offered, c);
    done += ok;
    const retry: Req[] = [];
    for (const r of queue.slice(ok)) {
      const fails = r.fails + 1;
      const wait = strategy === 'immediate' ? 1 : 1 + Math.floor(rand() * Math.min(c.maxWait, 2 ** fails));
      if (tick + wait - r.born > c.deadline) gaveUp++;
      else retry.push({ born: r.born, fails, due: tick + wait });
    }
    pending = [...later, ...retry];
    out.push({ tick, offered, served: ok, rejected: offered - ok, waiting: pending.length, gaveUp, done });
  }
  return out;
}

export type Summary = {
  peakOffered: number;
  peakWaiting: number;
  finalServed: number;
  gaveUp: number;
  done: number;
  /** First tick after the spike from which no request is turned away any more, or null if that never happens. */
  recoveredAt: number | null;
};

export function summarise(run: Tick[], c: Config = config): Summary {
  const last = run[run.length - 1];
  const rec = run.find((t) => t.tick >= c.spikeEnd && run.slice(t.tick).every((u) => u.rejected === 0));
  return {
    peakOffered: Math.max(...run.map((t) => t.offered)),
    peakWaiting: Math.max(...run.map((t) => t.waiting)),
    finalServed: last.served,
    gaveUp: last.gaveUp,
    done: last.done,
    recoveredAt: rec ? rec.tick : null,
  };
}

/** First tick from which the server finishes nothing at all for the rest of the run, or null. */
export function stalledFrom(run: Tick[]): number | null {
  const t = run.find((u) => run.slice(u.tick).every((v) => v.served === 0));
  return t ? t.tick : null;
}

/** A round upper limit for the chart: the highest offered load in either run, rounded up to the next 100. */
export function chartMax(runs: Tick[][]): number {
  return Math.ceil(Math.max(...runs.flatMap((r) => r.map((t) => t.offered))) / 100) * 100;
}
