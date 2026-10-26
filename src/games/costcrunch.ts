/**
 * Cost Crunch: cut an AI feature's bill to a target without letting quality
 * fall below a floor, in a limited number of moves.
 *
 * Costs come from the same token arithmetic as the calculator. Quality effects
 * are illustrative: they are set so that cheap-looking moves carry realistic
 * risks, and so that measuring first (evals) changes how risky they are.
 */
import { costPerRequest, monthlyCost } from '../lib/cost';

export type LeverId =
  | 'evals'
  | 'trimPrompt'
  | 'fewerChunks'
  | 'capOutput'
  | 'promptCache'
  | 'route'
  | 'smallModel'
  | 'batch'
  | 'responseCache';

export type Lever = {
  id: LeverId;
  label: string;
  blurb: string;
  lesson: { label: string; href: string };
};

export const levers: Lever[] = [
  { id: 'evals', label: 'Build an eval suite', blurb: 'Does nothing to the bill, but lets you check every other change.', lesson: { label: 'Evals 101', href: '/learn/evals/evals-101/' } },
  { id: 'trimPrompt', label: 'Trim the system prompt by 40%', blurb: 'Fewer instruction tokens on every call.', lesson: { label: 'Prompting and structured output', href: '/learn/llm/prompting-and-structured-output/' } },
  { id: 'fewerChunks', label: 'Retrieve half as many passages', blurb: 'Smaller context, at the risk of missing the right passage.', lesson: { label: 'Chunking and retrieval quality', href: '/learn/rag-agents/chunking-and-retrieval-quality/' } },
  { id: 'capOutput', label: 'Cap answer length by 30%', blurb: 'Output tokens cost the most per token.', lesson: { label: 'Where the tokens go', href: '/learn/cost/where-the-tokens-go/' } },
  { id: 'promptCache', label: 'Turn on prompt caching', blurb: 'Discounted input for the stable start of the prompt.', lesson: { label: 'Context window and caching', href: '/learn/llm/context-window-and-caching/' } },
  { id: 'route', label: 'Route 60% of traffic to a small model', blurb: 'Easy requests go to the cheap model, the rest stay put.', lesson: { label: 'Model routing and fallbacks', href: '/learn/systems/model-routing-and-fallbacks/' } },
  { id: 'smallModel', label: 'Move all traffic to the small model', blurb: 'The biggest single price cut, and the biggest quality risk.', lesson: { label: 'Cost levers', href: '/learn/cost/cost-levers/' } },
  { id: 'batch', label: 'Move background work to batch', blurb: 'Batch calls are cheaper but arrive later.', lesson: { label: 'Cost levers', href: '/learn/cost/cost-levers/' } },
  { id: 'responseCache', label: 'Cache answers to repeated questions', blurb: 'Skip the model entirely for repeats.', lesson: { label: 'Cost levers', href: '/learn/cost/cost-levers/' } },
];

export type CrunchScenario = {
  id: string;
  level: 1 | 2 | 3;
  title: string;
  brief: string;
  reqPerDay: number;
  systemTok: number;
  chunkTok: number;
  questionTok: number;
  outTok: number;
  model: { pIn: number; pOut: number; name: string };
  asyncShare: number;
  repeatRate: number;
  retrievalStrong: boolean;
  baselineQuality: number;
  qualityFloor: number;
  /** Target monthly cost in dollars. */
  target: number;
  /** Total moves you may use. */
  moves: number;
  /** Moves for a two-star result. */
  par: number;
};

export const SMALL = { pIn: 0.25, pOut: 1.25 };
export const MIN_CACHEABLE_TOK = 1024;
const ROUTE_SHARE = 0.6;
const CACHE_DISC = 0.9;
const BATCH_DISC = 0.5;
const RESPONSE_HIT_FACTOR = 0.8;

export const crunchScenarios: CrunchScenario[] = [
  {
    id: 'chatbot',
    level: 1,
    title: 'The chatbot bill',
    brief: 'A customer chatbot with a long, careful system prompt now handles 10,000 conversations a day on a mid-tier model. Finance wants the bill cut in half. Quality must stay in the high 80s.',
    reqPerDay: 10_000,
    systemTok: 1800,
    chunkTok: 0,
    questionTok: 60,
    outTok: 400,
    model: { pIn: 3, pOut: 15, name: 'mid-tier' },
    asyncShare: 0,
    repeatRate: 0.2,
    retrievalStrong: true,
    baselineQuality: 90,
    qualityFloor: 85,
    target: 1740,
    moves: 5,
    par: 3,
  },
  {
    id: 'rag-bill',
    level: 2,
    title: 'The retrieval assistant',
    brief: 'A knowledge assistant retrieves eight long passages for every question and runs 50,000 times a day. A quarter of the traffic is background summarising that nobody is waiting on. The retrieval is mediocre, so cutting passages is risky. Target: 60% off.',
    reqPerDay: 50_000,
    systemTok: 1200,
    chunkTok: 4000,
    questionTok: 80,
    outTok: 500,
    model: { pIn: 3, pOut: 15, name: 'mid-tier' },
    asyncShare: 0.25,
    repeatRate: 0.25,
    retrievalStrong: false,
    baselineQuality: 88,
    qualityFloor: 82,
    target: 14000,
    moves: 6,
    par: 5,
  },
  {
    id: 'agent-bill',
    level: 3,
    title: 'The agent platform',
    brief: 'An agent platform runs 20,000 multi-step tasks a day on a large model, with big tool definitions and long tool outputs in every call. The quality floor is tight, so every point of quality is spoken for. Target: 65% off.',
    reqPerDay: 20_000,
    systemTok: 3000,
    chunkTok: 6000,
    questionTok: 100,
    outTok: 800,
    model: { pIn: 15, pOut: 75, name: 'large' },
    asyncShare: 0.4,
    repeatRate: 0.1,
    retrievalStrong: true,
    baselineQuality: 92,
    qualityFloor: 88,
    target: 41000,
    moves: 5,
    par: 4,
  },
];

export type Outcome = {
  monthly: number;
  perRequest: number;
  quality: number;
  /** Why a chosen lever did little or nothing here, if so. */
  warnings: Partial<Record<LeverId, string>>;
  win: boolean;
  stars: 0 | 1 | 2 | 3;
  movesUsed: number;
};

export function baselineOutcome(s: CrunchScenario) {
  return evaluate(s, []);
}

export function evaluate(s: CrunchScenario, applied: LeverId[]): Outcome {
  const has = (id: LeverId) => applied.includes(id);
  const evals = has('evals');
  const pen = (without: number, withEvals: number) => (evals ? withEvals : without);
  const warnings: Partial<Record<LeverId, string>> = {};

  let sys = s.systemTok;
  let chunks = s.chunkTok;
  let out = s.outTok;
  let pIn = s.model.pIn;
  let pOut = s.model.pOut;
  let q = s.baselineQuality;

  if (has('trimPrompt')) {
    sys *= 0.6;
    q -= pen(1, 0.5);
  }
  if (has('fewerChunks')) {
    if (chunks === 0) {
      warnings.fewerChunks = 'This system has no retrieved passages to cut.';
    } else {
      chunks *= 0.5;
      q -= s.retrievalStrong ? pen(2, 1) : pen(6, 3);
    }
  }
  if (has('capOutput')) {
    out *= 0.7;
    q -= pen(2, 1);
  }
  if (has('smallModel')) {
    pIn = SMALL.pIn;
    pOut = SMALL.pOut;
    q -= 14;
    if (has('route')) warnings.route = 'All traffic is already on the small model.';
  } else if (has('route')) {
    pIn = (1 - ROUTE_SHARE) * pIn + ROUTE_SHARE * SMALL.pIn;
    pOut = (1 - ROUTE_SHARE) * pOut + ROUTE_SHARE * SMALL.pOut;
    q -= evals ? 4 : 9;
  }

  const inTok = sys + chunks + s.questionTok;

  let cacheShare = 0;
  if (has('promptCache')) {
    if (sys >= MIN_CACHEABLE_TOK) cacheShare = sys / inTok;
    else warnings.promptCache = `The stable prefix is down to about ${Math.round(sys)} tokens, below the roughly ${MIN_CACHEABLE_TOK.toLocaleString('en-US')} most platforms will cache.`;
  }

  let batchShare = 0;
  if (has('batch')) {
    if (s.asyncShare > 0) batchShare = s.asyncShare;
    else warnings.batch = 'Nothing here is asynchronous: every request has a user waiting.';
  }

  let responseHit = 0;
  if (has('responseCache')) {
    responseHit = s.repeatRate * RESPONSE_HIT_FACTOR;
    q -= 1;
  }

  const cost = costPerRequest({ inTok, outTok: out, pIn, pOut, cacheShare, cacheDisc: CACHE_DISC, batchShare, batchDisc: BATCH_DISC });
  const monthly = monthlyCost(cost.total, s.reqPerDay) * (1 - responseHit);
  const quality = Math.round(q * 10) / 10;

  const movesUsed = applied.length;
  const win = monthly <= s.target && quality >= s.qualityFloor;
  let stars: 0 | 1 | 2 | 3 = 0;
  if (win) {
    stars = 1;
    if (movesUsed <= s.par) stars = 2;
    if (stars === 2 && monthly <= s.target * 0.9) stars = 3;
  }

  return { monthly, perRequest: cost.total, quality, warnings, win, stars, movesUsed };
}

/** What one applied lever contributes in the context of the others. */
export function marginal(s: CrunchScenario, applied: LeverId[], id: LeverId) {
  const withIt = evaluate(s, applied);
  const without = evaluate(s, applied.filter((x) => x !== id));
  return { saved: without.monthly - withIt.monthly, quality: withIt.quality - without.quality };
}

/** Every subset of levers, evaluated. 2^9 = 512 combinations. */
export function allOutcomes(s: CrunchScenario) {
  const out: { applied: LeverId[]; outcome: Outcome }[] = [];
  for (let mask = 0; mask < 1 << levers.length; mask++) {
    const applied = levers.filter((_, i) => mask & (1 << i)).map((l) => l.id);
    if (applied.length > s.moves) continue;
    out.push({ applied, outcome: evaluate(s, applied) });
  }
  return out;
}
