/**
 * Blueprint: pick six design decisions for an AI feature and see whether the
 * resulting system meets the brief.
 *
 * This is a deliberately simplified model. Every number is an illustrative
 * order of magnitude, chosen so the trade-offs point the way they do in real
 * systems. It is a thinking tool, not a capacity-planning tool.
 */
import { costPerRequest, monthlyCost } from '../lib/cost';

export type Slot = 'knowledge' | 'model' | 'caching' | 'safety' | 'reliability' | 'observability';
export const slots: Slot[] = ['knowledge', 'model', 'caching', 'safety', 'reliability', 'observability'];
export type Choice = Record<Slot, string>;

export type Option = { id: string; label: string; blurb: string; complexity: number };

export const slotInfo: Record<Slot, { title: string; question: string; options: Option[] }> = {
  knowledge: {
    title: 'Knowledge',
    question: 'How does the model get the facts it needs?',
    options: [
      { id: 'prompt', label: 'Put it all in the prompt', blurb: 'Send the full knowledge text with every request.', complexity: 0 },
      { id: 'rag', label: 'Retrieval (vector search)', blurb: 'Fetch the few relevant passages per question.', complexity: 2 },
      { id: 'hybrid', label: 'Hybrid search + reranker', blurb: 'Vector and keyword search, then rerank the candidates.', complexity: 3 },
      { id: 'finetune', label: 'Fine-tune only', blurb: 'Train the knowledge into the model; send nothing extra.', complexity: 3 },
    ],
  },
  model: {
    title: 'Model',
    question: 'Which model answers?',
    options: [
      { id: 'small', label: 'Small model', blurb: 'Cheapest and fastest, least capable.', complexity: 0 },
      { id: 'mid', label: 'Mid-tier model', blurb: 'A balanced default.', complexity: 0 },
      { id: 'large', label: 'Large model', blurb: 'Most capable, slowest, priciest.', complexity: 0 },
      { id: 'router', label: 'Router: small first, mid for hard ones', blurb: 'Send 70% to the small model and 30% to mid-tier.', complexity: 2 },
    ],
  },
  caching: {
    title: 'Caching',
    question: 'What do you avoid recomputing?',
    options: [
      { id: 'none', label: 'No caching', blurb: 'Every request pays in full.', complexity: 0 },
      { id: 'prompt', label: 'Prompt caching', blurb: 'Reuse the processed stable prefix of the prompt.', complexity: 0 },
      { id: 'both', label: 'Prompt and response caching', blurb: 'Also return stored answers to repeated questions.', complexity: 1 },
    ],
  },
  safety: {
    title: 'Safety and access',
    question: 'What protects people and data?',
    options: [
      { id: 'none', label: 'Nothing extra', blurb: 'Rely on the model behaving.', complexity: 0 },
      { id: 'guard', label: 'Guardrails on input and output', blurb: 'Filter sensitive data and disallowed content.', complexity: 1 },
      { id: 'guard-access', label: 'Guardrails and per-user access filters', blurb: 'Also filter what each user may retrieve, and scope caches per user.', complexity: 2 },
    ],
  },
  reliability: {
    title: 'Reliability',
    question: 'What happens when the model call fails?',
    options: [
      { id: 'single', label: 'One endpoint, hope for the best', blurb: 'Errors go straight to the user.', complexity: 0 },
      { id: 'retry', label: 'Timeouts and retries with backoff', blurb: 'Absorb brief throttling and blips.', complexity: 1 },
      { id: 'fallback', label: 'Retries plus fallback model and circuit breaker', blurb: 'Switch to a second model when the first is unhealthy.', complexity: 2 },
    ],
  },
  observability: {
    title: 'Observability and evals',
    question: 'How will you know it works?',
    options: [
      { id: 'none', label: 'Nothing', blurb: 'Find out from users.', complexity: 0 },
      { id: 'logs', label: 'Request logging', blurb: 'Store inputs, outputs, tokens and latency.', complexity: 1 },
      { id: 'tracing', label: 'Tracing plus an eval suite in CI', blurb: 'Step-level traces and automatic regression checks.', complexity: 2 },
    ],
  },
};

export type Scenario = {
  id: string;
  level: 1 | 2 | 3;
  title: string;
  brief: string;
  reqPerDay: number;
  questionTok: number;
  answerTok: number;
  /** Size of the knowledge the assistant must draw on, in tokens. */
  knowledgeTok: number;
  changesOften: boolean;
  /** Share of requests that repeat an earlier question. */
  repeatRate: number;
  /** Multiplier for fixed infrastructure costs, which grow with scale. */
  infraX: number;
  needs: {
    budget: number;
    ttftMs: number;
    minQuality: number;
    availability: number;
    citations: boolean;
    perUserAccess: boolean;
    sensitiveData: boolean;
    maxComplexity: number;
  };
};

export const scenarios: Scenario[] = [
  {
    id: 'shop',
    level: 1,
    title: 'Corner-shop FAQ bot',
    brief:
      'A small shop wants a chat widget that answers questions about opening hours, returns and products. One developer will build and maintain it. The whole FAQ and policy text is about the length of a short booklet.',
    reqPerDay: 400,
    questionTok: 40,
    answerTok: 150,
    knowledgeTok: 6000,
    changesOften: false,
    repeatRate: 0.3,
    infraX: 1,
    needs: { budget: 60, ttftMs: 2500, minQuality: 70, availability: 99, citations: false, perUserAccess: false, sensitiveData: false, maxComplexity: 4 },
  },
  {
    id: 'hr',
    level: 2,
    title: 'Internal HR assistant',
    brief:
      'Employees ask about policies, benefits and pay bands. The policy library is huge, changes monthly, and some documents are visible only to certain roles. Answers must cite the policy they came from. A small platform team will run it.',
    reqPerDay: 5000,
    questionTok: 60,
    answerTok: 300,
    knowledgeTok: 2_000_000,
    changesOften: true,
    repeatRate: 0.2,
    infraX: 4,
    needs: { budget: 3000, ttftMs: 3000, minQuality: 75, availability: 99.5, citations: true, perUserAccess: true, sensitiveData: true, maxComplexity: 8 },
  },
  {
    id: 'support',
    level: 3,
    title: 'Support copilot at scale',
    brief:
      'A large retailer puts an assistant in front of 200,000 support questions a day. Answers draw on a changing knowledge base and must respect each customer’s data. Agents are waiting on it, so latency and availability matter, and finance has set a hard budget.',
    reqPerDay: 200_000,
    questionTok: 120,
    answerTok: 250,
    knowledgeTok: 500_000,
    changesOften: true,
    repeatRate: 0.35,
    infraX: 20,
    needs: { budget: 30000, ttftMs: 1800, minQuality: 76, availability: 99.9, citations: true, perUserAccess: true, sensitiveData: true, maxComplexity: 11 },
  },
];

/* ---------- the model of the world ---------- */

const SYSTEM_TOK = 500;
const RAG_CONTEXT_TOK = 2000;
const CONTEXT_WINDOW_TOK = 120_000;
const CACHE_DISC = 0.9;
const CACHED_PREFILL_FACTOR = 0.1;

const MODELS = {
  small: { pIn: 0.25, pOut: 1.25, quality: 62, baseMs: 250, prefill: 20000 },
  mid: { pIn: 3, pOut: 15, quality: 78, baseMs: 400, prefill: 8000 },
  large: { pIn: 15, pOut: 75, quality: 88, baseMs: 600, prefill: 4000 },
} as const;

const ROUTER_SMALL_SHARE = 0.7;

export type Check = {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
  hint: string;
  lesson?: { label: string; href: string };
};

export type Result = {
  inputTok: number;
  perRequest: number;
  monthly: number;
  ttftMs: number;
  quality: number;
  availability: number;
  complexity: number;
  checks: Check[];
  passed: number;
  total: number;
  allPass: boolean;
  score: number;
  /** A line per decision explaining what it did to the numbers. */
  notes: string[];
};

const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

export function evaluate(s: Scenario, c: Choice): Result {
  const notes: string[] = [];
  const small = s.knowledgeTok <= 8000;
  const large = s.knowledgeTok > 30000;

  /* knowledge */
  const ctxTok = c.knowledge === 'prompt' ? s.knowledgeTok : c.knowledge === 'finetune' ? 0 : RAG_CONTEXT_TOK;
  const retrievalMs = c.knowledge === 'rag' ? 120 : c.knowledge === 'hybrid' ? 370 : 0;
  const infraBase = { prompt: 0, rag: 80, hybrid: 200, finetune: 600 }[c.knowledge as 'prompt'] ?? 0;
  let q = 0;
  if (c.knowledge === 'prompt') q = small ? 8 : large ? -25 : 2;
  if (c.knowledge === 'rag') q = 4;
  if (c.knowledge === 'hybrid') q = 7;
  if (c.knowledge === 'finetune') q = s.changesOften ? -25 : -10;

  /* model */
  const router = c.model === 'router';
  const m = router ? MODELS.mid : MODELS[c.model as 'small'];
  const pIn = router ? ROUTER_SMALL_SHARE * MODELS.small.pIn + (1 - ROUTER_SMALL_SHARE) * MODELS.mid.pIn : m.pIn;
  const pOut = router ? ROUTER_SMALL_SHARE * MODELS.small.pOut + (1 - ROUTER_SMALL_SHARE) * MODELS.mid.pOut : m.pOut;
  let baseQ = router ? (c.observability === 'tracing' ? MODELS.mid.quality : 70) : m.quality;
  if (router && c.observability !== 'tracing') notes.push('Router quality drops without evals: you cannot tell which requests are safe to send to the small model.');

  /* caching */
  const inputTok = SYSTEM_TOK + s.questionTok + ctxTok;
  const cacheable = c.caching === 'none' ? 0 : SYSTEM_TOK + (c.knowledge === 'prompt' ? s.knowledgeTok : 0);
  const cacheShare = cacheable / inputTok;
  const responseHit = c.caching === 'both' ? s.repeatRate : 0;
  if (c.caching === 'both') q += s.changesOften ? -6 : -1;

  /* safety */
  const safetyMs = c.safety === 'none' ? 0 : c.safety === 'guard' ? 120 : 150;
  const safetyMult = c.safety === 'none' ? 1 : 1.03;
  if (c.safety !== 'none') q -= 1;

  /* reliability */
  const availability = { single: 99.5, retry: 99.8, fallback: 99.95 }[c.reliability as 'single'] ?? 99.5;
  const reliabilityMs = c.reliability === 'single' ? 0 : 100;
  if (c.reliability === 'fallback' && c.observability !== 'tracing') {
    q -= 2;
    notes.push('A fallback model that is not covered by evals can quietly be worse.');
  }

  /* observability */
  const obsInfra = { none: 0, logs: 30, tracing: 150 }[c.observability as 'none'] ?? 0;
  q += { none: -4, logs: -2, tracing: 2 }[c.observability as 'none'] ?? 0;

  const quality = Math.max(0, Math.min(100, baseQ + q));

  /* cost */
  const base = costPerRequest({ inTok: inputTok, outTok: s.answerTok, pIn, pOut, cacheShare, cacheDisc: CACHE_DISC });
  const perRequest = base.total * safetyMult;
  const variable = monthlyCost(perRequest, s.reqPerDay) * (1 - responseHit);
  const infra = (infraBase + obsInfra) * s.infraX;
  const monthly = variable + infra;

  /* latency (p95, in the spirit of the lesson: it follows the slower path) */
  const prefillMs = ((inputTok - cacheable) / m.prefill) * 1000 + ((cacheable * CACHED_PREFILL_FACTOR) / m.prefill) * 1000;
  const ttftMs = m.baseMs + prefillMs + retrievalMs + safetyMs + reliabilityMs + (router ? 50 : 0);

  /* complexity */
  const complexity = slots.reduce((sum, slot) => {
    const opt = slotInfo[slot].options.find((o) => o.id === c[slot]);
    return sum + (opt?.complexity ?? 0);
  }, 0);

  /* requirement checks */
  const n = s.needs;
  const checks: Check[] = [];
  const add = (x: Check) => checks.push(x);

  if (c.knowledge === 'prompt') {
    add({
      id: 'context',
      label: 'Knowledge fits the context window',
      pass: s.knowledgeTok <= CONTEXT_WINDOW_TOK,
      detail: `${s.knowledgeTok.toLocaleString('en-US')} tokens of knowledge against a window of about ${CONTEXT_WINDOW_TOK.toLocaleString('en-US')}.`,
      hint: 'Some knowledge bases are simply too big to send every time.',
      lesson: { label: 'Context window and caching', href: '/learn/llm/context-window-and-caching/' },
    });
  }
  add({
    id: 'budget',
    label: `Monthly cost within ${usd(n.budget)}`,
    pass: monthly <= n.budget,
    detail: `Estimated ${usd(monthly)} a month (${usd(variable)} for tokens, ${usd(infra)} for infrastructure).`,
    hint: 'Look at what dominates: tokens per request, the model tier, or fixed infrastructure.',
    lesson: { label: 'Cost levers', href: '/learn/cost/cost-levers/' },
  });
  add({
    id: 'latency',
    label: `Time to first token under ${n.ttftMs.toLocaleString('en-US')} ms`,
    pass: ttftMs <= n.ttftMs,
    detail: `Estimated ${Math.round(ttftMs).toLocaleString('en-US')} ms at the 95th percentile.`,
    hint: 'Long prompts and big models both add time before the first token.',
    lesson: { label: 'Life of a request', href: '/learn/serving/life-of-a-request/' },
  });
  add({
    id: 'quality',
    label: `Answer quality at least ${n.minQuality}`,
    pass: quality >= n.minQuality,
    detail: `Estimated quality score ${Math.round(quality)} out of 100.`,
    hint: 'Quality comes from the model, from how well it is given the facts, and from being able to measure it.',
    lesson: { label: 'Prompting, RAG or fine-tuning', href: '/learn/llm/prompting-vs-rag-vs-fine-tuning/' },
  });
  add({
    id: 'availability',
    label: `Availability of at least ${n.availability}%`,
    pass: availability >= n.availability,
    detail: `Design gives about ${availability}%.`,
    hint: 'One endpoint is only as available as that endpoint.',
    lesson: { label: 'Model routing and fallbacks', href: '/learn/systems/model-routing-and-fallbacks/' },
  });
  if (n.citations) {
    add({
      id: 'citations',
      label: 'Answers can cite their sources',
      pass: c.knowledge !== 'finetune',
      detail: c.knowledge === 'finetune' ? 'Knowledge baked into weights cannot point back to a document.' : 'The source passages are in the prompt, so they can be cited.',
      hint: 'Where does the model read the fact from at answer time?',
      lesson: { label: 'RAG from scratch', href: '/learn/rag-agents/rag-from-scratch/' },
    });
  }
  if (n.perUserAccess) {
    const retrievalBased = c.knowledge === 'rag' || c.knowledge === 'hybrid';
    const scoped = c.safety === 'guard-access' && retrievalBased;
    const cacheOk = c.caching !== 'both' || c.safety === 'guard-access';
    add({
      id: 'access',
      label: 'Each user sees only what they are allowed to',
      pass: scoped && cacheOk,
      detail: !retrievalBased
        ? 'Without a retrieval step there is nowhere to filter by permission before the model sees the text.'
        : c.safety !== 'guard-access'
          ? 'Nothing filters passages by the caller’s permissions.'
          : !cacheOk
            ? 'A shared response cache can serve one user’s answer to another.'
            : 'Retrieval is filtered per user and caches are scoped.',
      hint: 'Permissions are enforced where data is fetched, not in the prompt.',
      lesson: { label: 'RAG service architecture', href: '/learn/systems/rag-service-architecture/' },
    });
  }
  if (n.sensitiveData) {
    add({
      id: 'pii',
      label: 'Sensitive data is handled',
      pass: c.safety !== 'none',
      detail: c.safety === 'none' ? 'Personal data can flow through prompts and answers unchecked.' : 'Guardrails screen inputs and outputs.',
      hint: 'Something needs to look at what goes in and out.',
      lesson: { label: 'What is AWS Bedrock? (Guardrails)', href: '/learn/cloud/what-is-bedrock/' },
    });
  }
  add({
    id: 'operable',
    label: `Simple enough to run (complexity at most ${n.maxComplexity})`,
    pass: complexity <= n.maxComplexity,
    detail: `Moving parts: ${complexity}. Every extra component is something your team has to run and debug.`,
    hint: 'Do not buy capability you do not need.',
    lesson: { label: 'RAG service architecture', href: '/learn/systems/rag-service-architecture/' },
  });

  const passed = checks.filter((x) => x.pass).length;
  const allPass = passed === checks.length;
  let score = (passed / checks.length) * 70;
  if (allPass) {
    const budgetRoom = Math.max(0, Math.min(1, (n.budget - monthly) / n.budget));
    const qualityRoom = Math.max(0, Math.min(1, (quality - n.minQuality) / 15));
    score += budgetRoom * 15 + qualityRoom * 15;
  }

  return {
    inputTok,
    perRequest,
    monthly,
    ttftMs,
    quality,
    availability,
    complexity,
    checks,
    passed,
    total: checks.length,
    allPass,
    score: Math.round(score),
    notes,
  };
}

/** Every combination of choices, evaluated. Small enough to brute-force. */
export function enumerate(s: Scenario): { choice: Choice; result: Result }[] {
  const out: { choice: Choice; result: Result }[] = [];
  const walk = (i: number, acc: Partial<Choice>) => {
    if (i === slots.length) {
      const choice = acc as Choice;
      out.push({ choice, result: evaluate(s, choice) });
      return;
    }
    for (const o of slotInfo[slots[i]].options) walk(i + 1, { ...acc, [slots[i]]: o.id });
  };
  walk(0, {});
  return out;
}

export function solutions(s: Scenario) {
  return enumerate(s)
    .filter((e) => e.result.allPass)
    .sort((a, b) => b.result.score - a.result.score);
}

export const defaultChoice = (): Choice => ({
  knowledge: 'prompt',
  model: 'mid',
  caching: 'none',
  safety: 'none',
  reliability: 'single',
  observability: 'none',
});
