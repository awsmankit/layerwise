/**
 * What if every request goes to the biggest model?
 *
 * A day of traffic is a mix of easy requests (a small model answers them fine) and hard ones (it often does not).
 * A router sends each request to the small or the big model. All prices, token counts and the small model's slip
 * rate are EXAMPLES chosen to show the shape. They are not measurements of any real model or provider.
 */

export const example = {
  /** Example traffic: requests per day and tokens per request. */
  requestsPerDay: 10000,
  inTokens: 1000,
  outTokens: 300,
  /** Example prices in dollars per million tokens. The big model costs 10 times the small one. */
  bigIn: 5,
  bigOut: 25,
  smallIn: 0.5,
  smallOut: 2.5,
  /** The router reads about this many input tokens and is priced like the small model. */
  routerTokens: 100,
  /** Example: the share of HARD requests the small model gets wrong if a router sends them its way. */
  smallFailsHard: 0.6,
};

export type Example = typeof example;

/** Dollars for one request answered by the big model. */
export const bigCost = (e: Example = example) => (e.inTokens * e.bigIn + e.outTokens * e.bigOut) / 1e6;
/** Dollars for one request answered by the small model. */
export const smallCost = (e: Example = example) => (e.inTokens * e.smallIn + e.outTokens * e.smallOut) / 1e6;
/** Dollars for the router to read one request. */
export const routerCost = (e: Example = example) => (e.routerTokens * e.smallIn) / 1e6;
export const priceRatio = (e: Example = example) => bigCost(e) / smallCost(e);

export type Split = {
  /** Easy requests sent to the small model: cheap and fine. */
  easyToSmall: number;
  /** Hard requests sent to the big model: needed. */
  hardToBig: number;
  /** Easy requests sent to the big model anyway: money wasted. */
  easyToBig: number;
  /** Hard requests sent to the small model: the quality risk. */
  hardToSmall: number;
};

/**
 * Where the requests go, as a share of all requests (the four shares add to 1).
 * `easyShare` is the share of requests that are easy. `mistake` is how often the router guesses wrong, in either direction.
 * Without a router everything goes to the big model.
 */
export function split(easyShare: number, mistake: number, router: boolean): Split {
  const e = easyShare;
  const h = 1 - easyShare;
  if (!router) return { easyToSmall: 0, hardToBig: h, easyToBig: e, hardToSmall: 0 };
  return { easyToSmall: e * (1 - mistake), hardToBig: h * (1 - mistake), easyToBig: e * mistake, hardToSmall: h * mistake };
}

/** Dollars per day. */
export function dayCost(easyShare: number, mistake: number, router: boolean, e: Example = example): number {
  const s = split(easyShare, mistake, router);
  const small = s.easyToSmall + s.hardToSmall;
  const big = s.easyToBig + s.hardToBig;
  const perRequest = small * smallCost(e) + big * bigCost(e) + (router ? routerCost(e) : 0);
  return perRequest * e.requestsPerDay;
}

/** Requests per day whose answer is worse than the big model's would have been. */
export function badAnswers(easyShare: number, mistake: number, router: boolean, e: Example = example): number {
  const s = split(easyShare, mistake, router);
  return s.hardToSmall * e.smallFailsHard * e.requestsPerDay;
}

/** Share of the all-big bill that the router saves (negative if it costs more). */
export const savingShare = (easyShare: number, mistake: number, e: Example = example) =>
  1 - dayCost(easyShare, mistake, true, e) / dayCost(easyShare, mistake, false, e);

/** What the all-big bill spends on easy requests, beyond what the small model would have charged. */
export const avoidableSpend = (easyShare: number, e: Example = example) =>
  easyShare * e.requestsPerDay * (bigCost(e) - smallCost(e));

/** Dollars per answer that is as good as the big model's. */
export function costPerGoodAnswer(easyShare: number, mistake: number, router: boolean, e: Example = example): number {
  return dayCost(easyShare, mistake, router, e) / (e.requestsPerDay - badAnswers(easyShare, mistake, router, e));
}

/**
 * Split `total` cells between categories in proportion to `shares` (largest remainder),
 * so that the counts are whole numbers and add up to exactly `total`.
 */
export function apportion(shares: number[], total: number): number[] {
  const sum = shares.reduce((a, b) => a + b, 0);
  const exact = shares.map((s) => (sum > 0 ? (s / sum) * total : 0));
  const out = exact.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = exact.map((x, i) => ({ i, r: x - Math.floor(x) })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (let k = 0; left > 0 && order.length > 0; k = (k + 1) % order.length) {
    out[order[k].i] += 1;
    left -= 1;
  }
  return out;
}

export type Cat = 'small' | 'big' | 'waste' | 'bad';

/** One category per cell, 100 cells, in a fixed order so the picture is stable. */
export function cells(easyShare: number, mistake: number, router: boolean, total = 100): Cat[] {
  const s = split(easyShare, mistake, router);
  const n = apportion([s.easyToSmall, s.hardToBig, s.easyToBig, s.hardToSmall], total);
  const cats: Cat[] = ['small', 'big', 'waste', 'bad'];
  return n.flatMap((k, i) => Array.from({ length: k }, () => cats[i]));
}

export const easyShares = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
