/**
 * What if the model cannot use tools? A scripted toy: a stand-in "model" answers three questions
 * that need a clock, a calculator and a database. Without tools it can only write what sounds likely;
 * with tools it asks the program to run the check and reads back the result.
 * Everything on screen comes from these functions. The stand-in is an illustration, not a real product.
 */

/** The date on the example clock. Fixed, so the page renders the same on the server and the browser. */
export const TODAY = { y: 2026, m: 11, d: 6 } as const;
/** The last date the stand-in "saw" in its training text, so it believes today is this day. */
export const STALE = { y: 2025, m: 3, d: 14 } as const;

type Ymd = { y: number; m: number; d: number };
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function weekday(t: Ymd): string {
  return WEEKDAYS[new Date(Date.UTC(t.y, t.m - 1, t.d)).getUTCDay()];
}

/** "Friday 6 November 2026" */
export function longDate(t: Ymd): string {
  return `${weekday(t)} ${t.d} ${MONTHS[t.m - 1]} ${t.y}`;
}

export function isoDate(t: Ymd): string {
  return `${t.y}-${String(t.m).padStart(2, '0')}-${String(t.d).padStart(2, '0')}`;
}

/** Whole days from a to b (negative if b is earlier). */
export function daysBetween(a: Ymd, b: Ymd): number {
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000);
}

/** Example calculation the question asks for. */
export const MULTIPLY = { a: 4817, b: 3926 } as const;

/** The correct product, which a calculator tool returns. */
export function exactProduct(a: number, b: number): number {
  return a * b;
}

/**
 * What the stand-in writes without a calculator. It has seen many products, so the first digits come out
 * right, but it cannot carry out the arithmetic, so the last three digits are made up. The rule is fixed
 * (add 317 to the true last three digits, wrapping at 1000) so that the example is repeatable.
 */
export function guessedProduct(a: number, b: number): number {
  const exact = a * b;
  const tail = (exact % 1000 + 317) % 1000;
  return Math.floor(exact / 1000) * 1000 + tail;
}

/** A tiny example order table: the lookup tool reads it, the stand-in has never seen it. */
export const ORDERS: Record<string, { status: 'delivered' | 'packed' | 'shipped'; note: string }> = {
  'A-1041': { status: 'delivered', note: 'delivered on 3 Nov' },
  'A-1042': { status: 'packed', note: 'packed, leaves the warehouse on 9 Nov' },
  'A-1043': { status: 'shipped', note: 'shipped on 5 Nov' },
};
export const ORDER_ASKED = 'A-1042';

export type Turn = { who: 'you' | 'model' | 'tool' | 'program'; text: string };
export type Question = {
  id: 'date' | 'sum' | 'order';
  label: string;
  ask: string;
  need: string;
  /** What is true, and the answer each version ends with. */
  truth: string;
  withoutAnswer: string;
  withAnswer: string;
  toolName: string;
  toolCall: string;
  toolResult: string;
};

const exact = exactProduct(MULTIPLY.a, MULTIPLY.b);
const guess = guessedProduct(MULTIPLY.a, MULTIPLY.b);
const order = ORDERS[ORDER_ASKED];

export function fmtInt(n: number): string {
  return n.toLocaleString('en-US');
}

export const questions: Question[] = [
  {
    id: 'date',
    label: 'Today\'s date',
    ask: 'What is today\'s date?',
    need: 'needs a clock',
    truth: longDate(TODAY),
    withoutAnswer: `Today is ${longDate(STALE)}.`,
    withAnswer: `Today is ${longDate(TODAY)}.`,
    toolName: 'get_date',
    toolCall: 'get_date()',
    toolResult: `${isoDate(TODAY)} (${weekday(TODAY)})`,
  },
  {
    id: 'sum',
    label: 'A calculation',
    ask: `What is ${fmtInt(MULTIPLY.a)} times ${fmtInt(MULTIPLY.b)}?`,
    need: 'needs a calculator',
    truth: fmtInt(exact),
    withoutAnswer: `${fmtInt(MULTIPLY.a)} times ${fmtInt(MULTIPLY.b)} is ${fmtInt(guess)}.`,
    withAnswer: `${fmtInt(MULTIPLY.a)} times ${fmtInt(MULTIPLY.b)} is ${fmtInt(exact)}.`,
    toolName: 'calculator',
    toolCall: `calculator(${MULTIPLY.a} * ${MULTIPLY.b})`,
    toolResult: String(exact),
  },
  {
    id: 'order',
    label: 'A lookup',
    ask: `Has order ${ORDER_ASKED} shipped yet?`,
    need: 'needs the order database',
    truth: `No, it is ${order.note}`,
    withoutAnswer: `Yes, order ${ORDER_ASKED} has shipped.`,
    withAnswer: `Not yet. Order ${ORDER_ASKED} is ${order.note}.`,
    toolName: 'find_order',
    toolCall: `find_order("${ORDER_ASKED}")`,
    toolResult: `status: ${order.status}, ${order.note}`,
  },
];

/** Whether the answer a version ends with matches the truth. Computed from the numbers, not typed. */
export function isCorrect(q: Question, withTool: boolean): boolean {
  switch (q.id) {
    case 'date':
      return daysBetween(withTool ? TODAY : STALE, TODAY) === 0;
    case 'sum':
      return (withTool ? exact : guess) === exact;
    case 'order':
      return (withTool ? order.status : 'shipped') === order.status;
  }
}

/** How many of the three questions each version gets right. */
export function score(withTool: boolean): number {
  return questions.filter((q) => isCorrect(q, withTool)).length;
}

/** How far off the stand-in is, for the verdict line. */
export function dateMissDays(): number {
  return daysBetween(STALE, TODAY);
}
export function productMiss(): number {
  return Math.abs(guess - exact);
}

/** The scripted conversation, one entry per step the viewer can reveal. */
export function script(q: Question, withTool: boolean): Turn[] {
  if (!withTool) {
    return [
      { who: 'you', text: q.ask },
      { who: 'model', text: q.withoutAnswer },
    ];
  }
  return [
    { who: 'you', text: q.ask },
    { who: 'model', text: `I will ask the ${q.toolName} tool: ${q.toolCall}` },
    { who: 'tool', text: q.toolResult },
    { who: 'model', text: q.withAnswer },
  ];
}
