/**
 * Cost per day of three ways to give a model a document collection:
 * stuff it all into every prompt ("long context"), the same with prompt caching,
 * or retrieve a few passages per question (RAG).
 *
 * All prices and multipliers are inputs. The defaults in the lesson are examples,
 * not quotes: read each vendor's current pricing page.
 */

export type LcInput = {
  /** Tokens in the whole collection. */
  corpus: number;
  /** Questions per day. */
  queries: number;
  /** Tokens in the question itself, plus any instructions that are not cached. */
  question: number;
  /** Tokens in the answer. */
  answer: number;
  /** Dollars per million input tokens. */
  pIn: number;
  /** Dollars per million output tokens. */
  pOut: number;
  /** Share of questions (0 to 1) that find the cached collection still warm. */
  hit: number;
  /** Price of reading cached tokens, as a multiple of the normal input price. */
  readMult: number;
  /** Price of writing tokens to the cache, as a multiple of the normal input price. */
  writeMult: number;
  /** Tokens of retrieved passages put in each RAG prompt. */
  ragTokens: number;
  /** Fixed dollars per day for retrieval infrastructure (index hosting, embeddings, reranker). */
  infra: number;
  /** The model's context window in tokens. */
  window: number;
};

export type Strategy = 'long' | 'cached' | 'rag';

/**
 * The worked example used in the lesson. Every number is an example, not a quote:
 * prices, multipliers, the collection size and the infrastructure cost are all made up.
 */
export const EXAMPLE: LcInput = {
  corpus: 150_000,
  queries: 2000,
  question: 200,
  answer: 400,
  pIn: 3,
  pOut: 15,
  hit: 0.9,
  readMult: 0.1,
  writeMult: 1.25,
  ragTokens: 4000,
  infra: 5,
  window: 1_000_000,
};

/** Average price multiplier on the collection's tokens when a share `hit` of questions read the cache and the rest rewrite it. */
export function cacheMultiplier(hit: number, readMult: number, writeMult: number): number {
  const h = Math.min(1, Math.max(0, hit));
  return h * readMult + (1 - h) * writeMult;
}

/**
 * The hit rate above which caching is cheaper than not caching, for the given multipliers.
 * Solves h*r + (1-h)*w = 1. Returns 0 when writing is free (w <= 1) and 1 when it can never pay (r >= 1).
 */
export function breakEvenHitRate(readMult: number, writeMult: number): number {
  if (writeMult <= 1) return 0;
  if (readMult >= 1) return 1;
  return (writeMult - 1) / (writeMult - readMult);
}

/** Questions per day, spread evenly, needed to keep a cache with this lifetime from expiring between questions. */
export function warmQueriesPerDay(ttlSeconds: number): number {
  return ttlSeconds > 0 ? 86400 / ttlSeconds : Infinity;
}

const outCost = (i: LcInput) => (i.answer * i.pOut) / 1e6;

/** Dollars for one question when the whole collection is in the prompt, with no caching. */
export function longPerQuery(i: LcInput): number {
  return ((i.corpus + i.question) * i.pIn) / 1e6 + outCost(i);
}

/** Dollars for one question when the collection sits in a cached prefix. The question itself is never cached. */
export function cachedPerQuery(i: LcInput): number {
  const m = cacheMultiplier(i.hit, i.readMult, i.writeMult);
  return ((i.corpus * m + i.question) * i.pIn) / 1e6 + outCost(i);
}

/** Dollars for one question with retrieval, excluding the fixed infrastructure cost. */
export function ragPerQuery(i: LcInput): number {
  return ((i.ragTokens + i.question) * i.pIn) / 1e6 + outCost(i);
}

export function dailyCost(i: LcInput, s: Strategy): number {
  if (s === 'long') return i.queries * longPerQuery(i);
  if (s === 'cached') return i.queries * cachedPerQuery(i);
  return i.queries * ragPerQuery(i) + i.infra;
}

/** Prompt tokens sent per question (what the model must read), for the latency note. */
export function promptTokens(i: LcInput, s: Strategy): number {
  return (s === 'rag' ? i.ragTokens : i.corpus) + i.question;
}

/** Does the collection, question and answer fit in the window? */
export function fits(i: LcInput): boolean {
  return i.corpus + i.question + i.answer <= i.window;
}

/**
 * The collection size (tokens) below which stuffing it in (with the given strategy)
 * costs no more per day than RAG. Null when the inputs make it undefined.
 */
export function breakEvenCorpus(i: LcInput, s: 'long' | 'cached'): number | null {
  if (i.queries <= 0 || i.pIn <= 0) return null;
  const m = s === 'long' ? 1 : cacheMultiplier(i.hit, i.readMult, i.writeMult);
  if (m <= 0) return null;
  return (i.ragTokens + (i.infra * 1e6) / (i.queries * i.pIn)) / m;
}

/**
 * Questions per day above which RAG becomes cheaper per day than stuffing the collection
 * (RAG has a fixed infrastructure cost, stuffing does not). Null when stuffing is cheaper at
 * every volume (the collection is no bigger than the retrieved passages) or inputs are undefined.
 */
export function breakEvenQueries(i: LcInput, s: 'long' | 'cached'): number | null {
  if (i.pIn <= 0) return null;
  const m = s === 'long' ? 1 : cacheMultiplier(i.hit, i.readMult, i.writeMult);
  const extra = i.corpus * m - i.ragTokens;
  if (extra <= 0) return null;
  return (i.infra * 1e6) / (extra * i.pIn);
}

export type TaskKind = 'lookup' | 'multi' | 'whole';
export type Churn = 'rarely' | 'daily' | 'constantly';

export type Note = { tone: 'ok' | 'warn' | 'info'; text: string };

/** Qualitative checks that the cost arithmetic cannot make. */
export function caveats(i: LcInput, task: TaskKind, churn: Churn, perUserAccess: boolean): Note[] {
  const notes: Note[] = [];
  if (!fits(i)) {
    notes.push({ tone: 'warn', text: 'The collection plus the question and answer does not fit in the window you set. Stuffing is not an option without shrinking or splitting it, so retrieve.' });
  } else if (i.corpus > 0.5 * i.window) {
    notes.push({ tone: 'warn', text: 'It fits, but fills more than half the window. Studies of long inputs found accuracy often falls well before the advertised limit, so test at this length on your own questions.' });
  }
  if (perUserAccess) {
    notes.push({ tone: 'warn', text: 'If people may see only some documents, a shared prompt (or shared cache) that holds all of them is a leak risk. Retrieval can filter by permission before anything reaches the model.' });
  }
  if (churn === 'constantly') {
    notes.push({ tone: 'warn', text: 'A collection that changes all the time keeps rewriting the cache prefix, so the hit rate you set here is optimistic. Retrieval re-indexes only what changed.' });
  } else if (churn === 'daily') {
    notes.push({ tone: 'info', text: 'Daily changes cost one cache write per change, which is small if many questions land in between.' });
  }
  if (task === 'whole') {
    notes.push({ tone: 'info', text: 'Questions about the whole collection ("what are the main themes?") are where retrieving a few passages fails by design. If it fits, long context can do this. If it does not, summarise in stages or look at graph-based indexes.' });
  } else if (task === 'multi') {
    notes.push({ tone: 'info', text: 'Questions that combine several facts are where published comparisons disagree. Run both designs on your own questions before deciding.' });
  } else {
    notes.push({ tone: 'ok', text: 'Looking up one fact is the case where retrieval is usually enough, and where the extra tokens of long context buy the least.' });
  }
  return notes;
}
