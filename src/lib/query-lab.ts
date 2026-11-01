import { CORPUS, QUESTIONS, STRATEGIES, type Passage, type Scripted, type Strategy } from './query-lab-data';

/**
 * A toy retrieval lab. Two scorers, both deterministic:
 *  - "keyword": BM25 over lightly stemmed words;
 *  - "embedding": a STAND-IN for an embedding model. It maps words to a few dozen hand-made concepts
 *    (so "dog" and "pet" land together) and compares the concept counts by cosine similarity. A real
 *    embedding model learns this from data and is far richer; this one only reproduces the one property
 *    the lesson needs, that different words for the same idea can score as close.
 *  - "hybrid": reciprocal rank fusion of the two.
 */

export type Scorer = 'keyword' | 'embedding' | 'hybrid';
export const SCORERS: { id: Scorer; label: string }[] = [
  { id: 'keyword', label: 'Keyword (BM25)' },
  { id: 'embedding', label: 'Embedding stand-in' },
  { id: 'hybrid', label: 'Hybrid (both)' },
];

const STOP = new Set(
  'a an and are as at be by can do does for from how i if in is it its me my of on or so than that the then there to up we what when where which who why will with you your about along get got any'.split(' '),
);

export function stem(w: string): string {
  let s = w;
  if (s.length > 4) {
    if (s.endsWith('ing')) s = s.slice(0, -3);
    else if (s.endsWith('ed')) s = s.slice(0, -2);
    else if (s.endsWith('es') && !s.endsWith('ses')) s = s.slice(0, -2);
    else if (s.endsWith('s') && !s.endsWith('ss')) s = s.slice(0, -1);
  } else if (s.length > 3 && s.endsWith('s') && !s.endsWith('ss')) {
    s = s.slice(0, -1);
  }
  if (s.length > 3 && s.endsWith('e')) s = s.slice(0, -1);
  return s;
}

export function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/e-bike/g, 'ebike')
    .replace(/won't/g, 'wont')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w))
    .map(stem);
}

const DOCS = CORPUS.map((p) => tokenise(`${p.title} ${p.text}`));
const AVG_LEN = DOCS.reduce((a, d) => a + d.length, 0) / DOCS.length;
const DF = new Map<string, number>();
for (const d of DOCS) for (const t of new Set(d)) DF.set(t, (DF.get(t) ?? 0) + 1);

/** BM25 with the usual k1 = 1.2 and b = 0.75. */
export function bm25(query: string): number[] {
  const q = tokenise(query);
  const N = DOCS.length;
  return DOCS.map((d) => {
    let score = 0;
    for (const t of new Set(q)) {
      const tf = d.filter((x) => x === t).length;
      if (tf === 0) continue;
      const df = DF.get(t) ?? 0;
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      score += (idf * tf * 2.2) / (tf + 1.2 * (1 - 0.75 + (0.75 * d.length) / AVG_LEN));
    }
    return score;
  });
}

/* ---------------------------------------------------------------- the embedding stand-in */

const CONCEPTS: Record<string, string[]> = {
  release: ['release', 'unlock', 'open', 'free', 'stuck', 'jam', 'jammed', 'trapped', 'wont', 'let', 'go', 'pull'],
  dock: ['dock', 'docking', 'station', 'stand', 'rack'],
  pet: ['pet', 'dog', 'cat', 'animal', 'puppy'],
  carry: ['carry', 'bring', 'take', 'basket', 'carrier', 'bag'],
  money: ['cost', 'price', 'pay', 'fee', 'euro', 'cheap', 'expensive', 'fare', 'much'],
  member: ['member', 'membership', 'subscription', 'join', 'monthly', 'month'],
  ride: ['ride', 'rid', 'trip', 'journey'],
  charge: ['battery', 'charg', 'pack', 'power', 'range', 'kilometre', 'far', 'last'],
  ebike: ['ebike', 'electric', 'assist', 'pedal'],
  night: ['night', 'evening', 'late', 'overnight', 'dusk', 'dark'],
  student: ['student', 'school', 'university', 'college'],
  refund: ['refund', 'reimburs', 'cancel', 'back'],
  fault: ['fault', 'faulty', 'broken', 'report', 'brake', 'tyre', 'damag'],
  app: ['app', 'phone', 'account', 'setting'],
};
const CONCEPT_OF = new Map<string, number>();
Object.values(CONCEPTS).forEach((words, i) => words.forEach((w) => CONCEPT_OF.set(stem(w), i)));
const N_CONCEPTS = Object.keys(CONCEPTS).length;
const N_HASH = 24;

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Concept counts, plus a small hashed part so that exact shared words still count a little. */
export function embed(text: string): number[] {
  const v = new Array(N_CONCEPTS + N_HASH).fill(0);
  for (const t of tokenise(text)) {
    const c = CONCEPT_OF.get(t);
    if (c !== undefined) v[c] += 1;
    v[N_CONCEPTS + (hash(t) % N_HASH)] += 0.35;
  }
  return v;
}
const cosine = (a: number[], b: number[]) => {
  let d = 0;
  let x = 0;
  let y = 0;
  for (let i = 0; i < a.length; i++) {
    d += a[i] * b[i];
    x += a[i] * a[i];
    y += b[i] * b[i];
  }
  return x === 0 || y === 0 ? 0 : d / Math.sqrt(x * y);
};
const DOC_VECS = CORPUS.map((p) => embed(`${p.title} ${p.text}`));
export const embeddingScores = (query: string): number[] => DOC_VECS.map((d) => cosine(embed(query), d));

/* ---------------------------------------------------------------- ranking and fusion */

/** Indexes of the passages, best first. Passages with a zero score are left out. */
export function rankBy(scores: number[]): number[] {
  return scores
    .map((s, i) => ({ s, i }))
    .filter((x) => x.s > 1e-9)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.i);
}

/** Reciprocal rank fusion (Cormack et al., 2009): sum of 1 / (60 + rank) over the lists. */
export function rrf(lists: number[][], k = 60): number[] {
  const score = new Map<number, number>();
  for (const list of lists) list.forEach((doc, r) => score.set(doc, (score.get(doc) ?? 0) + 1 / (k + r + 1)));
  return [...score.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([d]) => d);
}

export function search(query: string, scorer: Scorer): number[] {
  if (scorer === 'keyword') return rankBy(bm25(query));
  if (scorer === 'embedding') return rankBy(embeddingScores(query));
  return rrf([rankBy(bm25(query)), rankBy(embeddingScores(query))]);
}

/** Take passages from each list in turn, skipping repeats, until there are `k`. */
export function roundRobin(lists: number[][], k: number): number[] {
  const out: number[] = [];
  for (let r = 0; out.length < k && lists.some((l) => r < l.length); r++) {
    for (const l of lists) {
      if (r < l.length && !out.includes(l[r]) && out.length < k) out.push(l[r]);
    }
  }
  return out;
}

export type Result = {
  /** The queries that were sent to the search. */
  queries: string[];
  /** Passage ids returned, best first. */
  ids: string[];
  /** Extra language-model calls made before searching. */
  llmCalls: number;
  recall: number;
};

export function retrieve(q: Scripted, strategy: Strategy, scorer: Scorer, k: number): Result {
  let queries: string[];
  let top: number[];
  let llmCalls = 1;
  switch (strategy) {
    case 'raw':
      queries = [q.question];
      top = search(q.question, scorer).slice(0, k);
      llmCalls = 0;
      break;
    case 'rewrite':
      queries = [q.rewrite];
      top = search(q.rewrite, scorer).slice(0, k);
      break;
    case 'multi':
      queries = [q.question, ...q.multi];
      top = rrf(queries.map((x) => search(x, scorer))).slice(0, k);
      break;
    case 'split':
      queries = q.split;
      top = roundRobin(queries.map((x) => search(x, scorer)), k);
      break;
    case 'hyde':
      queries = [q.hyde];
      top = search(q.hyde, scorer).slice(0, k);
      break;
  }
  const ids = top.map((i) => CORPUS[i].id);
  const found = q.gold.filter((g) => ids.includes(g)).length;
  return { queries, ids, llmCalls, recall: found / q.gold.length };
}

/** Recall for every question and strategy, plus the mean per strategy. */
export function grid(scorer: Scorer, k: number) {
  const rows = QUESTIONS.map((q) => ({ id: q.id, cells: STRATEGIES.map((s) => retrieve(q, s.id, scorer, k).recall) }));
  const means = STRATEGIES.map((_, c) => rows.reduce((a, r) => a + r.cells[c], 0) / rows.length);
  return { rows, means };
}

/** Free-typed question: no gold set, so no recall. */
export function searchFree(text: string, scorer: Scorer, k: number): string[] {
  return search(text, scorer).slice(0, k).map((i) => CORPUS[i].id);
}

export const passageById = (id: string): Passage => CORPUS.find((p) => p.id === id)!;
export { CORPUS, QUESTIONS, STRATEGIES };
