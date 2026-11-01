/*
 * Oversight simulator: an AI recommends, a person reviews some of the recommendations, and some of the
 * AI's recommendations are wrong. Every parameter here is ILLUSTRATIVE. None of them is measured from a
 * real system, and the numbers it produces are example numbers. The shape of the model follows what the
 * studies cited in the lesson report in general terms (more alerts per encounter lowers acceptance of
 * alerts; people follow wrong suggestions; making people commit first reduces over-reliance), not their
 * values.
 */

export type Tier = 'low' | 'medium' | 'high';
export const TIERS: Tier[] = ['low', 'medium', 'high'];

/** Share of items the AI labels with each confidence tier (illustrative). */
export const TIER_SHARE: Record<Tier, number> = { low: 0.2, medium: 0.5, high: 0.3 };

/**
 * How much more likely an error is in each tier, relative to the medium tier (illustrative). A usable
 * confidence score is one where errors cluster in the low tier. The weighted mean of these is 1.375, so
 * the tier rates below are scaled to keep the overall error rate the learner chose.
 */
export const TIER_RISK: Record<Tier, number> = { low: 4, medium: 1, high: 0.25 };

/** Chance an attentive, unbiased reviewer notices an error they look at (illustrative). */
export const BASE_CATCH = 0.9;
/** Items a reviewer can look at in one session before attention starts to fade (illustrative). */
export const COMFORTABLE_ITEMS = 40;
/** Attention left at four times the comfortable load or more (illustrative). */
export const ATTENTION_FLOOR = 0.4;
/** Minutes spent on one reviewed item (illustrative). */
export const MINUTES_PER_ITEM = 1.5;
/** Making the reviewer commit to their own answer first cuts the pull of the AI's suggestion by this factor (illustrative). */
export const FORCING_FACTOR = 0.5;

export type PolicyKind = 'all' | 'low' | 'lowmed' | 'sample';

export interface Policy {
  kind: PolicyKind;
  /** Only used by 'sample': the fraction of items picked at random, 0 to 1. */
  fraction?: number;
}

export interface Params {
  /** Number of AI recommendations in the batch. */
  n: number;
  /** Overall share of recommendations that are wrong, 0 to 1. */
  errorRate: number;
  /** How much the AI's suggestion lowers the chance of noticing an error, 0 to 1. */
  bias: number;
  /** True when the reviewer decides before seeing the suggestion. */
  forcing: boolean;
  policy: Policy;
}

export interface Outcome {
  /** Items the person looked at. */
  reviewed: number;
  /** Wrong recommendations in the batch. */
  errors: number;
  /** Wrong recommendations the person looked at and caught. */
  caught: number;
  /** Wrong recommendations the person looked at and missed. */
  missedReviewed: number;
  /** Wrong recommendations nobody looked at. */
  missedUnreviewed: number;
  /** Chance that a reviewed error is noticed, after bias and fatigue. */
  catchProb: number;
  /** Hours of review work. */
  hours: number;
}

export interface Item {
  tier: Tier;
  wrong: boolean;
  reviewed: boolean;
  /** Only meaningful when wrong and reviewed. */
  caught: boolean;
}

/** Error rate inside each tier so that the overall rate is `overall`. Capped at 1. */
export function tierErrorRates(overall: number): Record<Tier, number> {
  const norm = TIERS.reduce((s, t) => s + TIER_SHARE[t] * TIER_RISK[t], 0);
  const base = overall / norm;
  const out = {} as Record<Tier, number>;
  for (const t of TIERS) out[t] = Math.min(1, base * TIER_RISK[t]);
  return out;
}

/** Share of the tier's items the policy sends to the reviewer, 0 to 1. */
export function reviewShare(policy: Policy, tier: Tier): number {
  switch (policy.kind) {
    case 'all':
      return 1;
    case 'low':
      return tier === 'low' ? 1 : 0;
    case 'lowmed':
      return tier === 'high' ? 0 : 1;
    case 'sample':
      return Math.min(1, Math.max(0, policy.fraction ?? 0));
  }
}

/** Attention left after reviewing `count` items in one session: 1 up to the comfortable load, then falling to the floor at four times it. */
export function attention(count: number): number {
  if (count <= COMFORTABLE_ITEMS) return 1;
  const t = Math.min(1, (count - COMFORTABLE_ITEMS) / (3 * COMFORTABLE_ITEMS));
  return 1 - (1 - ATTENTION_FLOOR) * t;
}

/** Bias after the effect of making the reviewer commit first. */
export function effectiveBias(bias: number, forcing: boolean): number {
  return forcing ? bias * FORCING_FACTOR : bias;
}

/** Chance a reviewed error is noticed, for a reviewer who looks at `reviewedCount` items. */
export function catchProbability(bias: number, forcing: boolean, reviewedCount: number): number {
  return BASE_CATCH * (1 - effectiveBias(bias, forcing)) * attention(reviewedCount);
}

/** Average outcome over many batches (no randomness). */
export function expected(p: Params): Outcome {
  const rates = tierErrorRates(p.errorRate);
  let reviewed = 0;
  let errors = 0;
  let errorsReviewed = 0;
  for (const t of TIERS) {
    const items = p.n * TIER_SHARE[t];
    const share = reviewShare(p.policy, t);
    reviewed += items * share;
    errors += items * rates[t];
    errorsReviewed += items * rates[t] * share;
  }
  const catchProb = catchProbability(p.bias, p.forcing, reviewed);
  const caught = errorsReviewed * catchProb;
  return {
    reviewed,
    errors,
    caught,
    missedReviewed: errorsReviewed - caught,
    missedUnreviewed: errors - errorsReviewed,
    catchProb,
    hours: (reviewed * MINUTES_PER_ITEM) / 60,
  };
}

/** Small seeded random number generator (mulberry32), so a batch is repeatable. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One concrete batch: which items are wrong, which the policy sends to a person, and which errors the person catches. */
export function simulate(p: Params, seed: number): { items: Item[]; outcome: Outcome } {
  const rng = makeRng(seed);
  const rates = tierErrorRates(p.errorRate);
  const items: Item[] = [];
  for (let i = 0; i < p.n; i++) {
    const r = rng();
    const tier: Tier = r < TIER_SHARE.low ? 'low' : r < TIER_SHARE.low + TIER_SHARE.medium ? 'medium' : 'high';
    const wrong = rng() < rates[tier];
    const reviewed = rng() < reviewShare(p.policy, tier);
    items.push({ tier, wrong, reviewed, caught: false });
  }
  const reviewedCount = items.filter((it) => it.reviewed).length;
  const catchProb = catchProbability(p.bias, p.forcing, reviewedCount);
  let errors = 0;
  let caught = 0;
  let missedReviewed = 0;
  let missedUnreviewed = 0;
  for (const it of items) {
    if (!it.wrong) continue;
    errors++;
    if (!it.reviewed) {
      missedUnreviewed++;
    } else if (rng() < catchProb) {
      it.caught = true;
      caught++;
    } else {
      missedReviewed++;
    }
  }
  return {
    items,
    outcome: {
      reviewed: reviewedCount,
      errors,
      caught,
      missedReviewed,
      missedUnreviewed,
      catchProb,
      hours: (reviewedCount * MINUTES_PER_ITEM) / 60,
    },
  };
}

export const POLICY_LABELS: Record<PolicyKind, string> = {
  all: 'Review everything',
  low: 'Review only low-confidence items',
  lowmed: 'Review low and medium confidence',
  sample: 'Review a random sample',
};

/** Share of the errors that get through to the real world uncorrected. */
export function missedShare(o: Outcome): number {
  return o.errors === 0 ? 0 : (o.missedReviewed + o.missedUnreviewed) / o.errors;
}
