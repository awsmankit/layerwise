/**
 * What if personal data is not removed before it is logged or used? Twelve MADE-UP chat log lines.
 * Every name, email, phone number and ID is fake: emails end in example.com, phone numbers are in the 555-01xx block
 * reserved for fiction, and customer numbers are invented. A deliberately simple pattern filter is run on them
 * and its catches, misses and false alarms are counted from the real matches, not typed in.
 */

export type Kind = 'name' | 'email' | 'phone' | 'id' | 'address';

export type Line = {
  text: string;
  /** The personal items in the line, as exact substrings of `text`. */
  items: { text: string; kind: Kind }[];
};

export const LINES: Line[] = [
  { text: 'Hi, I am Alex Testuser, my email is alex.testuser@example.com, can you reset my password?', items: [{ text: 'Alex Testuser', kind: 'name' }, { text: 'alex.testuser@example.com', kind: 'email' }] },
  { text: 'Please call me on 555-0142 about my refund.', items: [{ text: '555-0142', kind: 'phone' }] },
  { text: 'My customer number is CUST-100234 and the parcel never arrived.', items: [{ text: 'CUST-100234', kind: 'id' }] },
  { text: 'This is Pat Placeholder. Phone 555-0117, email pat@example.com.', items: [{ text: 'Pat Placeholder', kind: 'name' }, { text: '555-0117', kind: 'phone' }, { text: 'pat@example.com', kind: 'email' }] },
  { text: 'Send the invoice to robin.mockley at example dot com please.', items: [{ text: 'robin.mockley at example dot com', kind: 'email' }] },
  { text: 'Ring me on five five five zero one five three after lunch.', items: [{ text: 'five five five zero one five three', kind: 'phone' }] },
  { text: 'Account CUST 100871 is locked, I am Sam Samplesmith.', items: [{ text: 'CUST 100871', kind: 'id' }, { text: 'Sam Samplesmith', kind: 'name' }] },
  { text: 'My card was declined, ID CUST-100999, reply to kim@example.com.', items: [{ text: 'CUST-100999', kind: 'id' }, { text: 'kim@example.com', kind: 'email' }] },
  { text: 'Lee Fakename here, my number is 555 0188.', items: [{ text: 'Lee Fakename', kind: 'name' }, { text: '555 0188', kind: 'phone' }] },
  { text: 'Can you ship it to 12 Example Street, Sampletown?', items: [{ text: '12 Example Street, Sampletown', kind: 'address' }] },
  { text: 'Thanks! jo.demoson@example.com is the one on file.', items: [{ text: 'jo.demoson@example.com', kind: 'email' }] },
  { text: 'Is part 555-0123 back in stock yet?', items: [] },
];

/** The simple filter: three patterns. It has no list of names and does not read words or addresses. */
export const PATTERNS: { label: string; tag: string; re: RegExp }[] = [
  { label: 'email', tag: '[EMAIL]', re: /[A-Za-z0-9._-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { label: 'phone', tag: '[PHONE]', re: /\b555[-. ]01\d\d\b/g },
  { label: 'customer ID', tag: '[ID]', re: /\bCUST-\d{6}\b/g },
];

export type Match = { start: number; end: number; tag: string };

export function matches(text: string): Match[] {
  const out: Match[] = [];
  for (const p of PATTERNS) {
    for (const m of text.matchAll(new RegExp(p.re.source, 'g'))) {
      out.push({ start: m.index!, end: m.index! + m[0].length, tag: p.tag });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

export type ItemRange = { start: number; end: number; kind: Kind; caught: boolean };

export function itemRanges(line: Line): ItemRange[] {
  const ms = matches(line.text);
  return line.items.map((it) => {
    const start = line.text.indexOf(it.text);
    const end = start + it.text.length;
    return { start, end, kind: it.kind, caught: ms.some((m) => m.start <= start && m.end >= end) };
  });
}

/** Matches that cover no personal item: harmless text the filter hid anyway. */
export function falseAlarms(line: Line): Match[] {
  const items = itemRanges(line);
  return matches(line.text).filter((m) => !items.some((i) => i.start < m.end && m.start < i.end));
}

export type Segment =
  | { type: 'plain'; text: string }
  | { type: 'exposed'; text: string; kind: Kind }
  | { type: 'caught'; text: string; tag: string }
  | { type: 'missed'; text: string; kind: Kind }
  | { type: 'false'; text: string; tag: string };

/** The line as it would be stored. With the filter off every personal item is exposed. With it on, matches become tags. */
export function segments(line: Line, filterOn: boolean): Segment[] {
  const items = itemRanges(line);
  const ms = filterOn ? matches(line.text) : [];
  const marks: { start: number; end: number; seg: Segment }[] = [];
  if (!filterOn) {
    for (const i of items) marks.push({ start: i.start, end: i.end, seg: { type: 'exposed', text: line.text.slice(i.start, i.end), kind: i.kind } });
  } else {
    for (const m of ms) {
      const hit = items.some((i) => i.start < m.end && m.start < i.end);
      marks.push({ start: m.start, end: m.end, seg: hit ? { type: 'caught', text: line.text.slice(m.start, m.end), tag: m.tag } : { type: 'false', text: line.text.slice(m.start, m.end), tag: m.tag } });
    }
    for (const i of items) if (!i.caught) marks.push({ start: i.start, end: i.end, seg: { type: 'missed', text: line.text.slice(i.start, i.end), kind: i.kind } });
  }
  marks.sort((a, b) => a.start - b.start);
  const out: Segment[] = [];
  let pos = 0;
  for (const m of marks) {
    if (m.start < pos) continue;
    if (m.start > pos) out.push({ type: 'plain', text: line.text.slice(pos, m.start) });
    out.push(m.seg);
    pos = m.end;
  }
  if (pos < line.text.length) out.push({ type: 'plain', text: line.text.slice(pos) });
  return out;
}

export type Tally = {
  lines: number;
  items: number;
  caught: number;
  missed: number;
  falseAlarms: number;
  /** Lines that still hold at least one personal item after filtering. */
  dirtyLines: number;
  byKind: Record<Kind, { total: number; caught: number }>;
};

export function tally(lines: Line[] = LINES): Tally {
  const byKind: Tally['byKind'] = { name: { total: 0, caught: 0 }, email: { total: 0, caught: 0 }, phone: { total: 0, caught: 0 }, id: { total: 0, caught: 0 }, address: { total: 0, caught: 0 } };
  let items = 0;
  let caught = 0;
  let falseN = 0;
  let dirty = 0;
  for (const l of lines) {
    const rs = itemRanges(l);
    items += rs.length;
    for (const r of rs) {
      byKind[r.kind].total++;
      if (r.caught) {
        caught++;
        byKind[r.kind].caught++;
      }
    }
    if (rs.some((r) => !r.caught)) dirty++;
    falseN += falseAlarms(l).length;
  }
  return { lines: lines.length, items, caught, missed: items - caught, falseAlarms: falseN, dirtyLines: dirty, byKind };
}

export const RETENTION_DAYS = [7, 30, 90, 365, 1095] as const;
export const READERS = ['Support team', 'Engineers on call', 'Analytics vendor', 'Model training job', 'Backups'] as const;

/**
 * A toy exposure score: personal items still in the log, times days they are kept, times how many groups can read them.
 * It is not a measure of real harm. It only shows that all three levers matter.
 */
export function exposure(itemsLeft: number, days: number, readers: number): number {
  return itemsLeft * days * readers;
}

export type Scenario = { label: string; items: number; days: number; readers: number; score: number };

export function scenarios(days: number, readers: number, t: Tally = tally()): Scenario[] {
  const mk = (label: string, items: number, d: number, r: number): Scenario => ({ label, items, days: d, readers: r, score: exposure(items, d, r) });
  return [
    mk('No filter', t.items, days, readers),
    mk('Simple filter', t.missed, days, readers),
    mk('Filter, 30 days, one reader', t.missed, Math.min(30, days), Math.min(1, readers)),
  ];
}
