/**
 * What if the server count never changes?
 *
 * A deterministic simulation of one day of traffic with two daily peaks. Time moves in 10-minute ticks.
 * One server handles a fixed number of requests per second. Requests above the paid capacity are turned away.
 * Autoscaling follows the Kubernetes rule desired = ceil(current load / target load per server), looks at the
 * load one tick late, scales down only after a stabilisation window, and new servers take a few ticks to start.
 * Every figure here (traffic, server speed, price, delays) is an EXAMPLE chosen to show the shape.
 */

export const config = {
  tickMinutes: 10,
  ticks: 144,
  /** Example: requests per second that one server can finish. */
  perServer: 10,
  /** Autoscaling aims to keep each server at 70% of that: 7 requests per second. */
  targetPerServer: 7,
  /** Example rental price per server per hour, in dollars. Booting servers are billed too. */
  pricePerHour: 2.5,
  /** The autoscaler sees the load of the previous tick. */
  metricLagTicks: 1,
  /** Scale down only to the highest value wanted over this many ticks (30 minutes). */
  stabilisationTicks: 3,
  minServers: 1,
};

export type Config = typeof config;

const bump = (x: number, centre: number, width: number) => Math.exp(-((x - centre) * (x - centre)) / (2 * width * width));

/** Requests per second at tick t: a quiet floor of 12, a morning bump, a broad afternoon peak and one sudden evening rush. Whole numbers. */
export function demandAt(t: number, c: Config = config): number {
  const hour = ((t + 0.5) * c.tickMinutes) / 60;
  return Math.round(12 + 60 * bump(hour, 14, 3) + 24 * bump(hour, 9.5, 1.5) + 60 * bump(hour, 20, 0.25));
}

export const demandSeries = (c: Config = config): number[] => Array.from({ length: c.ticks }, (_, t) => demandAt(t, c));

export type Tick = {
  t: number;
  /** Hour of the day at the start of this tick. */
  hour: number;
  demand: number;
  /** Servers being paid for. */
  billed: number;
  /** Servers that are ready to take traffic. */
  ready: number;
  /** Requests per second the ready servers can finish. */
  capacity: number;
  served: number;
  dropped: number;
};

function finish(t: number, demand: number, billed: number, ready: number, c: Config): Tick {
  const capacity = ready * c.perServer;
  const served = Math.min(demand, capacity);
  return { t, hour: (t * c.tickMinutes) / 60, demand, billed, ready, capacity, served, dropped: demand - served };
}

/** The same number of servers all day. */
export function simulateFixed(servers: number, c: Config = config): Tick[] {
  return demandSeries(c).map((d, t) => finish(t, d, servers, servers, c));
}

/** Servers wanted for a load, by the Kubernetes rule: ceil(load / target per server). */
export const wanted = (load: number, c: Config = config) => Math.max(c.minServers, Math.ceil(load / c.targetPerServer));

/** Autoscaling with `startTicks` of delay between asking for a server and it being ready. */
export function simulateAuto(startTicks: number, c: Config = config): Tick[] {
  const demand = demandSeries(c);
  const want = demand.map((_, t) => wanted(demand[Math.max(0, t - c.metricLagTicks)], c));
  const billed = want.map((_, t) => {
    let m = 0;
    for (let w = 0; w < c.stabilisationTicks && t - w >= 0; w++) m = Math.max(m, want[t - w]);
    return m;
  });
  // new servers are ready `startTicks` after they were asked for; removed servers stop at once
  return demand.map((d, t) => finish(t, d, billed[t], Math.min(billed[t], billed[Math.max(0, t - startTicks)]), c));
}

export type Summary = {
  /** Dollars for the day. */
  cost: number;
  /** Requests in the day, and how many were turned away. */
  requests: number;
  dropped: number;
  droppedShare: number;
  /** Requests finished as a share of the capacity that was paid for. */
  utilisation: number;
  /** Capacity paid for but not used, in dollars. */
  idleCost: number;
  peakDemand: number;
  peakDropped: number;
};

export function summarise(run: Tick[], c: Config = config): Summary {
  const seconds = c.tickMinutes * 60;
  const requests = run.reduce((a, r) => a + r.demand * seconds, 0);
  const dropped = run.reduce((a, r) => a + r.dropped * seconds, 0);
  const served = requests - dropped;
  const paidCapacity = run.reduce((a, r) => a + r.billed * c.perServer * seconds, 0);
  const cost = run.reduce((a, r) => a + (r.billed * c.pricePerHour * c.tickMinutes) / 60, 0);
  const costPerUnit = cost / paidCapacity;
  return {
    cost,
    requests,
    dropped,
    droppedShare: requests > 0 ? dropped / requests : 0,
    utilisation: paidCapacity > 0 ? served / paidCapacity : 0,
    idleCost: (paidCapacity - served) * costPerUnit,
    peakDemand: Math.max(...run.map((r) => r.demand)),
    peakDropped: Math.max(...run.map((r) => r.dropped)),
  };
}

/** Fixed servers needed so that nothing is turned away at the day's peak. */
export function serversForPeak(c: Config = config): number {
  return Math.ceil(Math.max(...demandSeries(c)) / c.perServer);
}

export const fixedChoices = [2, 4, 6, 8, 10, 12, 14] as const;
export const startChoices = [0, 1, 2, 3, 4, 5] as const;

/** Largest value the chart needs on its vertical axis (requests per second), rounded up to a multiple of 20. */
export function chartMax(runs: Tick[][]): number {
  const m = Math.max(...runs.flatMap((r) => r.flatMap((t) => [t.demand, t.capacity])));
  return Math.ceil(m / 20) * 20;
}
