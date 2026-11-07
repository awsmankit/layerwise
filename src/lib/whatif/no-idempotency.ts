/**
 * What if a retry repeats the action? A SCRIPTED, deterministic run of 20 toy orders. For each order the agent calls a
 * "charge the customer" tool. The network can lose the request before it arrives, or lose the server's reply after the
 * server already did the work. If no reply arrives, the agent tries again (up to MAX_ATTEMPTS calls in all).
 * What the network does is decided by a seeded random number generator, so every visitor sees the same run, and the
 * same run is replayed with and without an idempotency key. Every count on screen comes from these functions.
 * Amounts, orders and loss rates are invented for the demo.
 */

export const ORDERS = 20;
export const MAX_ATTEMPTS = 3;
// The seed was chosen so the run shows every case: a lost request, a lost reply, a triple charge and an order never charged.
export const SEED = 13;
export const P_REQUEST_LOST = 0.1; // the request never reaches the server
export const P_REPLY_LOST = 0.25; // the server did the work, the reply never reaches the agent

export type Net = 'ok' | 'request-lost' | 'reply-lost';
export type Action = 'none' | 'charged' | 'replayed';
export type Attempt = { net: Net; action: Action };
export type Order = { id: number; cents: number; attempts: Attempt[]; charges: number; gotReply: boolean };

/** Small seeded generator (mulberry32). Values rounded so Node and the browser agree. */
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

/** What the network does to each attempt, for each order. Fixed by the seed; the same for both runs. */
export function networkScript(): Net[][] {
  const r = rng(SEED);
  return Array.from({ length: ORDERS }, () => {
    const out: Net[] = [];
    for (let a = 0; a < MAX_ATTEMPTS; a++) {
      const x = r();
      const net: Net = x < P_REQUEST_LOST ? 'request-lost' : x < P_REQUEST_LOST + P_REPLY_LOST ? 'reply-lost' : 'ok';
      out.push(net);
      if (net === 'ok') break; // the agent got an answer and stops
    }
    return out;
  });
}

export const amountCents = (id: number) => 1500 + ((id * 37) % 9) * 250;

/** Run all orders. With a key the server remembers each key and returns its saved reply instead of charging again. */
export function run(keyed: boolean): Order[] {
  return networkScript().map((nets, i) => {
    const id = i + 1;
    let charged = false; // has the server already done the work for this key?
    let charges = 0;
    const attempts: Attempt[] = nets.map((net) => {
      if (net === 'request-lost') return { net, action: 'none' as Action };
      // the request reached the server
      if (keyed && charged) return { net, action: 'replayed' as Action };
      charged = true;
      charges++;
      return { net, action: 'charged' as Action };
    });
    return { id, cents: amountCents(id), attempts, charges, gotReply: nets[nets.length - 1] === 'ok' };
  });
}

export type Summary = {
  orders: number;
  charged: number; // orders charged at least once
  duplicates: number; // orders charged more than once
  extraCharges: number; // charges beyond the first, in total
  extraCents: number; // money taken twice or more
  totalCents: number; // money taken in total
  rightCents: number; // what should have been taken
  neverCharged: number; // all calls were lost
  replays: number; // retries the server recognised
};

export function summarise(orders: Order[]): Summary {
  const charged = orders.filter((o) => o.charges > 0);
  const dup = orders.filter((o) => o.charges > 1);
  return {
    orders: orders.length,
    charged: charged.length,
    duplicates: dup.length,
    extraCharges: dup.reduce((s, o) => s + o.charges - 1, 0),
    extraCents: dup.reduce((s, o) => s + (o.charges - 1) * o.cents, 0),
    totalCents: orders.reduce((s, o) => s + o.charges * o.cents, 0),
    rightCents: charged.reduce((s, o) => s + o.cents, 0),
    neverCharged: orders.filter((o) => o.charges === 0).length,
    replays: orders.reduce((s, o) => s + o.attempts.filter((a) => a.action === 'replayed').length, 0),
  };
}

export const dollars = (cents: number) => '$' + (cents / 100).toFixed(2);
export const idempotencyKey = (id: number) => `order-${id}`;
