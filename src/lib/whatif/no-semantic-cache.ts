/**
 * What if every repeated question goes to the model again?
 *
 * A deterministic toy: a stream of 60 customer questions that repeat and rephrase each other. Three set-ups read it
 * in order: no cache, an exact-match cache (same text only) and a similarity cache (a stored answer is reused when the
 * new question is similar enough to an earlier one). Similarity here is word overlap (Jaccard) after dropping filler
 * words. That is a crude stand-in for the closeness of two embeddings, which also catch synonyms; the point is the
 * shape of the trade-off, not a benchmark. Prices and times are EXAMPLES, labelled on screen.
 */

export type Question = { text: string; /** What the right answer is about: two questions with the same key want the same answer. */ key: string };

/** Toy question bank: [answer key, phrasings]. Keys that look alike (cancel vs track, Paris vs Tokyo) are the traps. */
const BANK: [string, string[]][] = [
  ['reset-password', ['How do I reset my password?', 'How can I reset my password?', 'I forgot my password, how do I reset it?', 'Reset my password please', 'I need to reset my password', 'Password reset, how?']],
  ['change-password', ['How do I change my password?', 'Can I change my password in settings?', 'I need to change my password']],
  ['cancel-order', ['How do I cancel my order?', 'Cancel my order please', 'Can I cancel an order I just placed?', 'I need to cancel my order', 'How can I cancel the order?']],
  ['track-order', ['How do I track my order?', 'Where is my order?', 'Track my order please', 'How can I track the order?', 'I need to track my order']],
  ['refund-how', ['How do I get a refund?', 'Can I get a refund for my order?', 'I want a refund', 'How can I get my refund?', 'I need a refund for my order']],
  ['refund-time', ['How long does a refund take?', 'How long until my refund arrives?', 'When will my refund arrive?']],
  ['hours', ['What are your opening hours?', 'When are you open?', 'What time do you open?', 'Your opening hours please', 'What are the opening hours?']],
  ['hours-sunday', ['What are your opening hours on Sunday?', 'Are you open on Sunday?', 'Sunday opening hours please']],
  ['weather-paris', ['What is the weather in Paris today?', 'Weather in Paris today?', 'Is it raining in Paris today?', 'How is the weather in Paris?']],
  ['weather-tokyo', ['What is the weather in Tokyo today?', 'Weather in Tokyo today?', 'Is it raining in Tokyo today?', 'How is the weather in Tokyo?']],
  ['shipping-cost', ['How much does shipping cost?', 'What is the shipping cost?', 'How much is delivery?', 'How much is shipping?', 'What does delivery cost?']],
];

export const questions: Question[] = BANK.flatMap(([key, texts]) => texts.map((text) => ({ text, key })));

/** Seeded generator so the stream is the same on the server and in the browser. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const STREAM_LENGTH = 60;
export const SEED = 7;

/** Each question is drawn from the whole bank with equal chance, so some come back word for word and many come back rephrased. */
export function makeStream(length = STREAM_LENGTH, seed = SEED): Question[] {
  const rnd = mulberry32(seed);
  const weights = questions.map(() => 1);
  const total = weights.reduce((a, b) => a + b, 0);
  const out: Question[] = [];
  for (let n = 0; n < length; n++) {
    let r = rnd() * total;
    let pick = 0;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r < 0) {
        pick = i;
        break;
      }
    }
    out.push(questions[pick]);
  }
  return out;
}

export const stream: Question[] = makeStream();

const FILLER = new Set(['how', 'do', 'i', 'my', 'the', 'a', 'an', 'to', 'can', 'what', 'is', 'of', 'in', 'for', 'please', 'me', 'you', 'does', 'it', 'are', 'on', 'your', 'when', 'until', 'just', 'want', 'get', 'long']);

/** Lower-case words with filler removed. */
export function words(text: string): string[] {
  return (text.toLowerCase().match(/[a-z]+/g) ?? []).filter((w) => !FILLER.has(w));
}

/** Word-overlap similarity between two questions, 0 to 1 (Jaccard: shared words over all words). */
export function similarity(a: string, b: string): number {
  const A = new Set(words(a));
  const B = new Set(words(b));
  if (A.size === 0 && B.size === 0) return 1;
  let shared = 0;
  A.forEach((w) => {
    if (B.has(w)) shared++;
  });
  return shared / (A.size + B.size - shared);
}

export type Kind = 'none' | 'exact' | 'similar';
export type Outcome = 'model' | 'hit' | 'wrong';

export type Step = {
  asked: string;
  outcome: Outcome;
  /** For a hit or wrong hit: the earlier question whose stored answer was reused. */
  from: string | null;
  sim: number;
};

export const example = {
  /** Example tokens per model call. */
  inputTokens: 400,
  outputTokens: 250,
  /** Example prices in dollars per million tokens. */
  inPrice: 3,
  outPrice: 15,
  /** Example time for a model call and for a cache lookup, milliseconds. */
  modelMs: 2000,
  lookupMs: 30,
};

export type Example = typeof example;

/** Dollars for one model call at the example prices. */
export const callCost = (e: Example = example) => (e.inputTokens * e.inPrice + e.outputTokens * e.outPrice) / 1e6;

/** Run a stream through a cache. A miss calls the model and stores the question; a hit returns the stored answer. */
export function run(kind: Kind, threshold: number, qs: Question[] = stream): Step[] {
  const stored: Question[] = [];
  return qs.map((q) => {
    if (kind === 'none') return { asked: q.text, outcome: 'model' as Outcome, from: null, sim: 0 };
    let best: Question | null = null;
    let bestSim = -1;
    for (const s of stored) {
      const sim = kind === 'exact' ? (s.text === q.text ? 1 : 0) : similarity(s.text, q.text);
      if (sim > bestSim) {
        best = s;
        bestSim = sim;
      }
    }
    const hit = best !== null && (kind === 'exact' ? bestSim === 1 : bestSim >= threshold);
    if (hit && best) return { asked: q.text, outcome: (best.key === q.key ? 'hit' : 'wrong') as Outcome, from: best.text, sim: bestSim };
    stored.push(q);
    return { asked: q.text, outcome: 'model' as Outcome, from: null, sim: Math.max(0, bestSim) };
  });
}

export type Summary = {
  total: number;
  modelCalls: number;
  hits: number;
  wrong: number;
  /** Share of all questions answered from the cache, right or wrong. */
  hitRate: number;
  /** Share of all questions answered with the wrong stored answer. */
  wrongRate: number;
  cost: number;
  costSaved: number;
  /** Average wait per question in milliseconds. */
  avgMs: number;
  msSaved: number;
};

export function summarise(kind: Kind, steps: Step[], e: Example = example): Summary {
  const total = steps.length;
  const hits = steps.filter((s) => s.outcome === 'hit').length;
  const wrong = steps.filter((s) => s.outcome === 'wrong').length;
  const modelCalls = total - hits - wrong;
  const lookup = kind === 'none' ? 0 : e.lookupMs;
  const totalMs = modelCalls * (e.modelMs + lookup) + (hits + wrong) * lookup;
  const baseMs = total * e.modelMs;
  return {
    total,
    modelCalls,
    hits,
    wrong,
    hitRate: total ? (hits + wrong) / total : 0,
    wrongRate: total ? wrong / total : 0,
    cost: modelCalls * callCost(e),
    costSaved: (total - modelCalls) * callCost(e),
    avgMs: total ? totalMs / total : 0,
    msSaved: total ? (baseMs - totalMs) / total : 0,
  };
}

/** Thresholds offered on the slider. */
export const thresholds = [0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1];

export type SweepPoint = { threshold: number; hitRate: number; wrongRate: number; wrong: number };

/** The similarity cache at every threshold on the slider. */
export function sweep(qs: Question[] = stream): SweepPoint[] {
  return thresholds.map((t) => {
    const s = summarise('similar', run('similar', t, qs));
    return { threshold: t, hitRate: s.hitRate, wrongRate: s.wrongRate, wrong: s.wrong };
  });
}

/** The first wrong hit, as a plain sentence pair, or null. */
export function firstWrong(steps: Step[]): Step | null {
  return steps.find((s) => s.outcome === 'wrong') ?? null;
}
