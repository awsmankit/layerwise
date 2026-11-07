/**
 * What if we search with the user's raw question? A short chat about three made-up storage plans. A follow-up such as
 * "and how much does it cost?" no longer says which plan it means. Search here is plain tf-idf word matching over nine
 * toy pages. The "rewriter" is a TOY rule set that resolves "it" and "what about the X one" from the chat so far;
 * a real rewriter is a language model prompted with the chat history. Every figure on the page comes from these functions.
 */

export type Page = { id: string; plan: Plan; topic: Topic; text: string };
export type Plan = 'Orbit' | 'Lumen' | 'Nimbus';
export type Topic = 'about' | 'cost' | 'offline';

export const PLANS: Plan[] = ['Lumen', 'Nimbus', 'Orbit'];

export const PAGES: Page[] = [
  { id: 'lumen-about', plan: 'Lumen', topic: 'about', text: 'About the Lumen plan: a team plan with shared folders and 2 TB of storage.' },
  { id: 'lumen-cost', plan: 'Lumen', topic: 'cost', text: 'The Lumen plan cost is 12 dollars a month for each person.' },
  { id: 'lumen-offline', plan: 'Lumen', topic: 'offline', text: 'The Lumen plan does not work offline. You need a connection.' },
  { id: 'nimbus-about', plan: 'Nimbus', topic: 'about', text: 'About the Nimbus plan: a backup plan that copies your folders every night.' },
  { id: 'nimbus-cost', plan: 'Nimbus', topic: 'cost', text: 'The Nimbus plan cost is 7 dollars a month for 500 GB.' },
  { id: 'nimbus-offline', plan: 'Nimbus', topic: 'offline', text: 'The Nimbus plan works offline for up to 7 days at a time.' },
  { id: 'orbit-about', plan: 'Orbit', topic: 'about', text: 'About the Orbit plan: the starter plan for one person with 50 GB of storage.' },
  { id: 'orbit-cost', plan: 'Orbit', topic: 'cost', text: 'The Orbit plan cost is 4 dollars a month, or free for the first month.' },
  { id: 'orbit-offline', plan: 'Orbit', topic: 'offline', text: 'The Orbit plan works offline: files you open are saved on your device.' },
];

export type Turn = { user: string; answer: string };

/** The chat. Each turn says which page would answer it. */
export const CHAT: Turn[] = [
  { user: 'Tell me about the Orbit plan.', answer: 'orbit-about' },
  { user: 'and how much does it cost?', answer: 'orbit-cost' },
  { user: 'does it work offline?', answer: 'orbit-offline' },
  { user: 'what about the Lumen one?', answer: 'lumen-offline' },
];

const STOP = new Set(
  'a an the is are of to in on and or it its for with you your me my do does what how much one can i at by be this that there'.split(' '),
);

export function stem(w: string): string {
  w = w.replace(/ies$/, 'y');
  return w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w;
}

export function tokens(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => !STOP.has(w)).map(stem);
}

const pageTokens = PAGES.map((p) => tokens(p.text));

/** Inverse document frequency over the nine pages. */
export function idf(term: string): number {
  const n = pageTokens.filter((t) => t.includes(term)).length;
  return Math.log(1 + PAGES.length / (n + 0.5));
}

/** Search score: the sum of idf for every query word the page contains (each word counted once). */
export function score(query: string, pageIndex: number): number {
  const words = new Set(tokens(query));
  let s = 0;
  for (const w of words) if (pageTokens[pageIndex].includes(w)) s += idf(w);
  return Math.round(s * 1e6) / 1e6;
}

export type Hit = { id: string; text: string; score: number; rank: number };

/** All pages that share a word with the query, best first. A tie keeps page order. */
export function search(query: string): Hit[] {
  return PAGES.map((p, i) => ({ id: p.id, text: p.text, score: score(query, i), i }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((h, r) => ({ id: h.id, text: h.text, score: h.score, rank: r + 1 }));
}

/* ---------- the toy rewriter ---------- */

const PLAN_RE = /\b(orbit|lumen|nimbus)\b/i;

export function planIn(text: string): Plan | null {
  const m = PLAN_RE.exec(text);
  return m ? ((m[1][0].toUpperCase() + m[1].slice(1).toLowerCase()) as Plan) : null;
}

/**
 * Turn each chat message into a question that stands alone, using only the messages before it.
 *  - names a plan and asks something: keep it
 *  - "what about the X one?": repeat the previous standalone question with plan X
 *  - says "it": put the plan being discussed in place of "it"
 *  - anything else: add the plan being discussed at the end
 */
export function rewriteChat(messages: string[]): string[] {
  const out: string[] = [];
  let plan: Plan | null = null;
  messages.forEach((raw, i) => {
    let msg = raw.trim().replace(/^(and|also|so)\s+/i, '');
    const named = planIn(msg);
    let standalone = msg;
    if (named && /^what about\b/i.test(msg) && i > 0) {
      const prev = out[i - 1];
      standalone = prev.replace(PLAN_RE, named);
    } else if (!named && plan) {
      standalone = /\bit\b/i.test(msg) ? msg.replace(/\bit\b/i, `the ${plan} plan`) : msg.replace(/[?.]?$/, ` for the ${plan} plan?`);
    }
    out.push(standalone.charAt(0).toUpperCase() + standalone.slice(1));
    plan = planIn(standalone) ?? plan;
  });
  return out;
}

export const STANDALONE = rewriteChat(CHAT.map((t) => t.user));

/** What gets sent to search at a turn: the raw message, or the rewritten standalone question. */
export function queryFor(turn: number, rewrite: boolean): string {
  return rewrite ? STANDALONE[turn] : CHAT[turn].user;
}

export function resultsFor(turn: number, rewrite: boolean): Hit[] {
  return search(queryFor(turn, rewrite));
}

/** Rank of the right page at a turn (null when search does not return it at all). */
export function answerRank(turn: number, rewrite: boolean): number | null {
  return resultsFor(turn, rewrite).find((h) => h.id === CHAT[turn].answer)?.rank ?? null;
}

/** Number of turns (up to and including `upTo`) where the right page is first. */
export function correctCount(rewrite: boolean, upTo = CHAT.length - 1): number {
  let n = 0;
  for (let t = 0; t <= upTo; t++) if (answerRank(t, rewrite) === 1) n++;
  return n;
}

/** How many pages tie for the top score at this turn: if more than one, search cannot tell them apart. */
export function topTies(turn: number, rewrite: boolean): number {
  const r = resultsFor(turn, rewrite);
  return r.length ? r.filter((h) => h.score === r[0].score).length : 0;
}
