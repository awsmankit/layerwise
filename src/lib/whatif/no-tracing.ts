/**
 * What if you cannot see what the agent did? A SCRIPTED run of 12 steps of a toy travel agent. Step 7 is a tool call that
 * returns a stale price (cached 3 days ago) without any error. Everything after it builds on that number, and the customer
 * ends up charged more than the agent said. All steps, times and costs are invented for the demo.
 *
 * "Steps you must inspect" is computed:
 *  - With a trace: you start from the wrong number the customer saw (in step 12) and follow it back along `from` links,
 *    one recorded step at a time, until you reach the step that produced it from nothing: the tool result at step 7.
 *  - Without a trace: you only have the final answer. You re-run the agent and check each step from the start until you
 *    meet the bad result. That is every step up to and including step 7 (and it only works if the run repeats).
 */

export type Kind = 'llm' | 'tool';
export type Step = {
  n: number;
  kind: Kind;
  name: string;
  input: string;
  output: string;
  ms: number;
  /** The step this step took the wrong number from, if any. */
  from?: number;
  /** Does this step contain the wrong number? */
  carriesBad?: boolean;
};

export const BAD_STEP = 7;
export const COMPLAINT = 'I was charged 389 euros. Your agent said 189.';
export const FINAL_ANSWER = 'Booked LH402 on Tuesday for EUR 189. The itinerary is in your email.';

export const STEPS: Step[] = [
  { n: 1, kind: 'llm', name: 'plan', input: 'Task: book the cheapest Tuesday flight to Berlin under EUR 300 and email the itinerary.', output: 'Plan: search flights, check rules, check price, book, email.', ms: 820 },
  { n: 2, kind: 'tool', name: 'search_flights', input: '{ "to": "BER", "date": "Tue 12 Nov" }', output: '14 flights. Cheapest by list: LH402.', ms: 140 },
  { n: 3, kind: 'llm', name: 'choose', input: '14 flights found.', output: 'Pick LH402. Check its rules and live price.', ms: 610 },
  { n: 4, kind: 'tool', name: 'get_fare_rules', input: '{ "flight": "LH402" }', output: 'Refundable within 24 hours.', ms: 95 },
  { n: 5, kind: 'llm', name: 'read rules', input: 'Refundable within 24 hours.', output: 'Rules are fine. Ask for the price.', ms: 540 },
  { n: 6, kind: 'tool', name: 'get_seat_map', input: '{ "flight": "LH402" }', output: 'Seat 14C is free.', ms: 70 },
  { n: 7, kind: 'tool', name: 'get_price', input: '{ "flight": "LH402" }', output: '{ "price_eur": 189, "cached": "3 days ago" }  (status 200 OK)', ms: 110, carriesBad: true },
  { n: 8, kind: 'llm', name: 'check budget', input: 'price_eur = 189. Limit = 300.', output: '189 is under 300. Book it.', ms: 490, from: 7, carriesBad: true },
  { n: 9, kind: 'tool', name: 'book_flight', input: '{ "flight": "LH402", "seat": "14C" }', output: '{ "status": "booked", "charged_eur": 389 }', ms: 260 },
  { n: 10, kind: 'llm', name: 'write email', input: 'Booked. Price was 189.', output: 'Draft: "Your flight LH402 is booked for EUR 189."', ms: 700, from: 8, carriesBad: true },
  { n: 11, kind: 'tool', name: 'send_email', input: '{ "body": "... EUR 189 ..." }', output: 'Sent.', ms: 330, carriesBad: true },
  { n: 12, kind: 'llm', name: 'final answer', input: 'Email sent.', output: FINAL_ANSWER, ms: 180, from: 10, carriesBad: true },
];

export const STEP_COUNT = STEPS.length;
export const maxMs = () => Math.max(...STEPS.map((s) => s.ms));
export const totalMs = () => STEPS.reduce((t, s) => t + s.ms, 0);
export const toolSteps = () => STEPS.filter((s) => s.kind === 'tool');

/** Follow the wrong number back from the final answer: [12, 10, 8, 7]. */
export function trail(start = STEP_COUNT): number[] {
  const out: number[] = [];
  let cur: Step | undefined = STEPS.find((s) => s.n === start);
  while (cur) {
    out.push(cur.n);
    cur = cur.from ? STEPS.find((s) => s.n === cur!.from) : undefined;
  }
  return out;
}

/** Steps to inspect with a trace: the length of the trail. */
export const inspectWithTrace = () => trail().length;
/** Steps to inspect without one: re-run and check every step from step 1 up to the bad one. */
export const inspectWithoutTrace = () => BAD_STEP;

/** EXAMPLE time to read one recorded step in a trace viewer, and to re-run and check one step by hand. */
export const SECONDS_PER_SPAN = 15;
export const MINUTES_PER_REPLAY = 5;
export const timeWithTraceSeconds = () => inspectWithTrace() * SECONDS_PER_SPAN;
export const timeWithoutTraceMinutes = () => inspectWithoutTrace() * MINUTES_PER_REPLAY;

/** The wrong step is the first on the trail that has no `from`. */
export const rootCause = () => trail()[trail().length - 1];
