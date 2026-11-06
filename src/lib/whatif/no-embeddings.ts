/**
 * What if we do not use embeddings? A toy that compares keyword search with meaning search.
 * The "meaning" side uses a tiny hand-built word-vector table (5 numbers per word, one per topic).
 * It is a TOY: real embeddings are learned from huge amounts of text and have hundreds or thousands of numbers.
 * Every figure on the page comes from these functions.
 */

/** The five topics the toy vectors measure. Each word gets a number for each topic. */
export const DIMS = ['money', 'shipping', 'account', 'repair', 'shop'] as const;
export const DIM_SHORT = ['$', 'ship', 'acct', 'fix', 'shop'] as const;

/** Words that carry no topic and are skipped by both searches. */
export const STOP = new Set([
  'a', 'an', 'the', 'is', 'are', 'my', 'your', 'you', 'we', 'of', 'in', 'to', 'if', 'and', 'can', 'i', 'me', 'for', 'within', 'with', 'our', 'it', 'how', 'do', 'out', 'get', 'no',
]);

/** The toy word-vector table: topic strength per word, in the order of DIMS. Hand-built, not learned. */
export const WORD_VECTORS: Record<string, number[]> = {
  // money
  refund: [1, 0, 0, 0, 0],
  money: [1, 0, 0, 0, 0],
  cash: [1, 0, 0, 0, 0],
  reimburse: [1, 0, 0, 0, 0],
  back: [0.4, 0, 0, 0, 0],
  return: [0.7, 0.3, 0, 0, 0],
  // shipping
  parcel: [0, 1, 0, 0, 0],
  package: [0, 1, 0, 0, 0],
  delivery: [0, 1, 0, 0, 0],
  shipping: [0, 1, 0, 0, 0],
  arrives: [0, 1, 0, 0, 0],
  arrive: [0, 1, 0, 0, 0],
  order: [0, 0.6, 0, 0, 0],
  where: [0, 0.3, 0, 0, 0],
  days: [0, 0.3, 0, 0, 0],
  // account
  password: [0, 0, 1, 0, 0],
  login: [0, 0, 1, 0, 0],
  account: [0, 0, 1, 0, 0],
  access: [0, 0, 1, 0, 0],
  sign: [0, 0, 0.8, 0, 0],
  locked: [0, 0, 0.8, 0, 0],
  reset: [0, 0, 0.8, 0, 0],
  cannot: [0, 0, 0.3, 0, 0],
  // repair
  broken: [0, 0, 0, 1, 0],
  fix: [0, 0, 0, 1, 0],
  repair: [0, 0, 0, 1, 0],
  cracked: [0, 0, 0, 1, 0],
  smashed: [0, 0, 0, 1, 0],
  damaged: [0, 0, 0, 1, 0],
  screen: [0, 0, 0, 1, 0],
  screens: [0, 0, 0, 1, 0],
  phone: [0, 0, 0, 0.5, 0],
  devices: [0, 0, 0, 0.5, 0],
  // shop
  opening: [0, 0, 0, 0, 1],
  hours: [0, 0, 0, 0, 1],
  store: [0, 0, 0, 0, 1],
  locations: [0, 0, 0, 0, 1],
  visit: [0, 0, 0, 0, 1],
  open: [0, 0, 0, 0, 1],
};

export type Doc = { id: string; text: string };
export type Query = { id: string; text: string; answer: string };

export const DOCS: Doc[] = [
  { id: 'refunds', text: 'Refund policy: we return your money within 14 days.' },
  { id: 'delivery', text: 'Delivery times: your parcel arrives in 3 to 5 days.' },
  { id: 'password', text: 'Reset your password if you are locked out of your account.' },
  { id: 'repairs', text: 'Repair service: we fix cracked screens and damaged devices.' },
  { id: 'hours', text: 'Opening hours and store locations.' },
];

export const QUERIES: Query[] = [
  { id: 'cash', text: 'get my cash back', answer: 'refunds' },
  { id: 'package', text: 'where is my package', answer: 'delivery' },
  { id: 'signin', text: 'cannot sign in', answer: 'password' },
  { id: 'smashed', text: 'my phone screen is smashed', answer: 'repairs' },
  { id: 'refund', text: 'refund policy', answer: 'refunds' },
];

export type Mode = 'keyword' | 'meaning';

/** Meaning search only returns a document if it is at least this similar (cosine). Example setting. */
export const MEANING_CUTOFF = 0.5;

/** Lowercase words of the text with the empty ones and the stop words removed. */
export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !STOP.has(w));
}

/** Keyword search score: how many different words the query and the document share, exactly spelled the same. */
export function keywordScore(query: string, doc: string): number {
  const d = new Set(tokens(doc));
  return [...new Set(tokens(query))].filter((w) => d.has(w)).length;
}

/** The toy embedding: add up the vectors of the words it knows. Unknown words add nothing. */
export function embed(text: string): number[] {
  const out = DIMS.map(() => 0);
  for (const w of tokens(text)) {
    const v = WORD_VECTORS[w];
    if (v) v.forEach((x, i) => (out[i] += x));
  }
  return out;
}

/** Cosine similarity: 1 means same direction (same topic), 0 means nothing in common. */
export function cosine(a: number[], b: number[]): number {
  const dot = a.reduce((s, x, i) => s + x * b[i], 0);
  const na = Math.sqrt(a.reduce((s, x) => s + x * x, 0));
  const nb = Math.sqrt(b.reduce((s, x) => s + x * x, 0));
  return na === 0 || nb === 0 ? 0 : dot / (na * nb);
}

export type Ranked = { id: string; score: number; hit: boolean };

/** Every document ranked for the query. `hit` means the search would actually show it. */
export function rank(query: string, mode: Mode): Ranked[] {
  const q = embed(query);
  return DOCS.map((d, i) => {
    const score = mode === 'keyword' ? keywordScore(query, d.text) : cosine(q, embed(d.text));
    return { id: d.id, score, hit: mode === 'keyword' ? score > 0 : score >= MEANING_CUTOFF, i };
  })
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map(({ id, score, hit }) => ({ id, score, hit }));
}

/** True when the right document is the top result and is actually shown. */
export function success(q: Query, mode: Mode): boolean {
  const top = rank(q.text, mode)[0];
  return top.hit && top.id === q.answer;
}

/** How many of the example questions each search gets right at rank 1. */
export function successCount(mode: Mode): number {
  return QUERIES.filter((q) => success(q, mode)).length;
}

/** Words of the query that appear in the document, for highlighting. */
export function sharedWords(query: string, doc: string): string[] {
  const d = new Set(tokens(doc));
  return [...new Set(tokens(query))].filter((w) => d.has(w));
}
