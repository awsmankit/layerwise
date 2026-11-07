/**
 * What if search uses only vectors, with no keyword matching? A TOY with ten tiny support pages.
 * Keyword side: BM25 (the classic word-matching score) computed over the ten pages.
 * Vector side: a hand-built "meaning" table with seven numbers per word. Words it knows (payment, refused, lid) share
 * a topic with their synonyms. Anything it does NOT know, such as an error code or a rare surname, falls into one
 * blurry "some code" or "some name" slot: every code looks the same to it. Real embeddings are learned and do
 * distinguish codes a little, but they blur them in the same way. Fusion is reciprocal rank fusion (Cormack et al., 2009).
 * Every figure on the page comes from these functions.
 */

export type Doc = { id: string; text: string };

export const DOCS: Doc[] = [
  { id: 'e4012', text: 'Error E-4012: payment declined, the card has expired.' },
  { id: 'e4021', text: 'Error E-4021: payment declined, the card has no funds.' },
  { id: 'e4102', text: 'Error E-4102: payment declined, the card is blocked.' },
  { id: 'partA', text: 'Part HX-7731A is the rechargeable battery door for the charger.' },
  { id: 'partB', text: 'Part HX-7731B is the rechargeable battery door for the charging case.' },
  { id: 'partC', text: 'Part HX-7731C is the rechargeable battery door for the travel charger.' },
  { id: 'drL', text: 'Dr Lindqvist-Haro leads the audiology clinic on Mondays.' },
  { id: 'drO', text: 'Dr Okonkwo-Smythe leads the audiology clinic on Tuesdays.' },
  { id: 'drA', text: 'Dr Adeyemi-Clarke leads the audiology clinic on Fridays.' },
  { id: 'declined', text: 'What to do if your payment is declined: contact your bank.' },
  { id: 'cover', text: 'How to replace the battery cover on your charger.' },
  { id: 'blink', text: 'Charger troubleshooting: if the light blinks, reset the charger.' },
];

export type Query = { id: string; text: string; answer: string; note: string };

export const QUERIES: Query[] = [
  { id: 'code', text: 'E-4021', answer: 'e4021', note: 'an exact error code' },
  { id: 'part', text: 'HX-7731C', answer: 'partC', note: 'an exact part number' },
  { id: 'name', text: 'Okonkwo-Smythe', answer: 'drO', note: 'a rare surname' },
  { id: 'refused', text: 'my money was refused, what now', answer: 'declined', note: 'a different way of saying it' },
  { id: 'lid', text: 'how do I swap the lid on my power pack', answer: 'cover', note: 'a different way of saying it' },
];

export const STOP = new Set(
  'a an the is are was were my your you we of in to if and can i me for on at by or that this be with our it how do what now ask could not after any one'.split(' '),
);

/** Lower-case words; hyphenated things such as e-4021 stay in one piece. Crude stemming of plurals. */
export function tokens(text: string): string[] {
  const raw = text.toLowerCase().match(/[a-z0-9]+(?:-[a-z0-9]+)*/g) ?? [];
  return raw
    .filter((w) => !STOP.has(w))
    .map((w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') && !/\d/.test(w) ? w.slice(0, -1) : w));
}

/* ---------- keyword search: BM25 ---------- */

export const K1 = 1.2;
export const B = 0.75;

const docTokens = DOCS.map((d) => tokens(d.text));
const avgLen = docTokens.reduce((s, t) => s + t.length, 0) / docTokens.length;

/** BM25 inverse document frequency of a term over the ten pages: ln(1 + (N - n + 0.5) / (n + 0.5)). */
export function idf(term: string): number {
  const n = docTokens.filter((t) => t.includes(term)).length;
  return Math.log(1 + (DOCS.length - n + 0.5) / (n + 0.5));
}

export function bm25(query: string, docIndex: number): number {
  const d = docTokens[docIndex];
  let score = 0;
  for (const term of new Set(tokens(query))) {
    const tf = d.filter((w) => w === term).length;
    if (!tf) continue;
    score += idf(term) * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * d.length) / avgLen)));
  }
  return score;
}

/* ---------- vector search: a hand-built meaning table ---------- */

export const DIMS = ['money', 'fault', 'people', 'device', 'how-to', 'code or name'] as const;
const N = DIMS.length;

const WORDS: Record<string, number[]> = {};
function add(topic: number, words: string, strength = 1) {
  for (const w of words.split(' ')) {
    const v = WORDS[w] ?? new Array<number>(N).fill(0);
    v[topic] = Math.max(v[topic], strength);
    WORDS[w] = v;
  }
}
add(0, 'payment card declined refused rejected money paid pay gateway refund charge expired fund blocked bank contact');
add(1, 'error failed timed retry again troubleshooting reset blinks light fix problem wrong', 0.8);
add(2, 'dr audiology clinic leads mondays tuesdays fridays', 0.7);
add(3, 'battery door charger charging case travel rechargeable cover lid power pack part replace swap', 0.9);
add(4, 'how fix check replace swap try ask customer open change', 0.4);

/**
 * A word the table knows gets its topic numbers. A word it does not know carries nothing, except codes (anything with a
 * digit) and hyphenated names: the toy cannot read those as meaning, so every one of them lands in the same last slot.
 */
export function wordVector(w: string): number[] {
  if (WORDS[w]) return WORDS[w];
  const v = new Array<number>(N).fill(0);
  if (/\d/.test(w) || w.includes('-')) v[N - 1] = 1;
  return v;
}

export function embed(text: string): number[] {
  const v = new Array<number>(N).fill(0);
  for (const w of tokens(text)) {
    const wv = wordVector(w);
    for (let i = 0; i < N; i++) v[i] += wv[i];
  }
  return v;
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/* ---------- ranked lists ---------- */

export type Ranked = { id: string; score: number; rank: number };

/** How many results each search hands to the fusion step (here: all twelve pages). */
export const TOP = 12;

function rankBy(scores: number[], minScore: number): Ranked[] {
  return scores
    .map((score, i) => ({ id: DOCS[i].id, score, i }))
    .filter((r) => r.score > minScore)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((r, k) => ({ id: r.id, score: r.score, rank: k + 1 }));
}

/** Keyword list: only pages that share at least one word with the query are returned at all. */
export function keywordList(query: string): Ranked[] {
  return rankBy(DOCS.map((_, i) => bm25(query, i)), 0).slice(0, TOP);
}

/** Vector list: every page has some similarity, so the list is always full. Ties keep page order. */
export function vectorList(query: string): Ranked[] {
  const q = embed(query);
  return rankBy(DOCS.map((d) => Math.round(cosine(q, embed(d.text)) * 1e9) / 1e9), -1).slice(0, TOP);
}

/* ---------- reciprocal rank fusion ---------- */

export const RRF_K = 60;

export type Fused = { id: string; score: number; fromKeyword: number | null; fromVector: number | null; rank: number };

/** RRF: score(d) = sum over the lists that contain d of 1 / (k + rank of d in that list). */
export function fuse(lists: Ranked[][], k = RRF_K): Fused[] {
  const map = new Map<string, Fused>();
  lists.forEach((list, li) => {
    for (const r of list) {
      const f = map.get(r.id) ?? { id: r.id, score: 0, fromKeyword: null, fromVector: null, rank: 0 };
      f.score += 1 / (k + r.rank);
      if (li === 0) f.fromKeyword = r.rank;
      else f.fromVector = r.rank;
      map.set(r.id, f);
    }
  });
  return [...map.values()]
    .sort((a, b) => b.score - a.score || DOCS.findIndex((d) => d.id === a.id) - DOCS.findIndex((d) => d.id === b.id))
    .map((f, i) => ({ ...f, rank: i + 1 }));
}

export function hybridList(query: string, k = RRF_K): Fused[] {
  return fuse([keywordList(query), vectorList(query)], k);
}

/** Rank (1 is best) of the right page in a list, or null when it is not in the list. */
export function rankOf(list: { id: string; rank: number }[], answer: string): number | null {
  return list.find((r) => r.id === answer)?.rank ?? null;
}

export type Mode = 'keyword' | 'vector' | 'hybrid';

export function answerRank(q: Query, mode: Mode, k = RRF_K): number | null {
  const list = mode === 'keyword' ? keywordList(q.text) : mode === 'vector' ? vectorList(q.text) : hybridList(q.text, k);
  return rankOf(list, q.answer);
}

/** How many of the example questions put the right page first. */
export function firstCount(mode: Mode, k = RRF_K): number {
  return QUERIES.filter((q) => answerRank(q, mode, k) === 1).length;
}

export const shortTitle = (id: string): string => {
  const t = DOCS.find((d) => d.id === id)!.text;
  return t.length > 72 ? t.slice(0, 70).replace(/\s+\S*$/, '') + '...' : t;
};
