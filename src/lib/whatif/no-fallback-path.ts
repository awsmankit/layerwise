/**
 * What if there is no fallback when the model fails? A SCRIPTED example with 50 events from a seeded generator,
 * not a measurement of any product. Feature: voice commands on a small device. For every event the model returns an answer
 * with a confidence after some delay. It may be too slow (a timeout), unsure (low confidence), or confidently wrong.
 * A fallback is a tiny rule, a keyword match, that handles the simple commands, and otherwise asks the user to repeat.
 * Every figure on the page comes from these functions.
 */

export const EVENT_COUNT = 50;
/** Default time budget for the model, in milliseconds (example). */
export const DEFAULT_BUDGET_MS = 150;
/** Default confidence the model needs before its answer is trusted (example). */
export const DEFAULT_THRESHOLD = 0.6;

export const INTENTS = ['volume up', 'volume down', 'pause', 'answer call', 'next track'] as const;
export type Intent = (typeof INTENTS)[number];
/** The keyword rule only knows these three commands. */
export const RULE_INTENTS: readonly Intent[] = ['volume up', 'volume down', 'pause'];

export type Outcome = 'right' | 'wrong' | 'silence' | 'ask';
export type Cause = 'ok' | 'timeout' | 'low';

export type VoiceEvent = {
  id: number;
  /** what the user really asked for */
  intent: Intent;
  /** how long the model took, in ms */
  latencyMs: number;
  /** how sure the model is of its answer, 0 to 1 */
  confidence: number;
  /** whether the model's answer is the right command */
  modelRight: boolean;
  /** whether the keyword rule can recognise this phrase */
  ruleCan: boolean;
};

/** Small seeded generator (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r2 = (v: number) => Math.round(v * 100) / 100;

let cache: VoiceEvent[] | null = null;

/** The fixed 50-event script. Most events are easy; some are slow, some unsure, some wrong. */
export function events(): VoiceEvent[] {
  if (cache) return cache;
  const r = rng(2026);
  cache = Array.from({ length: EVENT_COUNT }, (_, id) => {
    const intent = INTENTS[Math.floor(r() * INTENTS.length)];
    const latencyMs = r() < 0.16 ? Math.round(180 + r() * 240) : Math.round(40 + r() * 80);
    const confidence = r() < 0.8 ? r2(0.72 + r() * 0.27) : r2(0.25 + r() * 0.35);
    // the model's confidence is honest here: it is right with probability equal to its confidence
    const modelRight = r() < confidence;
    const ruleCan = RULE_INTENTS.includes(intent) && r() < 0.9;
    return { id, intent, latencyMs, confidence, modelRight, ruleCan };
  });
  return cache;
}

/** Why the model's answer cannot be taken at face value: too slow, or too unsure. Timeout wins when both apply. */
export function cause(e: VoiceEvent, budgetMs: number, threshold: number): Cause {
  if (e.latencyMs > budgetMs) return 'timeout';
  if (e.confidence < threshold) return 'low';
  return 'ok';
}

/** No fallback: whatever the model says is done, and a model that is too slow does nothing. Confidence is ignored. */
export function outcomeWithout(e: VoiceEvent, budgetMs: number): Outcome {
  if (e.latencyMs > budgetMs) return 'silence';
  return e.modelRight ? 'right' : 'wrong';
}

/** With a fallback: when the model is slow or unsure, the keyword rule answers; if it cannot, the device asks the user to repeat. */
export function outcomeWith(e: VoiceEvent, budgetMs: number, threshold: number): Outcome {
  if (cause(e, budgetMs, threshold) !== 'ok') return e.ruleCan ? 'right' : 'ask';
  return e.modelRight ? 'right' : 'wrong';
}

export type Tally = Record<Outcome, number>;

export function tally(outcomes: Outcome[]): Tally {
  const t: Tally = { right: 0, wrong: 0, silence: 0, ask: 0 };
  outcomes.forEach((o) => t[o]++);
  return t;
}

export type Run = {
  without: Outcome[];
  withFallback: Outcome[];
  causes: Cause[];
  tallyWithout: Tally;
  tallyWith: Tally;
};

export function run(budgetMs: number, threshold: number, count = EVENT_COUNT): Run {
  const list = events().slice(0, count);
  const without = list.map((e) => outcomeWithout(e, budgetMs));
  const withFallback = list.map((e) => outcomeWith(e, budgetMs, threshold));
  return {
    without,
    withFallback,
    causes: list.map((e) => cause(e, budgetMs, threshold)),
    tallyWithout: tally(without),
    tallyWith: tally(withFallback),
  };
}

/** What each outcome means for the user, in plain words. */
export const OUTCOME_TEXT: Record<Outcome, string> = {
  right: 'did the right thing',
  wrong: 'did the wrong thing',
  silence: 'did nothing at all',
  ask: 'asked the user to repeat',
};
