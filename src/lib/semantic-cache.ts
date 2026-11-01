/*
 * A small semantic-cache simulator for the "Semantic caching and batch APIs" lesson. A scripted stream of
 * questions to an invented shop's support bot goes through a cache that compares each new question with
 * the questions it has already answered.
 *
 * The "embedding" here is a stand-in: counts of three-letter chunks of the lowercased text, compared by
 * cosine similarity. A real system would call an embedding model, whose similarity scores are on a
 * different scale and would need their own threshold. The stream, the answers and every price are invented.
 * Pure functions, no DOM.
 */

export type Question = {
  /** What the user typed. */
  text: string;
  /** The shop (tenant) asking. Some answers differ by tenant. */
  tenant: 'North' | 'South';
  /** Which answer is correct for this question. Two questions with the same key may share a cached answer. */
  answer: string;
};

/** The invented answer table, for display. */
export const ANSWERS: Record<string, string> = {
  'password:reset': 'Use "Forgot password" on the sign-in page; a link arrives by email.',
  'password:two-factor': 'Sign in with a recovery code, then add a new device under Security.',
  'returns:North': 'North shop: returns are accepted within 30 days.',
  'returns:South': 'South shop: returns are accepted within 14 days.',
  'delivery:uk': 'UK delivery takes 2 to 3 working days.',
  'delivery:ireland': 'Delivery to Ireland takes 5 to 7 working days.',
  'hours:sunday': 'Sunday: closed.',
  'hours:monday': 'Monday: open from 9 am.',
  'cancel:order': 'Open Orders and choose Cancel before it ships.',
  'cancel:subscription': 'Open Billing and choose End subscription.',
};

export const STREAM: Question[] = [
  { text: 'How do I reset my password?', tenant: 'North', answer: 'password:reset' },
  { text: 'what is your return policy', tenant: 'North', answer: 'returns:North' },
  { text: 'How do I reset my password?', tenant: 'South', answer: 'password:reset' },
  { text: 'What is your return policy?', tenant: 'South', answer: 'returns:South' },
  { text: 'How do I reset my two-factor device?', tenant: 'North', answer: 'password:two-factor' },
  { text: 'How long does delivery take?', tenant: 'North', answer: 'delivery:uk' },
  { text: 'How long does delivery take to Ireland?', tenant: 'North', answer: 'delivery:ireland' },
  { text: 'How can I reset my password?', tenant: 'North', answer: 'password:reset' },
  { text: 'What time do you open on Sunday?', tenant: 'North', answer: 'hours:sunday' },
  { text: 'What time do you open on Monday?', tenant: 'North', answer: 'hours:monday' },
  { text: 'how do i reset my password?', tenant: 'South', answer: 'password:reset' },
  { text: 'what is your return policy', tenant: 'North', answer: 'returns:North' },
  { text: 'How do I cancel my order?', tenant: 'North', answer: 'cancel:order' },
  { text: 'How do I cancel my subscription?', tenant: 'North', answer: 'cancel:subscription' },
  { text: 'I forgot my password, how do I reset it?', tenant: 'North', answer: 'password:reset' },
  { text: 'What is your return policy', tenant: 'South', answer: 'returns:South' },
  { text: 'How long does delivery take?', tenant: 'South', answer: 'delivery:uk' },
  { text: 'How do I reset my password', tenant: 'North', answer: 'password:reset' },
  { text: 'How long does delivery take to Ireland?', tenant: 'South', answer: 'delivery:ireland' },
  { text: 'What time do you open on Sunday?', tenant: 'South', answer: 'hours:sunday' },
  { text: 'How do I cancel my order', tenant: 'South', answer: 'cancel:order' },
  { text: 'What time do you open on a Monday?', tenant: 'South', answer: 'hours:monday' },
  { text: 'how do I reset my two-factor device', tenant: 'South', answer: 'password:two-factor' },
  { text: 'How do I reset my password?', tenant: 'North', answer: 'password:reset' },
  { text: 'what is your return policy?', tenant: 'North', answer: 'returns:North' },
  { text: 'How do I cancel my subscription', tenant: 'South', answer: 'cancel:subscription' },
  { text: 'How can I reset my password?', tenant: 'South', answer: 'password:reset' },
  { text: 'How long will delivery take?', tenant: 'North', answer: 'delivery:uk' },
  { text: 'what is your return policy', tenant: 'South', answer: 'returns:South' },
  { text: 'What time do you open on Sunday?', tenant: 'North', answer: 'hours:sunday' },
  { text: 'How do I reset my password?', tenant: 'South', answer: 'password:reset' },
  { text: 'How do I cancel my order?', tenant: 'North', answer: 'cancel:order' },
  { text: 'How do I reset my two-factor device?', tenant: 'North', answer: 'password:two-factor' },
  { text: 'How long does delivery take to Ireland', tenant: 'North', answer: 'delivery:ireland' },
  { text: 'What is your return policy?', tenant: 'North', answer: 'returns:North' },
  { text: 'How do I reset my password', tenant: 'South', answer: 'password:reset' },
  { text: 'What time do you open on Monday', tenant: 'South', answer: 'hours:monday' },
  { text: 'How do I cancel my subscription?', tenant: 'North', answer: 'cancel:subscription' },
  { text: 'How can I reset my password?', tenant: 'North', answer: 'password:reset' },
  { text: 'How long does delivery take?', tenant: 'South', answer: 'delivery:uk' },
];

/* ---------- toy embedding ---------- */

export type Vec = Map<string, number>;

/** Lowercase, keep letters and digits, collapse spaces. */
export const normalise = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Counts of every three-character chunk of the padded text, scaled to length 1. */
export function embed(text: string): Vec {
  const padded = `  ${normalise(text)} `;
  const counts = new Map<string, number>();
  for (let i = 0; i + 3 <= padded.length; i++) {
    const g = padded.slice(i, i + 3);
    counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  let norm = 0;
  for (const v of counts.values()) norm += v * v;
  norm = Math.sqrt(norm);
  for (const [k, v] of counts) counts.set(k, v / norm);
  return counts;
}

export function cosine(a: Vec, b: Vec): number {
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [k, v] of small) {
    const w = big.get(k);
    if (w !== undefined) dot += v * w;
  }
  return dot;
}

/* ---------- simulation ---------- */

export type Prices = {
  /** Cost of one model call that answers a question (example). */
  llmCall: number;
  /** Cost of embedding a question and searching the cache (example). */
  lookup: number;
  /** Cost of one wrong answer reaching a user, for example the support follow-up it causes (example). */
  wrongAnswer: number;
};

/** Example prices in US dollars. Invented for the lesson; replace them with your own. */
export const EXAMPLE_PRICES: Prices = { llmCall: 0.01, lookup: 0.0001, wrongAnswer: 0.05 };

export type Step = {
  index: number;
  question: Question;
  outcome: 'miss' | 'hit-right' | 'hit-wrong';
  /** The most similar allowed cached question, if any. */
  matchText: string | null;
  similarity: number;
  /** The cached answer key that was served on a hit. */
  servedAnswer: string | null;
};

export type Result = {
  steps: Step[];
  total: number;
  hits: number;
  rightHits: number;
  wrongHits: number;
  misses: number;
  hitRate: number;
  /** Wrong hits as a share of hits. 0 when there are no hits. */
  wrongShareOfHits: number;
  /** Money saved by skipping model calls, minus the cost of every lookup. Wrong hits still skip the call. */
  grossSaving: number;
  /** Gross saving minus the assumed cost of the wrong answers. */
  netSaving: number;
};

const VECS = new Map<string, Vec>();
const vecOf = (t: string): Vec => {
  let v = VECS.get(t);
  if (!v) {
    v = embed(t);
    VECS.set(t, v);
  }
  return v;
};

/**
 * Run the stream. Each question is compared with every cached question (restricted to the same tenant when
 * `scopeByTenant` is true). If the best similarity reaches `threshold`, the cached answer is served; otherwise
 * the model is called and the new question and its correct answer are added to the cache.
 */
export function simulate(threshold: number, scopeByTenant: boolean, prices: Prices = EXAMPLE_PRICES, stream: Question[] = STREAM): Result {
  const cache: { q: Question; v: Vec }[] = [];
  const steps: Step[] = [];
  let rightHits = 0;
  let wrongHits = 0;
  let misses = 0;
  stream.forEach((q, index) => {
    const v = vecOf(q.text);
    let best: { q: Question; v: Vec } | null = null;
    let bestSim = -1;
    for (const e of cache) {
      if (scopeByTenant && e.q.tenant !== q.tenant) continue;
      const s = cosine(v, e.v);
      if (s > bestSim) {
        bestSim = s;
        best = e;
      }
    }
    if (best && bestSim >= threshold) {
      const right = best.q.answer === q.answer;
      if (right) rightHits++;
      else wrongHits++;
      steps.push({ index, question: q, outcome: right ? 'hit-right' : 'hit-wrong', matchText: best.q.text, similarity: bestSim, servedAnswer: best.q.answer });
    } else {
      misses++;
      cache.push({ q, v });
      steps.push({ index, question: q, outcome: 'miss', matchText: best ? best.q.text : null, similarity: Math.max(bestSim, 0), servedAnswer: null });
    }
  });
  const total = stream.length;
  const hits = rightHits + wrongHits;
  const grossSaving = hits * prices.llmCall - total * prices.lookup;
  return {
    steps,
    total,
    hits,
    rightHits,
    wrongHits,
    misses,
    hitRate: total ? hits / total : 0,
    wrongShareOfHits: hits ? wrongHits / hits : 0,
    grossSaving,
    netSaving: grossSaving - wrongHits * prices.wrongAnswer,
  };
}

/** Thresholds from 0.50 to 1.00 in steps of 0.05, for the sweep chart. */
export const SWEEP = Array.from({ length: 11 }, (_, i) => Math.round((0.5 + i * 0.05) * 100) / 100);

export function sweep(scopeByTenant: boolean, prices: Prices = EXAMPLE_PRICES) {
  return SWEEP.map((t) => ({ threshold: t, result: simulate(t, scopeByTenant, prices) }));
}

/* ---------- batch API arithmetic (example numbers) ---------- */

export type BatchInput = {
  /** Requests in the job. */
  requests: number;
  inputTokens: number;
  outputTokens: number;
  /** Price per million input tokens, standard. */
  inputPerM: number;
  /** Price per million output tokens, standard. */
  outputPerM: number;
  /** Batch discount as a fraction (0.5 means half price). */
  discount: number;
  /** Share of input tokens that are cache reads (0 to 1). */
  cachedShare: number;
  /** Cache read price as a fraction of the standard input price. */
  cacheReadFraction: number;
};

export function jobCost(b: BatchInput, batch: boolean): number {
  const d = batch ? 1 - b.discount : 1;
  const inCost = (b.requests * b.inputTokens * ((1 - b.cachedShare) + b.cachedShare * b.cacheReadFraction) * b.inputPerM) / 1e6;
  const outCost = (b.requests * b.outputTokens * b.outputPerM) / 1e6;
  return (inCost + outCost) * d;
}

/* ---------- daily economics of a cache (example numbers) ---------- */

export type CacheEconomics = {
  questionsPerDay: number;
  /** Cost of one model call (example). */
  callCost: number;
  /** Cost of one embed-and-search (example). */
  lookupCost: number;
  /** Share of questions answered from the cache (0 to 1). */
  hitRate: number;
  /** Share of those hits that serve a wrong answer (0 to 1). */
  wrongShare: number;
  /** Cost of one wrong answer reaching a user (example). */
  wrongCost: number;
};

export function cacheEconomics(e: CacheEconomics) {
  const hits = e.questionsPerDay * e.hitRate;
  const wrong = hits * e.wrongShare;
  const baseline = e.questionsPerDay * e.callCost;
  const lookups = e.questionsPerDay * e.lookupCost;
  const gross = hits * e.callCost - lookups;
  return { hits, wrong, baseline, lookups, gross, wrongTotal: wrong * e.wrongCost, net: gross - wrong * e.wrongCost };
}
