/** Token-cost arithmetic shared by the calculator and the games. */

export type CostInput = {
  inTok: number;
  outTok: number;
  /** Dollars per million input tokens. */
  pIn: number;
  /** Dollars per million output tokens. */
  pOut: number;
  /** Fraction (0-1) of input tokens served from the prompt cache. */
  cacheShare?: number;
  /** Discount (0-1) applied to cached input tokens. */
  cacheDisc?: number;
  /** Fraction (0-1) of traffic that can run as batch. */
  batchShare?: number;
  /** Discount (0-1) applied to batch traffic. */
  batchDisc?: number;
};

export type CostResult = { input: number; output: number; total: number };

export function costPerRequest(i: CostInput): CostResult {
  const cacheShare = i.cacheShare ?? 0;
  const cacheDisc = i.cacheDisc ?? 0.9;
  const batchShare = i.batchShare ?? 0;
  const batchDisc = i.batchDisc ?? 0.5;

  const input = (i.inTok / 1e6) * i.pIn * (1 - cacheShare * cacheDisc);
  const output = (i.outTok / 1e6) * i.pOut;
  const f = 1 - batchShare * batchDisc;
  return { input: input * f, output: output * f, total: (input + output) * f };
}

export const DAYS_PER_MONTH = 30;

export const monthlyCost = (perRequest: number, requestsPerDay: number) =>
  perRequest * requestsPerDay * DAYS_PER_MONTH;
