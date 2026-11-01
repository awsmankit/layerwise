/*
 * Training-serving skew demo. One feature pipeline, written twice: once as a batch job that builds the
 * training table (after the fact), once as the code that runs when a request arrives. Every customer,
 * order and number here is invented for the lesson.
 *
 * Time is in hours since an arbitrary start. Each customer has a prediction moment ("asOf") and a list of
 * past orders. Two features are computed for that moment:
 *   orders_7d      number of orders in the 7 days before the prediction
 *   avg_basket_7d  mean order value (in pounds) over those orders
 * A fixed, made-up model turns them into a score between 0 and 1.
 */
import { mulberry32 } from './data-prep';

export type SkewId = 'none' | 'window' | 'late' | 'missing' | 'clip';

export const SKEWS: { id: SkewId; label: string; training: string; serving: string }[] = [
  { id: 'none', label: 'Same code, or the logged values', training: 'Uses the values the service computed at request time.', serving: 'Rolling 168 hours before the request, only events that had arrived.' },
  { id: 'window', label: 'Different window edges', training: 'The 7 whole calendar days before the prediction day (today excluded).', serving: 'A rolling 168 hours, including today so far.' },
  { id: 'late', label: 'Late-arriving events', training: 'Built later, so it includes orders that reached the database late.', serving: 'The live counter only knows orders that had arrived by request time.' },
  { id: 'missing', label: 'Different handling of blanks', training: 'No orders in the window: average basket filled with 0.', serving: 'No orders in the window: average basket filled with the overall mean, 42.' },
  { id: 'clip', label: 'A speed shortcut', training: 'Uses the exact basket values.', serving: 'Clips each basket value at 100 before averaging, to keep the cache small.' },
];

export type Order = { t: number; value: number; lag: number };
export type Customer = { id: number; asOf: number; orders: Order[] };
export type Features = { orders: number; basket: number };

const WEEK = 168;
export const FILL_MEAN = 42;
export const THRESHOLD = 0.5;

/** The model is fixed: logit = -1.4 + 0.5 * orders + 0.015 * basket. */
export function score(f: Features): number {
  const z = -1.4 + 0.5 * f.orders + 0.015 * f.basket;
  return 1 / (1 + Math.exp(-z));
}

export function makeCustomers(n = 300, seed = 11): Customer[] {
  const rand = mulberry32(seed);
  const out: Customer[] = [];
  for (let id = 1; id <= n; id++) {
    const asOf = 24 * 14 + Math.floor(rand() * 24 * 7);
    const perDay = rand() < 0.3 ? 0.08 + rand() * 0.2 : 0.3 + rand() * 1.1;
    const orders: Order[] = [];
    let t = rand() * 24;
    while (true) {
      t += (-Math.log(1 - rand()) / perDay) * 24;
      if (t >= asOf) break;
      const value = Math.round((8 + rand() * rand() * 150) * 100) / 100;
      const lag = rand() < 0.2 ? 6 + Math.floor(rand() * 35) : 0;
      orders.push({ t, value, lag });
    }
    out.push({ id, asOf, orders });
  }
  return out;
}

function aggregate(orders: Order[], fill: number, clip = Infinity): Features {
  if (orders.length === 0) return { orders: 0, basket: fill };
  const sum = orders.reduce((s, o) => s + Math.min(o.value, clip), 0);
  return { orders: orders.length, basket: sum / orders.length };
}

/** The request-time code: a rolling 168 hours, only orders that had arrived. */
function servingFeatures(c: Customer, skew: SkewId): Features {
  const seen = c.orders.filter((o) => o.t >= c.asOf - WEEK && o.t < c.asOf && o.t + o.lag <= c.asOf);
  return aggregate(seen, skew === 'missing' ? FILL_MEAN : 0, skew === 'clip' ? 100 : Infinity);
}

/** The batch job that builds the training table. With skew 'none' it is the serving code. */
function trainingFeatures(c: Customer, skew: SkewId): Features {
  if (skew === 'none' || skew === 'clip') return servingFeatures(c, 'none');
  if (skew === 'window') {
    const dayStart = Math.floor(c.asOf / 24) * 24;
    const inWindow = c.orders.filter((o) => o.t >= dayStart - WEEK && o.t < dayStart && o.t + o.lag <= c.asOf);
    return aggregate(inWindow, 0);
  }
  if (skew === 'late') {
    const all = c.orders.filter((o) => o.t >= c.asOf - WEEK && o.t < c.asOf);
    return aggregate(all, 0);
  }
  // missing: serving fills the blank average with the overall mean, training with 0
  const seen = c.orders.filter((o) => o.t >= c.asOf - WEEK && o.t < c.asOf && o.t + o.lag <= c.asOf);
  return aggregate(seen, 0);
}

export type SkewRow = { id: number; train: Features; serve: Features; pTrain: number; pServe: number; flipped: boolean };

export type SkewReport = {
  rows: SkewRow[];
  n: number;
  /** examples where the orders feature differs between the two paths */
  skewedOrders: number;
  /** examples where the basket feature differs */
  skewedBasket: number;
  /** examples where either feature differs */
  skewedAny: number;
  meanAbsScoreGap: number;
  maxAbsScoreGap: number;
  /** examples where the 0.5 decision differs */
  flips: number;
};

export function evaluate(customers: Customer[], skew: SkewId): SkewReport {
  const rows: SkewRow[] = customers.map((c) => {
    const train = trainingFeatures(c, skew);
    const serve = servingFeatures(c, skew);
    const pTrain = score(train);
    const pServe = score(serve);
    return { id: c.id, train, serve, pTrain, pServe, flipped: pTrain >= THRESHOLD !== pServe >= THRESHOLD };
  });
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  let skewedOrders = 0;
  let skewedBasket = 0;
  let skewedAny = 0;
  let gap = 0;
  let maxGap = 0;
  let flips = 0;
  for (const r of rows) {
    const o = !near(r.train.orders, r.serve.orders);
    const b = !near(r.train.basket, r.serve.basket);
    if (o) skewedOrders++;
    if (b) skewedBasket++;
    if (o || b) skewedAny++;
    const d = Math.abs(r.pTrain - r.pServe);
    gap += d;
    if (d > maxGap) maxGap = d;
    if (r.flipped) flips++;
  }
  return { rows, n: rows.length, skewedOrders, skewedBasket, skewedAny, meanAbsScoreGap: rows.length ? gap / rows.length : 0, maxAbsScoreGap: maxGap, flips };
}
