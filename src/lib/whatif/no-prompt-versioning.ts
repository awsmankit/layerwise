/**
 * What if prompts are edited live with no versions?
 *
 * A scripted TOY, not real model output. A support prompt starts with three lines and gets 8 edits. Instead of calling a
 * model, each of 40 test cases says which prompt lines it needs and which line breaks it, and a case passes when the
 * prompt has everything it needs and nothing it cannot live with. That keeps every number checkable by hand while showing the
 * real pattern: a total that keeps rising can hide one group of cases that broke, and only saved versions plus a fixed
 * test set let you find the edit that did it.
 */

export type Line = { id: string; text: string };

export const startLines: Line[] = [
  { id: 'role', text: 'You are a support assistant for an online shop.' },
  { id: 'policy', text: 'Refunds: explain the three refund steps and the 30-day rule.' },
  { id: 'ship', text: 'Shipping: quote the delivery window from the order data.' },
];

export type Edit = { label: string; op: 'add' | 'reword'; id: string; text: string };

/** The scripted history: edit 1 produces version 1, and so on. Version 0 is the start. */
export const edits: Edit[] = [
  { label: 'Add account help', op: 'add', id: 'account', text: 'Account problems: send the password reset steps.' },
  { label: 'Add a warm tone', op: 'add', id: 'tone', text: 'Be warm and use plain words.' },
  { label: 'Greet by name', op: 'add', id: 'greet', text: 'Greet the customer by name.' },
  { label: 'Keep answers short', op: 'add', id: 'short', text: 'Answer in two sentences at most.' },
  { label: 'Offer a human', op: 'add', id: 'escalate', text: 'If the customer is angry, offer a human agent.' },
  { label: 'Ask for order number', op: 'add', id: 'ordernum', text: 'Always ask for the order number first.' },
  { label: 'Sign off', op: 'add', id: 'sign', text: 'Sign off with the shop name.' },
  { label: 'Reword the greeting', op: 'reword', id: 'greet', text: 'Say hello by name and thank them for waiting.' },
];

export const categories = ['refund', 'shipping', 'account', 'angry', 'chat'] as const;
export type Category = (typeof categories)[number];
export const categoryLabel: Record<Category, string> = { refund: 'Refunds', shipping: 'Shipping', account: 'Account', angry: 'Angry', chat: 'Chat' };

export type Case = { id: string; category: Category; label: string; needs: string[]; forbids: string[] };

const refundLabels = [
  'Refund for a lamp that arrived broken',
  'Refund after 20 days, no box',
  'Refund for the wrong size',
  'Refund when the parcel never came',
  'Do you offer refunds?',
  'What is the refund window?',
  'Refund for a gift?',
  'Refund part of an order?',
];

/** 40 cases, 8 per category. Refund cases 1 to 4 are the long, multi-step ones: they cannot be answered in two sentences. */
export const cases: Case[] = [
  ...refundLabels.map((label, i): Case => ({ id: `R${i + 1}`, category: 'refund', label, needs: ['policy'], forbids: i < 4 ? ['short'] : [] })),
  ...Array.from({ length: 8 }, (_, i): Case => ({ id: `S${i + 1}`, category: 'shipping', label: `Shipping question ${i + 1}`, needs: i < 4 ? ['ship'] : ['ship', 'ordernum'], forbids: [] })),
  ...Array.from({ length: 8 }, (_, i): Case => ({ id: `A${i + 1}`, category: 'account', label: `Account question ${i + 1}`, needs: ['account'], forbids: [] })),
  ...Array.from({ length: 8 }, (_, i): Case => ({ id: `G${i + 1}`, category: 'angry', label: `Angry customer ${i + 1}`, needs: ['escalate'], forbids: [] })),
  ...Array.from({ length: 8 }, (_, i): Case => ({ id: `C${i + 1}`, category: 'chat', label: `Chat message ${i + 1}`, needs: i < 4 ? ['tone'] : ['short'], forbids: [] })),
];

export const VERSIONS = edits.length + 1;

/** The prompt lines at version v (0 is the start). */
export function promptAt(v: number): Line[] {
  const n = Math.max(0, Math.min(edits.length, v));
  let lines = startLines.map((l) => ({ ...l }));
  for (let i = 0; i < n; i++) {
    const e = edits[i];
    if (e.op === 'add') lines = [...lines, { id: e.id, text: e.text }];
    else lines = lines.map((l) => (l.id === e.id ? { id: l.id, text: e.text } : l));
  }
  return lines;
}

export function passes(c: Case, lines: Line[]): boolean {
  const ids = new Set(lines.map((l) => l.id));
  return c.needs.every((n) => ids.has(n)) && !c.forbids.some((f) => ids.has(f));
}

export type Score = { version: number; total: number; by: Record<Category, number>; failing: string[] };

/** Run the 40 cases against version v. */
export function score(v: number): Score {
  const lines = promptAt(v);
  const by = { refund: 0, shipping: 0, account: 0, angry: 0, chat: 0 } as Record<Category, number>;
  const failing: string[] = [];
  for (const c of cases) {
    if (passes(c, lines)) by[c.category]++;
    else failing.push(c.id);
  }
  return { version: v, total: cases.length - failing.length, by, failing };
}

export const history: Score[] = Array.from({ length: VERSIONS }, (_, v) => score(v));

/** The version at which a category's passes first drop below the best so far, or null. */
export function firstDrop(cat: Category, hist: Score[] = history): number | null {
  let best = hist[0].by[cat];
  for (let v = 1; v < hist.length; v++) {
    if (hist[v].by[cat] < best) return v;
    best = Math.max(best, hist[v].by[cat]);
  }
  return null;
}

/** Edits where the total did not fall but a category did: the drop is hidden by gains elsewhere. */
export function hiddenDrops(hist: Score[] = history): { version: number; category: Category; lost: number; totalChange: number }[] {
  const out: { version: number; category: Category; lost: number; totalChange: number }[] = [];
  for (let v = 1; v < hist.length; v++) {
    const totalChange = hist[v].total - hist[v - 1].total;
    for (const cat of categories) {
      const lost = hist[v - 1].by[cat] - hist[v].by[cat];
      if (lost > 0 && totalChange >= 0) out.push({ version: v, category: cat, lost, totalChange });
    }
  }
  return out;
}

export type Bisect = { culprit: number; tested: number[] };

/** Binary search over saved versions: version `good` is known fine, version `bad` is known broken. Returns the first broken version and the versions that were tested. */
export function bisect(isBad: (v: number) => boolean, good = 0, bad = VERSIONS - 1): Bisect {
  let lo = good;
  let hi = bad;
  const tested: number[] = [];
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    tested.push(mid);
    if (isBad(mid)) hi = mid;
    else lo = mid;
  }
  return { culprit: hi, tested };
}

/** Bisect on "refund cases are not all passing". */
export const bisectRefunds = (): Bisect => bisect((v) => history[v].by.refund < 8);

/** The lines that differ between version v-1 and v (the saved diff), as text. */
export function diffAt(v: number): { kind: 'add' | 'reword'; text: string; before?: string } | null {
  if (v < 1 || v > edits.length) return null;
  const e = edits[v - 1];
  const before = e.op === 'reword' ? promptAt(v - 1).find((l) => l.id === e.id)?.text : undefined;
  return { kind: e.op, text: e.text, before };
}
