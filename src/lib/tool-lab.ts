/**
 * Logic for the "tool lab" in the lesson "Designing tools for agents".
 *
 * Nothing here calls a model. Two scripted runs of the same task are built
 * from the tool descriptions the learner has typed: the script checks the
 * text for a few plain cues (see CUES) and picks the branch a careless or a
 * careful reader would take. Token counts are an estimate of about four
 * characters per token, so they are illustrations, not a tokeniser's output.
 */

export const TASK =
  'Maya Chen (maya.chen@example.com) says she was charged twice for her last order. If it is a duplicate, refund it.';

/** Roughly four characters per token. Real tokenisers differ. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export type SetId = 'bad' | 'good';

export interface Param {
  name: string;
  type: string;
  description?: string;
  enum?: string[];
  required?: boolean;
}

export interface ToolDef {
  name: string;
  /** True when the learner can edit this description. */
  editable: boolean;
  description: string;
  params: Param[];
}

/* ---------- the two tool sets ---------- */

export const BAD_DEFAULTS: Record<string, string> = {
  get_customer: 'Gets a customer.',
  search: 'Search.',
  list_orders: 'Lists orders.',
  list_payments: 'Lists payments.',
  refund: 'Refunds a payment.',
  void_payment: 'Voids a payment.',
};

/** What a careful rewrite of the three editable bad descriptions looks like. */
export const BAD_FIXED: Record<string, string> = {
  get_customer:
    'Fetch one customer by customer ID (looks like cus_8f3a21). It does not accept an email address: if you only have an email or a name, call search first to get the ID.',
  list_orders:
    "List a customer's orders, newest first. A customer can have dozens of orders, so pass limit=1 when you only need the most recent one.",
  refund:
    'Refund money that has already been captured, for example when a customer was charged twice. Use void_payment only for payments that are not captured yet. amount is in cents: 4200 means $42.00.',
};

export const GOOD_DEFAULTS: Record<string, string> = {
  customer_find:
    'Find a customer by email address or full name and return their name and email. Use this first when a request names a person. Returns up to 5 matches.',
  billing_get_order_charges:
    'Show the charges on one order. which is "latest" for the most recent order, "all" for every order, or an order number such as ord_10293. Use response_format "concise" (default) for a readable summary, or "detailed" when you need processor IDs.',
  billing_refund_charge:
    'Refund all or part of one charge, in dollars (amount_usd). The first call only previews the refund. Call again with confirm=true to carry it out; a person is asked to approve first. Safe to retry: the same request never refunds twice.',
};

/** A thin wrapper over each endpoint of the payments API. */
export function badSet(desc: Record<string, string>): ToolDef[] {
  const d = (k: string) => desc[k] ?? BAD_DEFAULTS[k];
  return [
    { name: 'get_customer', editable: true, description: d('get_customer'), params: [{ name: 'id', type: 'string', required: true }] },
    { name: 'search', editable: false, description: BAD_DEFAULTS.search, params: [{ name: 'q', type: 'string', required: true }] },
    {
      name: 'list_orders',
      editable: true,
      description: d('list_orders'),
      params: [
        { name: 'customer_id', type: 'string', required: true },
        { name: 'limit', type: 'integer' },
      ],
    },
    { name: 'list_payments', editable: false, description: BAD_DEFAULTS.list_payments, params: [{ name: 'order_id', type: 'string', required: true }] },
    {
      name: 'refund',
      editable: true,
      description: d('refund'),
      params: [
        { name: 'payment_id', type: 'string', required: true },
        { name: 'amount', type: 'number', required: true },
      ],
    },
    { name: 'void_payment', editable: false, description: BAD_DEFAULTS.void_payment, params: [{ name: 'payment_id', type: 'string', required: true }] },
  ];
}

/** Three tools shaped around the job, with a namespace, readable results and a preview step. */
export function goodSet(desc: Record<string, string>): ToolDef[] {
  const d = (k: string) => desc[k] ?? GOOD_DEFAULTS[k];
  return [
    {
      name: 'customer_find',
      editable: false,
      description: GOOD_DEFAULTS.customer_find,
      params: [{ name: 'email_or_name', type: 'string', description: 'An email address or a full name, e.g. maya.chen@example.com', required: true }],
    },
    {
      name: 'billing_get_order_charges',
      editable: true,
      description: d('billing_get_order_charges'),
      params: [
        { name: 'customer', type: 'string', description: 'The customer name or email returned by customer_find', required: true },
        { name: 'which', type: 'string', description: 'latest, all, or an order number', required: true },
        { name: 'response_format', type: 'string', enum: ['concise', 'detailed'] },
      ],
    },
    {
      name: 'billing_refund_charge',
      editable: false,
      description: GOOD_DEFAULTS.billing_refund_charge,
      params: [
        { name: 'charge_ref', type: 'string', description: 'The charge reference from billing_get_order_charges, such as c2', required: true },
        { name: 'amount_usd', type: 'number', description: 'Dollars, for example 42.00', required: true },
        { name: 'confirm', type: 'boolean', description: 'false (default) previews; true carries it out' },
      ],
    },
  ];
}

/** The JSON a provider would send for one tool, used only to estimate its token cost. */
export function definitionText(t: ToolDef): string {
  const properties: Record<string, unknown> = {};
  for (const p of t.params) {
    const prop: Record<string, unknown> = { type: p.type };
    if (p.description) prop.description = p.description;
    if (p.enum) prop.enum = p.enum;
    properties[p.name] = prop;
  }
  return JSON.stringify({
    name: t.name,
    description: t.description,
    input_schema: { type: 'object', properties, required: t.params.filter((p) => p.required).map((p) => p.name) },
  });
}

export function definitionTokens(tools: ToolDef[]): number {
  return tools.reduce((n, t) => n + estimateTokens(definitionText(t)), 0);
}

/* ---------- what the toy reader looks for ---------- */

export interface Cue {
  id: 'email-not-id' | 'limit' | 'captured' | 'cents' | 'latest';
  set: SetId;
  tool: string;
  /** Plain-language hint shown to the learner. */
  hint: string;
  /** The words the toy reader accepts, listed so the check is not a mystery. */
  words: string;
  test: (description: string) => boolean;
}

export const CUES: Cue[] = [
  {
    id: 'email-not-id',
    set: 'bad',
    tool: 'get_customer',
    hint: 'Say what kind of ID it needs, and what to do when you only have an email.',
    words: 'cus_ ; the word search ; "not" near "email"',
    test: (d) => /cus_/i.test(d) || /\bsearch\b/i.test(d) || /\bnot\b[^.]*\bemail\b|\bemail\b[^.]*\bnot\b/i.test(d),
  },
  {
    id: 'limit',
    set: 'bad',
    tool: 'list_orders',
    hint: 'The tool already has a limit setting. Tell the reader when to use it.',
    words: 'limit ; most recent ; latest ; newest',
    test: (d) => /\blimit\b|\b(most recent|latest|newest)\b/i.test(d),
  },
  {
    id: 'captured',
    set: 'bad',
    tool: 'refund',
    hint: 'Say when to use refund instead of void_payment.',
    words: 'captured ; settled ; already ; charged ; void',
    test: (d) => /\b(captured|settled|already|charged|void)\b/i.test(d),
  },
  {
    id: 'cents',
    set: 'bad',
    tool: 'refund',
    hint: 'Say what unit the amount is in.',
    words: 'cents ; minor unit ; smallest unit',
    test: (d) => /\bcents?\b|minor unit|smallest (currency )?unit/i.test(d),
  },
  {
    id: 'latest',
    set: 'good',
    tool: 'billing_get_order_charges',
    hint: 'List the values that which accepts.',
    words: 'latest',
    test: (d) => /\blatest\b/i.test(d),
  },
];

export function cueMet(id: Cue['id'], description: string): boolean {
  const c = CUES.find((x) => x.id === id);
  return !!c && c.test(description);
}

/* ---------- scripted data ---------- */

const CUSTOMER_ID = 'cus_8f3a21';
const ORDER_ID = 'ord_10293';
const PAY_1 = 'pay_3Qa91xK';
const PAY_2 = 'pay_3Qa91yM';
const OWED_CENTS = 4200;

/** Thirty-eight made-up orders as a raw API would return them. */
export function rawOrdersJson(count = 38): string {
  const orders = [];
  for (let i = 0; i < count; i++) {
    const n = 10293 - i;
    const unit = 1400 + ((i * 370) % 2600);
    const qty = 1 + (i % 3);
    const subtotal = unit * qty;
    const tax = Math.round(subtotal * 0.07);
    const ship = i % 4 === 0 ? 0 : 495;
    orders.push({
      id: `ord_${n}`,
      object: 'order',
      customer_id: CUSTOMER_ID,
      status: i % 9 === 5 ? 'refunded' : 'fulfilled',
      created_at: `2026-${String(10 - Math.floor(i / 5)).padStart(2, '0')}-${String(1 + ((i * 3) % 28)).padStart(2, '0')}T14:02:0${i % 10}Z`,
      currency: 'usd',
      subtotal_cents: subtotal,
      tax_cents: tax,
      shipping_cents: ship,
      total_cents: subtotal + tax + ship,
      items: [{ sku: `SKU-${4000 + i}`, qty, unit_price_cents: unit }],
      shipping_address: { line1: '12 Example Street', city: 'Springfield', postal_code: '00000', country: 'US' },
      metadata: {},
    });
  }
  return JSON.stringify({ object: 'list', has_more: false, data: orders });
}

function rawLatestOrderJson(): string {
  return JSON.stringify({
    object: 'list',
    has_more: true,
    data: [
      {
        id: ORDER_ID,
        customer_id: CUSTOMER_ID,
        status: 'fulfilled',
        created_at: '2026-10-14T14:02:09Z',
        currency: 'usd',
        total_cents: OWED_CENTS,
        items: [{ sku: 'SKU-4000', qty: 1, unit_price_cents: OWED_CENTS }],
      },
    ],
  });
}

function rawPaymentsJson(): string {
  const base = { object: 'payment', order_id: ORDER_ID, amount: OWED_CENTS, currency: 'usd', status: 'succeeded', captured: true };
  return JSON.stringify({
    object: 'list',
    data: [
      { id: PAY_1, ...base, created: 1792764131, payment_method: 'pm_1PzQ8d2eZvKY', card: { brand: 'visa', last4: '4242', exp_month: 8, exp_year: 2029 }, processor_ref: 'ch_3Qa91xK0abc' },
      { id: PAY_2, ...base, created: 1792764133, payment_method: 'pm_1PzQ8d2eZvKY', card: { brand: 'visa', last4: '4242', exp_month: 8, exp_year: 2029 }, processor_ref: 'ch_3Qa91yM0abd' },
    ],
  });
}

/* ---------- runs ---------- */

export type Tag =
  | 'ok'
  | 'bad-args'
  | 'wrong-tool'
  | 'bloat'
  | 'opaque-error'
  | 'helpful-error'
  | 'silent-wrong'
  | 'preview'
  | 'approval'
  | 'timeout'
  | 'duplicate'
  | 'safe-retry';

export const TAG_LABEL: Record<Tag, string> = {
  ok: 'Works',
  'bad-args': 'Malformed arguments',
  'wrong-tool': 'Wrong tool',
  bloat: 'Huge result',
  'opaque-error': 'Unhelpful error',
  'helpful-error': 'Helpful error',
  'silent-wrong': 'Silent mistake',
  preview: 'Preview, nothing done yet',
  approval: 'Person approves',
  timeout: 'Reply lost',
  duplicate: 'Done a second time',
  'safe-retry': 'Safe retry',
};

/** Tags that count as a failed call in the scoreboard. */
const FAILED: Tag[] = ['bad-args', 'wrong-tool', 'opaque-error', 'helpful-error', 'timeout'];

export interface Turn {
  /** A model call, or a step the host app performs with no model call. */
  kind: 'call' | 'host';
  tool: string;
  args: Record<string, unknown>;
  result: string;
  tag: Tag;
  note: string;
}

export interface Run {
  set: SetId;
  turns: Turn[];
  answer: string;
  refundsCents: number[];
}

export interface Options {
  /** The refund call times out after it has gone through, so the model retries. */
  timeout: boolean;
}

function call(tool: string, args: Record<string, unknown>, result: string, tag: Tag, note: string): Turn {
  return { kind: 'call', tool, args, result, tag, note };
}

export function runBad(desc: Record<string, string>, opts: Options): Run {
  const d = (k: string) => desc[k] ?? BAD_DEFAULTS[k];
  const turns: Turn[] = [];
  const refunds: number[] = [];
  const email = 'maya.chen@example.com';

  // 1. Find the customer. The only tool that sounds right takes an ID, not an email.
  if (cueMet('email-not-id', d('get_customer'))) {
    turns.push(call('search', { q: email }, JSON.stringify({ results: [{ id: CUSTOMER_ID, name: 'Maya Chen' }] }), 'ok', 'The description said get_customer needs an ID and pointed to search, so the reader searched first.'));
  } else {
    turns.push(call('get_customer', { id: email }, 'Error: 404', 'bad-args', 'Nothing in "Gets a customer." says it needs an ID, so the reader passed the email.'));
    turns.push(call('get_customer', { id: 'maya.chen' }, 'Error: 404', 'opaque-error', 'The error gave no hint, so the reader guessed again and failed again.'));
    turns.push(call('search', { q: email }, JSON.stringify({ results: [{ id: CUSTOMER_ID, name: 'Maya Chen' }] }), 'ok', 'Only now did it try the search tool: two wasted calls.'));
  }

  // 2. The latest order.
  if (cueMet('limit', d('list_orders'))) {
    turns.push(call('list_orders', { customer_id: CUSTOMER_ID, limit: 1 }, rawLatestOrderJson(), 'ok', 'The description said to pass limit=1, so only one order came back.'));
  } else {
    turns.push(call('list_orders', { customer_id: CUSTOMER_ID }, rawOrdersJson(), 'bloat', 'The tool returns every order with every field. The reader needs one of them, but all 38 now sit in the context for the rest of the run.'));
  }

  // 3. The payments on that order.
  turns.push(call('list_payments', { order_id: ORDER_ID }, rawPaymentsJson(), 'ok', 'Correct tool, but the result is raw API JSON: processor references, card details and Unix timestamps the reader has to decode.'));

  // 4. Refund. The word "void" sounds like the right thing for a duplicate charge.
  const refundNow = cueMet('captured', d('refund'));
  const amount = cueMet('cents', d('refund')) ? OWED_CENTS : 42.0;
  const refundArgs = { payment_id: PAY_2, amount };
  if (!refundNow) {
    turns.push(call('void_payment', { payment_id: PAY_2 }, 'Error: payment_state_invalid', 'wrong-tool', 'To a reader, cancelling a duplicate charge sounds like voiding it. Nothing said void only works before capture, and the error is a code with no advice.'));
  }
  const refundResult = (cents: number) => JSON.stringify({ id: 're_3Qa9', object: 'refund', amount: cents, currency: 'usd', status: 'succeeded', payment: PAY_2 });
  const cents = Math.round(amount) === OWED_CENTS ? OWED_CENTS : Math.round(amount);
  const silent = cents !== OWED_CENTS;
  const wrongNote = 'The amount is read as 42 cents, not $42.00. The reply says succeeded, so the reader reports success.';
  if (opts.timeout) {
    refunds.push(cents);
    turns.push(call('refund', refundArgs, 'Error: request timed out (504)', 'timeout', 'The refund went through on the server, but the reply was lost on the way back.'));
    refunds.push(cents);
    turns.push(call('refund', refundArgs, refundResult(cents), 'duplicate', 'With no hint that a retry is unsafe, the reader sends it again. The money is refunded a second time.'));
  } else {
    refunds.push(cents);
    turns.push(call('refund', refundArgs, refundResult(cents), silent ? 'silent-wrong' : 'ok', silent ? wrongNote : 'The description gave the unit, so the amount is right. Nothing asked a person to approve it first.'));
  }

  return {
    set: 'bad',
    turns,
    answer: 'Done. Maya was charged twice for order ord_10293, and I refunded the duplicate payment.',
    refundsCents: refunds,
  };
}

export function runGood(desc: Record<string, string>, opts: Options): Run {
  const d = (k: string) => desc[k] ?? GOOD_DEFAULTS[k];
  const turns: Turn[] = [];
  const refunds: number[] = [];

  turns.push(call('customer_find', { email_or_name: 'maya.chen@example.com' }, '1 match: Maya Chen <maya.chen@example.com>, customer since 2023.', 'ok', 'The parameter name and its example carry the meaning. The result is a sentence, not a record.'));

  const concise =
    'Order ord_10293 (14 Oct 2026), total $42.00. Charges on this order: 2.\n' +
    '  c1: $42.00, card ending 4242, 14:02:11\n' +
    '  c2: $42.00, card ending 4242, 14:02:13\n' +
    'Use response_format="detailed" for processor IDs.';
  if (cueMet('latest', d('billing_get_order_charges'))) {
    turns.push(call('billing_get_order_charges', { customer: 'Maya Chen', which: 'latest' }, concise, 'ok', 'About one hundred tokens, with short references (c1, c2) the next call can use.'));
  } else {
    turns.push(call('billing_get_order_charges', { customer: 'Maya Chen', which: 'last' }, 'Invalid which: "last". Use "latest", "all", or an order number such as ord_10293. Try again with which="latest".', 'helpful-error', 'The description did not list the allowed values, so the reader guessed. The error says what is allowed and what to do.'));
    turns.push(call('billing_get_order_charges', { customer: 'Maya Chen', which: 'latest' }, concise, 'ok', 'One short retry fixes it.'));
  }

  const preview = 'Preview only, nothing has been refunded. Would refund $42.00 of charge c2 (card ending 4242). Call again with confirm=true to carry it out.';
  turns.push(call('billing_refund_charge', { charge_ref: 'c2', amount_usd: 42.0 }, preview, 'preview', 'Money moves in two steps. The first call changes nothing, so a wrong guess costs nothing.'));
  turns.push({ kind: 'host', tool: 'Approval (your app, not the model)', args: {}, result: 'A person approved: refund $42.00 to the card ending 4242.', tag: 'approval', note: 'The tool is marked as changing money, so the app asks a person before the second call.' });
  refunds.push(OWED_CENTS);
  if (opts.timeout) {
    turns.push(call('billing_refund_charge', { charge_ref: 'c2', amount_usd: 42.0, confirm: true }, 'Error: request timed out (504). The refund may already exist. It is safe to send the same call again.', 'timeout', 'The refund went through, but the reply was lost. The message says what is safe to do.'));
    turns.push(call('billing_refund_charge', { charge_ref: 'c2', amount_usd: 42.0, confirm: true }, 'Refund r1 already exists for this request: $42.00. No second refund was made.', 'safe-retry', 'The app derives an idempotency key from the request, so the retry returns the first refund instead of making another.'));
  } else {
    turns.push(call('billing_refund_charge', { charge_ref: 'c2', amount_usd: 42.0, confirm: true }, 'Refunded $42.00 to the card ending 4242. Refund r1.', 'ok', 'The amount is in dollars because the parameter is called amount_usd.'));
  }

  return {
    set: 'good',
    turns,
    answer: 'Maya was charged twice for order ord_10293. With your approval I refunded $42.00 (charge c2, refund r1).',
    refundsCents: refunds,
  };
}

export function run(set: SetId, desc: Record<string, string>, opts: Options): Run {
  return set === 'bad' ? runBad(desc, opts) : runGood(desc, opts);
}

/* ---------- scoring ---------- */

export interface Metrics {
  /** Model calls to tools (host steps are not counted). */
  calls: number;
  failedCalls: number;
  definitionTokens: number;
  resultTokens: number;
  /** Size of the context when the model writes its final answer. */
  peakContext: number;
  /** Input tokens read across every model turn, which is what a bill counts without caching. */
  cumulativeInput: number;
  refundedCents: number;
  correct: boolean;
  outcome: string;
}

export function usd(cents: number): string {
  return '$' + (cents / 100).toFixed(2);
}

export function measure(r: Run, tools: ToolDef[]): Metrics {
  const defs = definitionTokens(tools);
  let ctx = defs + estimateTokens(TASK);
  let cumulative = 0;
  let calls = 0;
  let failed = 0;
  let resultTokens = 0;
  for (const t of r.turns) {
    if (t.kind !== 'call') continue;
    cumulative += ctx; // the model reads everything so far, then writes a call
    const callTokens = estimateTokens(`${t.tool}(${JSON.stringify(t.args)})`);
    const resTokens = estimateTokens(t.result);
    ctx += callTokens + resTokens;
    resultTokens += resTokens;
    calls++;
    if (FAILED.includes(t.tag)) failed++;
  }
  cumulative += ctx; // the final answer turn
  ctx += estimateTokens(r.answer);
  const refunded = r.refundsCents.reduce((a, b) => a + b, 0);
  const correct = r.refundsCents.length === 1 && refunded === OWED_CENTS;
  let outcome: string;
  if (correct) outcome = `Correct: one refund of ${usd(refunded)}.`;
  else if (r.refundsCents.length > 1) outcome = `Wrong: ${r.refundsCents.length} refunds, ${usd(refunded)} in total. Maya is owed ${usd(OWED_CENTS)} once.`;
  else outcome = `Wrong: refunded ${usd(refunded)}. Maya is owed ${usd(OWED_CENTS)}.`;
  return { calls, failedCalls: failed, definitionTokens: defs, resultTokens, peakContext: ctx, cumulativeInput: cumulative, refundedCents: refunded, correct, outcome };
}

export function toolsFor(set: SetId, desc: Record<string, string>): ToolDef[] {
  return set === 'bad' ? badSet(desc) : goodSet(desc);
}

export function callText(t: Turn): string {
  return t.kind === 'host' ? t.tool : `${t.tool}(${JSON.stringify(t.args)})`;
}
