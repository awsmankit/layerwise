/**
 * What if an agent has no step or budget limit? A loop that cannot finish: a tool keeps failing, and the
 * agent keeps trying again. Every step calls the model, and every call re-sends the whole history, so each step
 * costs more than the one before. All prices and sizes are example figures, not any provider's real price list.
 */

/** Example price per million input tokens, in dollars. */
export const PRICE_IN = 3;
/** Example price per million output tokens, in dollars. */
export const PRICE_OUT = 15;
/** Example size of the instructions and task that are sent at every step. */
export const BASE_TOKENS = 2_000;
/** Example growth of the history per step (the agent's message plus the failed tool result). */
export const GROWTH = 600;
/** Example tokens the model writes at each step. */
export const OUT_TOKENS = 300;
/** Example fixed time per step, in seconds, plus reading time that grows with the input. */
export const BASE_SECONDS = 3;
/** Example input tokens the model reads per second. */
export const READ_RATE = 20_000;
/** How many steps the demo shows. */
export const MAX_STEPS = 200;

/** Input tokens sent at step k (1-based): the instructions plus everything that happened before. */
export function inputTokens(k: number): number {
  return BASE_TOKENS + GROWTH * (k - 1);
}

/** Dollars spent on step k. */
export function stepCost(k: number): number {
  return (inputTokens(k) * PRICE_IN + OUT_TOKENS * PRICE_OUT) / 1_000_000;
}

/** Seconds step k takes. */
export function stepSeconds(k: number): number {
  return BASE_SECONDS + inputTokens(k) / READ_RATE;
}

/** Total dollars after n steps. */
export function totalCost(n: number): number {
  let sum = 0;
  for (let k = 1; k <= n; k++) sum += stepCost(k);
  return sum;
}

/** Total seconds after n steps. */
export function totalSeconds(n: number): number {
  let sum = 0;
  for (let k = 1; k <= n; k++) sum += stepSeconds(k);
  return sum;
}

/** The last step a budget of `cap` dollars allows: the loop checks before each call and stops if the next one would go over. */
export function stopStep(cap: number): number {
  let n = 0;
  while (n < MAX_STEPS && totalCost(n + 1) <= cap) n++;
  return n;
}

/** Steps actually taken after `shown` steps of the demo, with or without a cap. */
export function stepsTaken(shown: number, capped: boolean, cap: number): number {
  return capped ? Math.min(shown, stopStep(cap)) : shown;
}

export function fmtMoney(x: number): string {
  if (x >= 100) return `$${Math.round(x).toLocaleString('en-US')}`;
  if (x >= 1) return `$${x.toFixed(2)}`;
  return `$${x.toFixed(3)}`;
}

export function fmtDuration(seconds: number): string {
  if (seconds < 90) return `${Math.round(seconds)} s`;
  const m = seconds / 60;
  if (m < 90) return `${m.toFixed(m < 10 ? 1 : 0)} min`;
  return `${(m / 60).toFixed(1)} h`;
}
