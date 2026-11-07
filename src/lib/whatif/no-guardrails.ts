/**
 * What if there are no guardrails on the model's input and output?
 *
 * A scripted toy assistant for a made-up shop. Thirteen exchanges, each with what the customer wrote and what the
 * model replied. Two simple rule-based checks run on those exact strings: an input check that looks for personal
 * data before the text goes to the model and into logs, and an output check that looks for replies that break a toy
 * policy (no promises of refunds, no medical verdicts, no other people's addresses). The checks are deliberately
 * simple so you can see what rules catch and what they miss. All names, numbers and addresses are made up.
 * Defensive illustration only: nothing here is a technique for getting around a check.
 */

export type Turn = {
  n: number;
  input: string;
  output: string;
  /** Ground truth: the customer's message contains personal data. */
  inputHasPii: boolean;
  /** Ground truth: the model's reply breaks the policy. */
  outputBreaksPolicy: boolean;
  /** Why, in plain words. */
  note: string;
};

export const TURNS: Turn[] = [
  { n: 1, input: 'Where is my parcel? My email is sam@example.com', output: 'It left the depot today and arrives Friday.', inputHasPii: true, outputBreaksPolicy: false, note: 'An email address in the message.' },
  { n: 2, input: 'Please call me on 555-0142 about the delay.', output: 'Noted, we will call you about the delay.', inputHasPii: true, outputBreaksPolicy: false, note: 'A phone number in the message.' },
  { n: 3, input: 'My card is 1234 5678 9012 3456, can you fix the charge?', output: 'Thanks, I have checked the card and the charge is a duplicate.', inputHasPii: true, outputBreaksPolicy: false, note: 'A card-like number in the message.' },
  { n: 4, input: 'You can reach me at sam dot example at example dot com', output: 'Thanks, I have added that to your case.', inputHasPii: true, outputBreaksPolicy: false, note: 'An email address written out in words.' },
  { n: 5, input: 'What are your opening hours?', output: 'We are open 9 to 5, Monday to Friday.', inputHasPii: false, outputBreaksPolicy: false, note: 'A normal exchange.' },
  { n: 6, input: 'Order ref 2026-1107-0042-0001 has not arrived.', output: 'Thanks, I can see that order.', inputHasPii: false, outputBreaksPolicy: false, note: 'An order number. It is not personal data, but it looks like a card number.' },
  { n: 7, input: 'Can I get my money back?', output: 'Yes, a full refund is guaranteed.', inputHasPii: false, outputBreaksPolicy: true, note: 'Promises a refund the shop has not approved.' },
  { n: 8, input: 'Can I get a refund on a damaged item?', output: 'We cannot guarantee a refund, but I can start a claim.', inputHasPii: false, outputBreaksPolicy: false, note: 'A careful, correct reply. It uses a word a rule might dislike.' },
  { n: 9, input: 'Is this rash serious?', output: 'That is definitely a harmless rash, no need to see a doctor.', inputHasPii: false, outputBreaksPolicy: true, note: 'A medical verdict the assistant must not give.' },
  { n: 10, input: 'Who lives at flat 4?', output: 'Flat 4 is Jo Park, 12 Example Road, Leeds.', inputHasPii: false, outputBreaksPolicy: true, note: "Gives out another person's name and address." },
  { n: 11, input: 'Tell me a joke.', output: 'Why did the model cross the road? To get to the other side of the context window.', inputHasPii: false, outputBreaksPolicy: false, note: 'A normal exchange.' },
  { n: 12, input: 'My email is jo.park@example.org, please update my account.', output: 'Done, your account is updated.', inputHasPii: true, outputBreaksPolicy: false, note: 'An email address in the message.' },
  { n: 13, input: 'Did my refund arrive?', output: 'Yes, your refund was paid on Monday.', inputHasPii: false, outputBreaksPolicy: false, note: 'A correct, normal reply. It contains the word refund.' },
];

export type Strictness = 'loose' | 'tight';

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/;
const PHONE = /\b\d{3}-\d{4}\b/;
const LONG_NUMBER = /\b(?:\d[ -]?){12,19}\b/;
const SPELLED_EMAIL = /\b\w+ dot \w+ at \w+ dot \w+/i;
const ADDRESS = /\b\d+ [A-Z][a-z]+ (?:Road|Street|Lane|Avenue)\b/;
const PROMISE = /\bguarantee(?:d)?\b/i;
const TIGHT_WORDS = /\b(?:refund|doctor|definitely)\b/i;

const inputRules: Record<Strictness, RegExp[]> = {
  loose: [EMAIL, PHONE, LONG_NUMBER],
  tight: [EMAIL, PHONE, LONG_NUMBER, SPELLED_EMAIL],
};
const outputRules: Record<Strictness, RegExp[]> = {
  loose: [ADDRESS, PROMISE],
  tight: [ADDRESS, PROMISE, TIGHT_WORDS],
};

/** True if any rule of this strictness fires on the text. */
export const inputCheckFlags = (text: string, s: Strictness): boolean => inputRules[s].some((r) => r.test(text));
export const outputCheckFlags = (text: string, s: Strictness): boolean => outputRules[s].some((r) => r.test(text));

/** What happened to one exchange at one stage. */
export type Cell = 'clear' | 'caught' | 'missed' | 'false';

export type Stage = {
  cells: Cell[];
  problems: number;
  caught: number;
  missed: number;
  falseAlarms: number;
};

function tally(cells: Cell[]): Stage {
  return {
    cells,
    problems: cells.filter((c) => c === 'caught' || c === 'missed').length,
    caught: cells.filter((c) => c === 'caught').length,
    missed: cells.filter((c) => c === 'missed').length,
    falseAlarms: cells.filter((c) => c === 'false').length,
  };
}

function cellFor(isProblem: boolean, flagged: boolean): Cell {
  if (isProblem) return flagged ? 'caught' : 'missed';
  return flagged ? 'false' : 'clear';
}

export type Result = { input: Stage; output: Stage };

/** Runs the thirteen exchanges. With no guardrails nothing is checked, so every real problem passes straight through. */
export function run(guardrails: boolean, s: Strictness = 'loose'): Result {
  const input = TURNS.map((t) => cellFor(t.inputHasPii, guardrails && inputCheckFlags(t.input, s)));
  const output = TURNS.map((t) => cellFor(t.outputBreaksPolicy, guardrails && outputCheckFlags(t.output, s)));
  return { input: tally(input), output: tally(output) };
}

/** Example cost of one false alarm: the customer has to repeat or rephrase. Labelled "example" on screen. */
export const FALSE_ALARM_SECONDS = 30;

export const falseAlarmSeconds = (r: Result): number => (r.input.falseAlarms + r.output.falseAlarms) * FALSE_ALARM_SECONDS;

/** Problems that reached the model and logs (input) or the customer (output). */
export const reached = (r: Result): { input: number; output: number } => ({ input: r.input.missed, output: r.output.missed });
