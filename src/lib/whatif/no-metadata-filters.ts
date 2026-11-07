/**
 * What if search ignores who the user is and which version they use? A TOY document store shared by three
 * made-up customers (Acme, Birch, Cobalt). Every document carries metadata: tenant (whose it is), product version
 * and date. The search score is a plain word-overlap (cosine on word counts), the same for every document.
 * With a metadata filter the store keeps only the user's own tenant and version BEFORE ranking.
 * Every count on screen comes from these functions. The customers, versions and documents are invented.
 */

export type Tenant = 'Acme' | 'Birch' | 'Cobalt';
export type Doc = { id: string; tenant: Tenant; version: 1 | 2 | 3; date: string; title: string; text: string };
export type User = { id: string; tenant: Tenant; version: 1 | 2 | 3; label: string };

export const QUESTION = 'How do I reset the admin password?';
export const TOP_K = 5;

export const USERS: User[] = [
  { id: 'acme', tenant: 'Acme', version: 3, label: 'Acme, version 3' },
  { id: 'birch', tenant: 'Birch', version: 2, label: 'Birch, version 2' },
  { id: 'cobalt', tenant: 'Cobalt', version: 3, label: 'Cobalt, version 3' },
];

export const DOCS: Doc[] = [
  { id: 'ac3', tenant: 'Acme', version: 3, date: '2026-04', title: 'Acme: admin password (v3)', text: 'Reset the admin password in Settings, then Security. A link arrives by email.' },
  { id: 'ac2', tenant: 'Acme', version: 2, date: '2024-09', title: 'Acme: admin password (v2)', text: 'Reset the admin password on the Accounts page. Ask the Acme IT desk for the reset code.' },
  { id: 'ac1', tenant: 'Acme', version: 1, date: '2023-02', title: 'Acme: admin password (v1)', text: 'To reset the admin password, call the Acme IT desk.' },
  { id: 'bi3', tenant: 'Birch', version: 3, date: '2026-05', title: 'Birch: admin password (v3)', text: 'Reset the admin password with the Birch single sign-on page, then confirm by text message.' },
  { id: 'bi2', tenant: 'Birch', version: 2, date: '2025-01', title: 'Birch: admin password (v2)', text: 'Reset the admin password under Users, then Admins.' },
  { id: 'bi1', tenant: 'Birch', version: 1, date: '2023-06', title: 'Birch: admin password (v1)', text: 'The admin password is reset by the Birch help desk on request.' },
  { id: 'co3', tenant: 'Cobalt', version: 3, date: '2026-02', title: 'Cobalt: admin password (v3)', text: 'Reset the admin password from the Cobalt portal. The admin gets a one-time code.' },
  { id: 'co2', tenant: 'Cobalt', version: 2, date: '2024-11', title: 'Cobalt: admin password (v2)', text: 'Admin password reset: press Forgot password on the Cobalt login page.' },
  { id: 'co1', tenant: 'Cobalt', version: 1, date: '2023-08', title: 'Cobalt: admin password (v1)', text: 'Reset the admin password by email to the Cobalt office.' },
  { id: 'ac3x', tenant: 'Acme', version: 3, date: '2026-03', title: 'Acme: invoices (v3)', text: 'Download invoices from Billing, then Invoices.' },
  { id: 'bi2x', tenant: 'Birch', version: 2, date: '2025-02', title: 'Birch: change a user password (v2)', text: 'A user can change their own password under Profile.' },
  { id: 'co3x', tenant: 'Cobalt', version: 3, date: '2026-01', title: 'Cobalt: admin roles (v3)', text: 'An admin can add other admins under Roles.' },
  { id: 'ac2x', tenant: 'Acme', version: 2, date: '2024-05', title: 'Acme: export a report (v2)', text: 'Export a report to CSV from the Reports page.' },
  { id: 'bi3x', tenant: 'Birch', version: 3, date: '2026-06', title: 'Birch: set up sign-on (v3)', text: 'Set up single sign-on for all admins and users.' },
  { id: 'co2x', tenant: 'Cobalt', version: 2, date: '2024-12', title: 'Cobalt: password rules (v2)', text: 'A password needs 12 characters. Admins may change the rule.' },
  { id: 'bi1x', tenant: 'Birch', version: 1, date: '2023-03', title: 'Birch: add a user (v1)', text: 'Ask the Birch help desk to add a user.' },
  { id: 'ac1x', tenant: 'Acme', version: 1, date: '2023-01', title: 'Acme: lock an account (v1)', text: 'The Acme IT desk can lock an account and reset its password.' },
  { id: 'co1x', tenant: 'Cobalt', version: 1, date: '2023-09', title: 'Cobalt: audit log (v1)', text: 'The admin can read the audit log under Logs.' },
];

const STOP = new Set('a an the is are my your you we of in to if and can i me for with our it how do does what when on at by or that this be has have so from then'.split(' '));

/** Crude stemming so "resets" and "reset" match. */
export function stem(w: string): string {
  return w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w;
}

export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !STOP.has(w))
    .map(stem);
}

function counts(text: string): Record<string, number> {
  const m: Record<string, number> = {};
  for (const w of tokens(text)) m[w] = (m[w] || 0) + 1;
  return m;
}

/** Cosine similarity between the word counts of the question and the document, rounded to 3 places. */
export function score(query: string, doc: Doc): number {
  const a = counts(query);
  const b = counts(doc.title + ' ' + doc.text);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const k in a) {
    na += a[k] ** 2;
    if (b[k]) dot += a[k] * b[k];
  }
  for (const k in b) nb += b[k] ** 2;
  if (!na || !nb) return 0;
  return Math.round((dot / Math.sqrt(na * nb)) * 1000) / 1000;
}

/** Does the document belong to this user: their own customer AND their own product version? */
export const matches = (d: Doc, u: User) => d.tenant === u.tenant && d.version === u.version;
export const isLeak = (d: Doc, u: User) => d.tenant !== u.tenant;
/** Wrong version: the document is for another version than the user runs (older or newer). */
export const isWrongVersion = (d: Doc, u: User) => d.version !== u.version;
export type Kind = 'safe' | 'leak' | 'version';
/** A leak is the worst case, so it wins over a wrong version. */
export function kindOf(d: Doc, u: User): Kind {
  return isLeak(d, u) ? 'leak' : isWrongVersion(d, u) ? 'version' : 'safe';
}

/** How many documents the search looks at: all of them, or only the user's own tenant and version. */
export function pool(u: User, filtered: boolean): Doc[] {
  return filtered ? DOCS.filter((d) => matches(d, u)) : DOCS;
}

export type Hit = { doc: Doc; score: number; kind: Kind };

/** Top results by score (ties broken by id so the order is the same everywhere). Zero-score documents never show. */
export function search(u: User, filtered: boolean, k = TOP_K): Hit[] {
  return pool(u, filtered)
    .map((doc) => ({ doc, score: score(QUESTION, doc), kind: kindOf(doc, u) }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score || (a.doc.id < b.doc.id ? -1 : 1))
    .slice(0, k);
}

export type Counts = { shown: number; leaks: number; wrongVersion: number; safe: number; topIsSafe: boolean; searched: number };

export function countsFor(u: User, filtered: boolean, k = TOP_K): Counts {
  const hits = search(u, filtered, k);
  const leaks = hits.filter((h) => h.kind === 'leak').length;
  const wrongVersion = hits.filter((h) => h.kind === 'version').length;
  return {
    shown: hits.length,
    leaks,
    wrongVersion,
    safe: hits.length - leaks - wrongVersion,
    topIsSafe: hits.length > 0 && hits[0].kind === 'safe',
    searched: pool(u, filtered).length,
  };
}
