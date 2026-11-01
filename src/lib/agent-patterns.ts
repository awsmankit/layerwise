/**
 * An illustrative simulation of seven ways to organise LLM calls (one agent and six multi-agent
 * patterns) on one scripted task. Every number is an EXAMPLE chosen for teaching: token counts, prices
 * and timings are assumptions listed in EXAMPLE, not measurements of any model or vendor. The point
 * is the shape of the cost: how context is resent, what runs in parallel, what is re-run after a mistake.
 *
 * The task: a customer writes that ORDERS of theirs arrived damaged. Each order needs `lookups` records
 * fetched (K), and the refund policy is fetched once. The reply must be correct for every order.
 */

export type PatternId = 'single' | 'pipeline' | 'routing' | 'parallel' | 'orchestrator' | 'evaluator' | 'handoff';
export type StepKind = 'llm' | 'tool' | 'check';

/** All the assumptions behind the numbers. Tokens are counts; times are milliseconds; prices are dollars per million tokens. */
export const EXAMPLE = {
  orders: 3,
  /** System prompt of one generalist agent that holds every tool definition. */
  sysAll: 900,
  /** System prompt of a specialist or worker with a narrow job and few tools. */
  sysSpec: 300,
  sysOrch: 500,
  sysRouter: 200,
  sysEval: 300,
  /** The customer's email. */
  email: 150,
  /** One order record returned by a tool. */
  record: 200,
  /** The refund policy text returned by a tool. */
  policy: 400,
  /** A model's request to call a tool. */
  toolCall: 60,
  /** A worker's summary back to its caller. */
  summary: 80,
  /** A handoff message. */
  handoff: 40,
  label: 10,
  subtask: 40,
  verdictPass: 20,
  verdictFail: 40,
  ttftMs: 400,
  msPerToken: 12,
  toolMs: 300,
  priceInPerM: 3,
  priceOutPerM: 15,
} as const;

export const LOOKUP_CHOICES = [1, 2, 4, 6] as const;
export const DEFAULT_LOOKUPS = 2;

export interface Step {
  id: string;
  /** The lane this step belongs to (an agent, or a block of code). */
  actor: string;
  kind: StepKind;
  inTok: number;
  outTok: number;
  ms: number;
  after: string[];
  /** The step that returns the wrong fact (when failure is on). */
  wrong?: boolean;
  /** A step that repeats earlier work after a mistake was found. */
  redo?: boolean;
  start: number;
  end: number;
}

export interface Lane {
  id: string;
  label: string;
  /** A block of ordinary code rather than a model. */
  code?: boolean;
}

export interface Options {
  /** Lookups needed per order. */
  lookups: number;
  /** Let a lone agent request independent tool calls together, one turn per step instead of one per lookup. */
  batch: boolean;
  /** Inject a wrong fact into the answer about order 2. */
  fail: boolean;
  /** Add an independent checker at the end (ignored by evaluator-optimiser, which has one built in). */
  checker: boolean;
}

export interface Outcome {
  correct: boolean;
  caught: boolean;
  /** Model calls repeated after a problem was found. */
  redoCalls: number;
  detail: string;
}

export interface Totals {
  calls: number;
  inTok: number;
  outTok: number;
  tokens: number;
  usd: number;
  ms: number;
}

export interface Run {
  pattern: PatternId;
  options: Options;
  lanes: Lane[];
  steps: Step[];
  totals: Totals;
  outcome: Outcome;
}

export const callMs = (outTok: number) => EXAMPLE.ttftMs + outTok * EXAMPLE.msPerToken;
export const usd = (inTok: number, outTok: number) => (inTok * EXAMPLE.priceInPerM + outTok * EXAMPLE.priceOutPerM) / 1e6;

const draftTok = (n: number) => 100 + 50 * n;

/**
 * The tool turns for looking up every order's records and the policy. One lookup per turn when unbatched
 * (policy last); with batching, each turn fetches the next record for every order together (policy in turn 1).
 */
export function lookupTurns(orders: number, lookups: number, batch: boolean): number[][] {
  const { record, policy } = EXAMPLE;
  if (!batch) return [...Array(orders * lookups).fill([record]), [policy]];
  return Array.from({ length: lookups }, (_, j) => [...Array(orders).fill(record), ...(j === 0 ? [policy] : [])]);
}

type Draft = Omit<Step, 'start' | 'end'>;

class Builder {
  steps: Draft[] = [];
  add(s: Draft): string {
    this.steps.push(s);
    return s.id;
  }
  llm(id: string, actor: string, inTok: number, outTok: number, after: string[] = []): string {
    return this.add({ id, actor, kind: 'llm', inTok, outTok, ms: callMs(outTok), after });
  }
  tool(id: string, actor: string, ms: number, after: string[] = []): string {
    return this.add({ id, actor, kind: 'tool', inTok: 0, outTok: 0, ms, after });
  }
  /**
   * An agent loop. Each turn the model requests one or more tool calls, the tools run together, and the
   * results are appended to a context that is resent on the next call. Ends with one final call.
   * Returns the call ids in order.
   */
  loop(prefix: string, actor: string, base: number, turns: number[][], finalOut: number, after: string[]): { calls: string[]; last: string; ctxEnd: number } {
    const calls: string[] = [];
    let ctx = base;
    let prev = after;
    turns.forEach((results, i) => {
      const out = EXAMPLE.toolCall * results.length;
      const c = this.llm(`${prefix}c${i}`, actor, ctx, out, prev);
      calls.push(c);
      const t = this.tool(`${prefix}t${i}`, actor, EXAMPLE.toolMs, [c]);
      ctx += out + results.reduce((a, r) => a + r, 0);
      prev = [t];
    });
    const fin = this.llm(`${prefix}c${turns.length}`, actor, ctx, finalOut, prev);
    calls.push(fin);
    return { calls, last: fin, ctxEnd: ctx + finalOut };
  }
}

/** Compute start and end times; steps must be listed after the steps they depend on. */
export function schedule(drafts: Draft[]): Step[] {
  const end = new Map<string, number>();
  return drafts.map((d) => {
    const start = d.after.reduce((m, id) => {
      const e = end.get(id);
      if (e === undefined) throw new Error(`step ${d.id} depends on unknown or later step ${id}`);
      return Math.max(m, e);
    }, 0);
    const step: Step = { ...d, start, end: start + d.ms };
    end.set(d.id, step.end);
    return step;
  });
}

/** The ids of steps that nothing else depends on. */
function sinks(steps: Draft[]): string[] {
  const used = new Set(steps.flatMap((s) => s.after));
  return steps.filter((s) => !used.has(s.id)).map((s) => s.id);
}

function descendants(steps: Draft[], id: string): Set<string> {
  const out = new Set<string>([id]);
  for (const s of steps) if (s.after.some((a) => out.has(a))) out.add(s.id);
  return out;
}

const REASON: Record<PatternId, string> = {
  single: 'Nothing looks at the source records again, and every later call builds on the wrong fact.',
  pipeline: 'A gate between steps catches only the errors you wrote a check for, and the polish step inherits the wrong draft.',
  routing: 'One specialist does all the work and nothing re-checks it, so the wrong fact goes straight to the customer.',
  parallel: 'The bad branch is isolated from the other branches, but the writer sees only summaries and cannot tell which one is wrong.',
  orchestrator: 'The orchestrator sees the worker’s summary, not its sources, so it cannot tell. Asking workers to return record ids would let it check.',
  evaluator: 'This pattern is built for it: the evaluator compares the draft with the source records and sends it back.',
  handoff: 'The wrong fact travels in the shared transcript to every agent after it.',
};

const L = (id: string, label: string, code = false): Lane => ({ id, label, ...(code ? { code } : {}) });

export function buildRun(pattern: PatternId, opts: Options): Run {
  const N = EXAMPLE.orders;
  const K = opts.lookups;
  const { email, record, policy, sysAll, sysSpec, sysOrch, sysRouter, sysEval, summary } = EXAMPLE;
  const draft = draftTok(N);
  const allRecords = N * K * record + policy;
  const b = new Builder();
  let lanes: Lane[] = [];
  let failId = '';

  switch (pattern) {
    case 'single': {
      lanes = [L('agent', 'One agent')];
      const r = b.loop('', 'agent', sysAll + email, lookupTurns(N, K, opts.batch), draft, []);
      failId = r.calls[opts.batch ? K : 2 * K];
      break;
    }
    case 'pipeline': {
      lanes = [L('extract', 'Extract'), L('fetch', 'Fetch (code)', true), L('draft', 'Draft'), L('polish', 'Polish')];
      const extractOut = 20 + 10 * N;
      b.llm('extract', 'extract', sysSpec + email, extractOut);
      b.tool('fetch', 'fetch', K * EXAMPLE.toolMs, ['extract']);
      b.llm('draft', 'draft', sysSpec + email + extractOut + allRecords, draft, ['fetch']);
      b.llm('polish', 'polish', sysSpec + draft, draft, ['draft']);
      failId = 'draft';
      break;
    }
    case 'routing': {
      lanes = [L('router', 'Router'), L('orders', 'Specialist')];
      b.llm('route', 'router', sysRouter + email, EXAMPLE.label);
      const r = b.loop('', 'orders', sysSpec + email, lookupTurns(N, K, opts.batch), draft, ['route']);
      failId = r.calls[opts.batch ? K : 2 * K];
      break;
    }
    case 'parallel': {
      lanes = [...Array.from({ length: N }, (_, i) => L(`b${i + 1}`, `Branch ${i + 1}`)), L('writer', 'Writer')];
      const done: string[] = [];
      for (let i = 1; i <= N; i++) {
        b.tool(`b${i}f`, `b${i}`, K * EXAMPLE.toolMs);
        done.push(b.llm(`b${i}`, `b${i}`, sysSpec + email + K * record, summary, [`b${i}f`]));
      }
      done.push(b.tool('pf', 'writer', EXAMPLE.toolMs));
      b.llm('writer', 'writer', sysSpec + email + N * summary + policy, draft, done);
      failId = 'b2';
      break;
    }
    case 'orchestrator': {
      lanes = [L('orch', 'Orchestrator'), ...Array.from({ length: N }, (_, i) => L(`w${i + 1}`, `Worker ${i + 1}`)), L('wp', 'Policy worker')];
      const plan = 30 * (N + 1);
      b.llm('plan', 'orch', sysOrch + email, plan);
      const finals: string[] = [];
      for (let i = 1; i <= N; i++) {
        const r = b.loop(`w${i}`, `w${i}`, sysSpec + email + EXAMPLE.subtask, Array(K).fill([record]), summary, ['plan']);
        finals.push(r.last);
        if (i === 2) failId = r.last;
      }
      finals.push(b.loop('wp', 'wp', sysSpec + email + EXAMPLE.subtask, [[policy]], summary, ['plan']).last);
      b.llm('synth', 'orch', sysOrch + email + plan + (N + 1) * summary, draft, finals);
      break;
    }
    case 'evaluator': {
      lanes = [L('fetch', 'Fetch (code)', true), L('gen', 'Writer'), L('eval', 'Evaluator')];
      b.tool('fetch', 'fetch', K * EXAMPLE.toolMs);
      const genIn = sysSpec + email + allRecords;
      b.llm('gen', 'gen', genIn, draft, ['fetch']);
      failId = 'gen';
      if (opts.fail) {
        b.llm('eval1', 'eval', sysEval + draft + allRecords, EXAMPLE.verdictFail, ['gen']);
        b.add({ id: 'gen2', actor: 'gen', kind: 'llm', inTok: genIn + draft + EXAMPLE.verdictFail, outTok: draft, ms: callMs(draft), after: ['eval1'], redo: true });
        b.llm('eval2', 'eval', sysEval + draft + allRecords, EXAMPLE.verdictPass, ['gen2']);
      } else {
        b.llm('eval1', 'eval', sysEval + draft + allRecords, EXAMPLE.verdictPass, ['gen']);
      }
      break;
    }
    case 'handoff': {
      lanes = [L('triage', 'Triage'), L('orders', 'Orders agent'), L('refunds', 'Refunds agent')];
      b.llm('triage', 'triage', sysSpec + email, EXAMPLE.handoff);
      const o = b.loop('o', 'orders', sysSpec + email + EXAMPLE.handoff, lookupTurns(N, K, opts.batch).map((t) => t.filter((r) => r !== policy)).filter((t) => t.length > 0), EXAMPLE.handoff, ['triage']);
      failId = o.calls[opts.batch ? K : 2 * K];
      b.loop('r', 'refunds', o.ctxEnd, [[policy]], draft, [o.last]);
      break;
    }
  }

  let drafts = b.steps;
  const builtIn = pattern === 'evaluator';
  let caught = false;
  let redoCalls = 0;

  // Mark the failing step; for evaluator-optimiser the flow above already contains the catch.
  if (opts.fail) drafts = drafts.map((s) => (s.id === failId ? { ...s, wrong: true } : s));
  if (builtIn && opts.fail) {
    caught = true;
    redoCalls = 1;
  }

  if (opts.checker && !builtIn) {
    lanes = [...lanes, L('checker', 'Checker')];
    const base = sinks(drafts);
    const verdict = opts.fail ? EXAMPLE.verdictFail : EXAMPLE.verdictPass;
    const c1 = 'check1';
    drafts = [...drafts, { id: c1, actor: 'checker', kind: 'check', inTok: sysEval + draft + allRecords, outTok: verdict, ms: callMs(verdict), after: base }];
    if (opts.fail) {
      const redo = descendants(drafts.filter((s) => s.id !== c1), failId);
      const clones: Draft[] = drafts
        .filter((s) => redo.has(s.id))
        .map((s) => ({
          ...s,
          id: `${s.id}~`,
          wrong: false,
          redo: true,
          after: s.after.some((a) => redo.has(a)) ? s.after.map((a) => (redo.has(a) ? `${a}~` : a)) : [c1],
        }));
      redoCalls = clones.filter((s) => s.kind === 'llm').length;
      const cloneSinks = sinks(clones);
      drafts = [...drafts, ...clones, { id: 'check2', actor: 'checker', kind: 'check', inTok: sysEval + draft + allRecords, outTok: EXAMPLE.verdictPass, ms: callMs(EXAMPLE.verdictPass), after: cloneSinks }];
      caught = true;
    }
  }

  const steps = schedule(drafts);
  const inTok = steps.reduce((a, s) => a + s.inTok, 0);
  const outTok = steps.reduce((a, s) => a + s.outTok, 0);
  const totals: Totals = {
    calls: steps.filter((s) => s.kind !== 'tool').length,
    inTok,
    outTok,
    tokens: inTok + outTok,
    usd: usd(inTok, outTok),
    ms: steps.reduce((m, s) => Math.max(m, s.end), 0),
  };

  let outcome: Outcome;
  if (!opts.fail) outcome = { correct: true, caught: false, redoCalls: 0, detail: 'The reply is correct for every order.' };
  else if (caught) {
    outcome = {
      correct: true,
      caught: true,
      redoCalls,
      detail: `Caught before the customer saw it. ${redoCalls} model ${redoCalls === 1 ? 'call was' : 'calls were'} repeated and the checks cost extra tokens and time.`,
    };
  } else outcome = { correct: false, caught: false, redoCalls: 0, detail: `A wrong fact about order 2 reaches the customer. ${REASON[pattern]}` };

  return { pattern, options: opts, lanes, steps, totals, outcome };
}

export const REASON_WHEN_UNCAUGHT = REASON;

export interface Snapshot {
  calls: number;
  inTok: number;
  outTok: number;
  tokens: number;
  usd: number;
  ms: number;
  /** Ids of steps that are running at this moment. */
  active: string[];
  /** Ids of steps that have finished. */
  done: string[];
  finished: boolean;
}

/** The tally at time t. Input tokens are counted when a call starts; output tokens as it runs. */
export function snapshot(run: Run, t: number): Snapshot {
  let calls = 0;
  let inTok = 0;
  let outTok = 0;
  const active: string[] = [];
  const done: string[] = [];
  for (const s of run.steps) {
    if (t >= s.end) done.push(s.id);
    else if (t >= s.start) active.push(s.id);
    if (s.kind === 'tool' || t < s.start) continue;
    calls += 1;
    inTok += s.inTok;
    const p = s.end > s.start ? Math.min(1, (t - s.start) / (s.end - s.start)) : 1;
    outTok += s.outTok * p;
  }
  const finished = t >= run.totals.ms;
  if (finished) return { calls: run.totals.calls, inTok: run.totals.inTok, outTok: run.totals.outTok, tokens: run.totals.tokens, usd: run.totals.usd, ms: run.totals.ms, active: [], done: run.steps.map((s) => s.id), finished };
  return { calls, inTok: Math.round(inTok), outTok: Math.round(outTok), tokens: Math.round(inTok + outTok), usd: usd(inTok, outTok), ms: t, active, done, finished };
}

export interface PatternInfo {
  id: PatternId;
  name: string;
  /** What it is, in one sentence. */
  summary: string;
  /** When it is worth it. */
  fits: string;
  /** What it costs you. */
  cost: string;
  /** Does the control flow come from your code (a workflow) or from a model (an agent)? */
  control: 'one agent' | 'code' | 'model';
}

export const PATTERNS: PatternInfo[] = [
  { id: 'single', name: 'Single agent', summary: 'One model calls tools in a loop and writes the answer.', fits: 'The default. Start here and measure.', cost: 'The context is resent on every call and grows with every tool result.', control: 'one agent' },
  { id: 'pipeline', name: 'Pipeline (prompt chaining)', summary: 'Fixed steps, each model call working on the last one’s output.', fits: 'The task splits cleanly into steps and each step is easier on its own.', cost: 'Latency adds up, and an early mistake flows downstream.', control: 'code' },
  { id: 'routing', name: 'Routing', summary: 'A small step classifies the input and sends it to a specialist.', fits: 'Distinct kinds of input that need different prompts or tools.', cost: 'One extra call, and a wrong label sends work to the wrong specialist.', control: 'model' },
  { id: 'parallel', name: 'Parallelisation', summary: 'Independent subtasks run at once and a final step combines them.', fits: 'Subtasks are independent and you know them in advance.', cost: 'Same tokens or more, but less waiting. The combine step cannot check the parts.', control: 'code' },
  { id: 'orchestrator', name: 'Orchestrator-workers', summary: 'A lead agent decides the subtasks at run time and delegates them to workers.', fits: 'Breadth you cannot list in advance, where each subtask is a long investigation.', cost: 'Planning and synthesis calls, duplicated context, and summaries that lose detail.', control: 'model' },
  { id: 'evaluator', name: 'Evaluator-optimiser', summary: 'One call writes, another checks against clear criteria, and the writer revises.', fits: 'There are clear criteria and feedback measurably improves the result.', cost: 'At least one extra call and a longer wait, for every answer.', control: 'code' },
  { id: 'handoff', name: 'Hand-off between peers', summary: 'Agents pass control, and the conversation, to the next specialist.', fits: 'The right specialist changes during the conversation and none needs to stay in charge.', cost: 'The whole transcript travels with the baton, and nobody owns the final check.', control: 'model' },
];

export const PATTERN_BY_ID: Record<PatternId, PatternInfo> = Object.fromEntries(PATTERNS.map((p) => [p.id, p])) as Record<PatternId, PatternInfo>;

/* ---------- worked examples used in the lesson text ---------- */

/** Anthropic reports agents use about 4x and multi-agent systems about 15x the tokens of a chat. */
export const TOKEN_MULTIPLIERS = { chat: 1, agent: 4, multiAgent: 15 } as const;

export function multiplierExample(chatTokens: number, blendedUsdPerM: number, tasksPerDay: number) {
  return (Object.keys(TOKEN_MULTIPLIERS) as (keyof typeof TOKEN_MULTIPLIERS)[]).map((k) => {
    const tokens = chatTokens * TOKEN_MULTIPLIERS[k];
    const perTask = (tokens * blendedUsdPerM) / 1e6;
    return { kind: k, tokens, perTask, perDay: perTask * tasksPerDay };
  });
}

/** Chance that n steps in a row all succeed when each succeeds with probability p and failures are independent. */
export function chainSuccess(p: number, n: number): number {
  return Math.pow(p, n);
}
