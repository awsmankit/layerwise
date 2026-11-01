/*
 * Trace viewer data and sampling arithmetic. The agent run below is INVENTED: the spans, durations and token counts
 * are example values written to show how a trace is read. Span names and attribute names follow the OpenTelemetry
 * GenAI semantic conventions (status: Development, read on 1 November 2026); the "output guardrail" span is an
 * application-defined span, not part of those conventions. Prices are example prices, not any vendor's.
 */

export type Op = 'invoke_agent' | 'chat' | 'retrieval' | 'execute_tool' | 'guardrail';

export interface Span {
  id: number;
  parent: number | null;
  /** Span name in the OpenTelemetry style: operation name, then the model, agent, tool or data source. */
  name: string;
  op: Op;
  startMs: number;
  durMs: number;
  status: 'ok' | 'error';
  inTokens?: number;
  outTokens?: number;
  /** A few attributes, as they would appear on the span (values are examples). */
  attrs: Record<string, string>;
  /** What a reader should notice. */
  note: string;
  /** An invented prompt or completion, shown only when content capture is on. */
  content?: string;
}

export const SPANS: Span[] = [
  {
    id: 1,
    parent: null,
    name: 'invoke_agent support-agent',
    op: 'invoke_agent',
    startMs: 0,
    durMs: 8900,
    status: 'ok',
    attrs: { 'gen_ai.operation.name': 'invoke_agent', 'gen_ai.agent.name': 'support-agent', 'gen_ai.conversation.id': 'conv_example_81', 'gen_ai.prompt.version': 'v14' },
    note: 'The whole run, 8.9 s. Its own time is what is left after the children: a parent span is never the answer to "which step is slow".',
  },
  {
    id: 2,
    parent: 1,
    name: 'chat model-x',
    op: 'chat',
    startMs: 50,
    durMs: 1200,
    status: 'ok',
    inTokens: 1900,
    outTokens: 120,
    attrs: { 'gen_ai.operation.name': 'chat', 'gen_ai.request.model': 'model-x', 'gen_ai.usage.input_tokens': '1900', 'gen_ai.usage.output_tokens': '120', 'gen_ai.response.finish_reasons': '["tool_calls"]' },
    note: 'Planning call. The model decides to search the help centre first.',
    content: 'user: "Where is my refund for order 4471?"',
  },
  {
    id: 3,
    parent: 1,
    name: 'retrieval help-center',
    op: 'retrieval',
    startMs: 1260,
    durMs: 350,
    status: 'ok',
    attrs: { 'gen_ai.operation.name': 'retrieval', 'gen_ai.data_source.id': 'help-center', 'gen_ai.retrieval.top_k': '5', documents_returned: '0' },
    note: 'The span is green, but it returned no documents. Status "ok" says the call worked, not that it helped.',
    content: 'query: "refund order 4471 status"',
  },
  {
    id: 4,
    parent: 1,
    name: 'chat model-x',
    op: 'chat',
    startMs: 1620,
    durMs: 1280,
    status: 'ok',
    inTokens: 2600,
    outTokens: 90,
    attrs: { 'gen_ai.operation.name': 'chat', 'gen_ai.request.model': 'model-x', 'gen_ai.usage.input_tokens': '2600', 'gen_ai.usage.output_tokens': '90', 'gen_ai.response.finish_reasons': '["tool_calls"]' },
    note: 'With nothing retrieved, the model asks the order tool directly.',
    content: 'assistant: tool_call lookup_order(order_id="4471")',
  },
  {
    id: 5,
    parent: 1,
    name: 'execute_tool lookup_order',
    op: 'execute_tool',
    startMs: 2910,
    durMs: 3000,
    status: 'error',
    attrs: { 'gen_ai.operation.name': 'execute_tool', 'gen_ai.tool.name': 'lookup_order', 'error.type': 'timeout' },
    note: 'The first call waits 3.0 s and times out. This is the longest step by its own time.',
    content: 'arguments: {"order_id": "4471"}',
  },
  {
    id: 6,
    parent: 1,
    name: 'execute_tool lookup_order',
    op: 'execute_tool',
    startMs: 5950,
    durMs: 400,
    status: 'ok',
    attrs: { 'gen_ai.operation.name': 'execute_tool', 'gen_ai.tool.name': 'lookup_order' },
    note: 'The retry works in 0.4 s, but it returns the full order history, about 4,100 tokens of it.',
    content: 'result: {"order": {...}, "history": [ ...41 older orders... ]}',
  },
  {
    id: 7,
    parent: 1,
    name: 'chat model-x',
    op: 'chat',
    startMs: 6360,
    durMs: 2200,
    status: 'ok',
    inTokens: 6800,
    outTokens: 310,
    attrs: { 'gen_ai.operation.name': 'chat', 'gen_ai.request.model': 'model-x', 'gen_ai.usage.input_tokens': '6800', 'gen_ai.usage.output_tokens': '310', 'gen_ai.response.finish_reasons': '["stop"]' },
    note: 'The final answer. Input has grown to 6,800 tokens because the whole tool result went back into the prompt.',
    content: 'assistant: "Your refund for order 4471 was issued on 12 October ..."',
  },
  {
    id: 8,
    parent: 1,
    name: 'output guardrail',
    op: 'guardrail',
    startMs: 8570,
    durMs: 300,
    status: 'ok',
    attrs: { 'app.guardrail.action': 'allowed' },
    note: 'An application-defined span for the output check. It is not part of the GenAI conventions.',
  },
];

export const EXAMPLE_PRICE_PER_MILLION = { input: 3, output: 15 } as const;

/** Cost of one span at the example prices, in dollars. */
export function spanCost(s: Span, price = EXAMPLE_PRICE_PER_MILLION): number {
  return ((s.inTokens ?? 0) * price.input + (s.outTokens ?? 0) * price.output) / 1_000_000;
}

export function totalCost(spans: Span[] = SPANS, price = EXAMPLE_PRICE_PER_MILLION): number {
  return spans.reduce((a, s) => a + spanCost(s, price), 0);
}

/** A span's own time: its duration minus the time covered by its direct children (children here never overlap). */
export function selfTime(s: Span, spans: Span[] = SPANS): number {
  const kids = spans.filter((k) => k.parent === s.id);
  return s.durMs - kids.reduce((a, k) => a + k.durMs, 0);
}

export type Question = 'slow' | 'costly' | 'failed' | 'empty';

export const QUESTIONS: { id: Question; ask: string }[] = [
  { id: 'slow', ask: 'Which span spent the longest doing its own work?' },
  { id: 'costly', ask: 'Which span cost the most in tokens?' },
  { id: 'failed', ask: 'Which span failed?' },
  { id: 'empty', ask: 'Which span looks fine but returned nothing useful?' },
];

/** The span that answers each question. */
export function answerFor(q: Question, spans: Span[] = SPANS): number {
  switch (q) {
    case 'slow':
      return spans.reduce((best, s) => (selfTime(s, spans) > selfTime(best, spans) ? s : best)).id;
    case 'costly':
      return spans.reduce((best, s) => (spanCost(s) > spanCost(best) ? s : best)).id;
    case 'failed':
      return spans.find((s) => s.status === 'error')!.id;
    case 'empty':
      return spans.find((s) => s.attrs.documents_returned === '0')!.id;
  }
}

/* ---------- sampling ---------- */

/** Small seeded generator so the same settings always give the same day of traffic. */
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

export interface Run {
  id: number;
  /** A stand-in for the trace ID, uniform on 0..1. A head sampler decides from this alone. */
  u: number;
  durMs: number;
  error: boolean;
}

/** A run counts as slow at or above this many milliseconds (example). */
export const SLOW_MS = 8000;
export const RUN_COUNT = 1000;

/** 1,000 invented runs: most take 2 to 5 s, a few are slow, about 2% fail. */
export function makeRuns(n = RUN_COUNT, seed = 7): Run[] {
  const rnd = mulberry32(seed);
  const runs: Run[] = [];
  for (let i = 0; i < n; i++) {
    const u = rnd();
    const error = rnd() < 0.02;
    const slow = rnd() < 0.03;
    const base = 2000 + Math.round(rnd() * 3000);
    const durMs = slow ? 8000 + Math.round(rnd() * 6000) : base;
    runs.push({ id: i + 1, u, durMs, error });
  }
  return runs;
}

export type SampleMode = 'head' | 'tail';

export interface SampleResult {
  kept: number;
  keptShare: number;
  errors: number;
  errorsKept: number;
  slow: number;
  slowKept: number;
}

/**
 * Head sampling keeps a trace from its ID alone, before it is known to be interesting. Tail sampling decides after the
 * trace is complete, so it can always keep errors and slow runs and sample the rest at `rate`.
 */
export function sampleRuns(runs: Run[], mode: SampleMode, rate: number): SampleResult {
  const isSlow = (r: Run) => r.durMs >= SLOW_MS;
  const keep = (r: Run) => (mode === 'head' ? r.u < rate : r.error || isSlow(r) || r.u < rate);
  const kept = runs.filter(keep);
  return {
    kept: kept.length,
    keptShare: runs.length ? kept.length / runs.length : 0,
    errors: runs.filter((r) => r.error).length,
    errorsKept: kept.filter((r) => r.error).length,
    slow: runs.filter(isSlow).length,
    slowKept: kept.filter(isSlow).length,
  };
}
