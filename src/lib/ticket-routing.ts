/**
 * A worked comparison for routing support tickets: rules, a small classifier and an LLM call.
 * EVERY number here is an invented example chosen to show the shape of the calculation. None is a measurement
 * or a real price. Total cost = per-ticket running cost + the cost of the tickets it gets wrong + monthly upkeep.
 */

export type OptionId = 'rules' | 'classifier' | 'llm';

export interface TicketOption {
  id: OptionId;
  label: string;
  /** Share of tickets routed correctly (example). */
  accuracy: number;
  /** Time to route one ticket, in milliseconds (example). */
  latencyMs: number;
  /** Monthly upkeep in dollars: maintaining rules, retraining and labels, or evals, monitoring and prompt changes (example). */
  upkeepPerMonth: number;
  /** Cost to build, in person-days (example). */
  buildDays: number;
  /** Input tokens per ticket, 0 when no model API is called. */
  inputTokens: number;
  outputTokens: number;
  /** Dollars per million tokens (example prices). */
  inputPerM: number;
  outputPerM: number;
  /** Compute cost per 1,000 tickets that is not token pricing (a small CPU server, for example). */
  computePer1000: number;
}

export const OPTIONS: TicketOption[] = [
  { id: 'rules', label: 'Keyword rules', accuracy: 0.71, latencyMs: 1, upkeepPerMonth: 300, buildDays: 2, inputTokens: 0, outputTokens: 0, inputPerM: 0, outputPerM: 0, computePer1000: 0 },
  { id: 'classifier', label: 'Small classifier', accuracy: 0.88, latencyMs: 5, upkeepPerMonth: 800, buildDays: 10, inputTokens: 0, outputTokens: 0, inputPerM: 0, outputPerM: 0, computePer1000: 0.02 },
  { id: 'llm', label: 'LLM call', accuracy: 0.91, latencyMs: 900, upkeepPerMonth: 1500, buildDays: 4, inputTokens: 400, outputTokens: 10, inputPerM: 3, outputPerM: 15, computePer1000: 0 },
];

export const option = (id: OptionId): TicketOption => OPTIONS.find((o) => o.id === id)!;

/** Running cost in dollars per 1,000 tickets (tokens plus compute, not counting mistakes or upkeep). */
export function runCostPer1000(o: TicketOption): number {
  const perTicket = (o.inputTokens * o.inputPerM + o.outputTokens * o.outputPerM) / 1e6;
  return perTicket * 1000 + o.computePer1000;
}

export interface Row {
  id: OptionId;
  label: string;
  accuracy: number;
  latencyMs: number;
  runPer1000: number;
  wrongPer1000: number;
  /** Cost of the mistakes per 1,000 tickets, at the given cost per mistake. */
  mistakesPer1000: number;
  /** Running cost plus mistakes per 1,000 tickets. */
  perThousand: number;
  runMonth: number;
  mistakesMonth: number;
  upkeepMonth: number;
  totalMonth: number;
}

export function compare(ticketsPerMonth: number, costPerMistake: number): Row[] {
  return OPTIONS.map((o) => {
    const runPer1000 = runCostPer1000(o);
    const wrongPer1000 = (1 - o.accuracy) * 1000;
    const mistakesPer1000 = wrongPer1000 * costPerMistake;
    const k = ticketsPerMonth / 1000;
    return {
      id: o.id,
      label: o.label,
      accuracy: o.accuracy,
      latencyMs: o.latencyMs,
      runPer1000,
      wrongPer1000,
      mistakesPer1000,
      perThousand: runPer1000 + mistakesPer1000,
      runMonth: runPer1000 * k,
      mistakesMonth: mistakesPer1000 * k,
      upkeepMonth: o.upkeepPerMonth,
      totalMonth: (runPer1000 + mistakesPer1000) * k + o.upkeepPerMonth,
    };
  });
}

/** The option with the lowest total monthly cost. */
export function cheapest(rows: Row[]): Row {
  return rows.reduce((a, b) => (b.totalMonth < a.totalMonth ? b : a));
}

/**
 * The cost of one mistake above which `better` beats `cheaper` at a given volume, or null if it never does
 * (it is more accurate but never pays back) or always does. Solves totalMonth equality for the mistake cost.
 */
export function breakEvenMistakeCost(ticketsPerMonth: number, cheaper: OptionId, better: OptionId): number | null {
  const a = option(cheaper);
  const b = option(better);
  const k = ticketsPerMonth / 1000;
  const extraFixed = b.upkeepPerMonth - a.upkeepPerMonth + (runCostPer1000(b) - runCostPer1000(a)) * k;
  const savedWrong = (a.accuracy - b.accuracy) * -1000 * k; // extra mistakes avoided per month
  if (savedWrong <= 0) return null;
  return Math.max(0, extraFixed / savedWrong);
}
