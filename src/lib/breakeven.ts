/**
 * API versus self-hosted GPU cost.
 *
 * Self-hosting is a staircase, not a line: you rent whole servers. Each
 * server serves `throughput x utilisation` tokens per second on average, and
 * costs the same whether it is busy or idle. The API is a straight line.
 */
import { DAYS_PER_MONTH } from './cost';

export const HOURS_PER_MONTH = 24 * DAYS_PER_MONTH;

export type BreakEvenInput = {
  /** Dollars per hour for one GPU. */
  gpuHourly: number;
  /** GPUs in one serving node. */
  gpus: number;
  /** Total tokens per second one node produces at your batch size when busy. */
  throughput: number;
  /** Planned average utilisation, 0 to 1. */
  util: number;
  /** Blended API price in dollars per million tokens. */
  apiPrice: number;
  /** Fixed monthly cost of people, redundancy and tooling, in dollars. */
  overhead: number;
};

/** GPU cost per million tokens, ignoring overhead. */
export function selfPerMillion(i: BreakEvenInput): number {
  const tokensPerHour = i.throughput * i.util * 3600;
  return tokensPerHour <= 0 ? Infinity : ((i.gpuHourly * i.gpus) / tokensPerHour) * 1e6;
}

/** Tokens one node can serve in a month at the planned utilisation. */
export function nodeCapacity(i: BreakEvenInput): number {
  return i.throughput * i.util * 3600 * HOURS_PER_MONTH;
}

export const nodeMonthly = (i: BreakEvenInput) => i.gpuHourly * i.gpus * HOURS_PER_MONTH;

export function nodesNeeded(i: BreakEvenInput, tokens: number): number {
  const cap = nodeCapacity(i);
  if (tokens <= 0 || cap <= 0) return 0;
  return Math.max(1, Math.ceil(tokens / cap));
}

export function selfMonthly(i: BreakEvenInput, tokens: number): number {
  const n = nodesNeeded(i, tokens);
  return n === 0 ? 0 : n * nodeMonthly(i) + i.overhead;
}

export const apiMonthly = (i: BreakEvenInput, tokens: number) => (tokens / 1e6) * i.apiPrice;

/**
 * The smallest monthly volume at which self-hosting costs no more than the
 * API, or null if it never does (for example when the API is cheaper per
 * token than your GPUs at this utilisation).
 */
export function breakEvenTokens(i: BreakEvenInput): number | null {
  const cap = nodeCapacity(i);
  const perToken = i.apiPrice / 1e6;
  if (cap <= 0 || perToken <= 0) return null;
  for (let n = 1; n <= 5000; n++) {
    const cost = n * nodeMonthly(i) + i.overhead;
    const threshold = cost / perToken; // volume at which the API bill equals this many nodes
    const lower = (n - 1) * cap; // below this, n-1 nodes would suffice
    const upper = n * cap;
    if (threshold <= upper) return Math.max(threshold, lower + 1);
  }
  return null;
}
