import { describe, expect, it } from 'vitest';
import {
  buildRun,
  chainSuccess,
  EXAMPLE,
  LOOKUP_CHOICES,
  lookupTurns,
  multiplierExample,
  PATTERNS,
  schedule,
  snapshot,
  type Options,
  type PatternId,
} from './agent-patterns';

const clean = (lookups = 2, batch = false): Options => ({ lookups, batch, fail: false, checker: false });
const IDS = PATTERNS.map((p) => p.id);

describe('every pattern, every setting', () => {
  for (const id of IDS) {
    for (const lookups of LOOKUP_CHOICES) {
      for (const batch of [false, true]) {
        for (const [fail, checker] of [[false, false], [true, false], [true, true], [false, true]] as const) {
          it(`${id} K=${lookups} batch=${batch} fail=${fail} checker=${checker} is a consistent schedule`, () => {
            const run = buildRun(id, { lookups, batch, fail, checker });
            const end = new Map(run.steps.map((s) => [s.id, s.end]));
            expect(new Set(run.steps.map((s) => s.id)).size).toBe(run.steps.length);
            for (const s of run.steps) {
              expect(s.end).toBe(s.start + s.ms);
              for (const a of s.after) expect(s.start).toBeGreaterThanOrEqual(end.get(a)!);
              expect(run.lanes.some((l) => l.id === s.actor)).toBe(true);
            }
            const inTok = run.steps.reduce((a, s) => a + s.inTok, 0);
            const outTok = run.steps.reduce((a, s) => a + s.outTok, 0);
            expect(run.totals.inTok).toBe(inTok);
            expect(run.totals.outTok).toBe(outTok);
            expect(run.totals.tokens).toBe(inTok + outTok);
            expect(run.totals.ms).toBe(Math.max(...run.steps.map((s) => s.end)));
          });
        }
      }
    }
  }
});

describe('the single agent, worked by hand', () => {
  it('resends a growing context: K=2, one lookup per turn', () => {
    // 6 order lookups and 1 policy lookup, then the answer: 8 calls.
    // Context starts at 900 + 150 = 1050 and grows by 60 + 200 per order lookup.
    // Inputs: 1050 + 1310 + 1570 + 1830 + 2090 + 2350 (six calls), then 2610 and 2610 + 60 + 400 = 3070.
    const run = buildRun('single', clean(2));
    expect(run.totals.calls).toBe(8);
    expect(run.totals.inTok).toBe(1050 + 1310 + 1570 + 1830 + 2090 + 2350 + 2610 + 3070);
    expect(run.totals.inTok).toBe(15880);
    expect(run.totals.outTok).toBe(7 * 60 + 250);
  });

  it('costs what the example prices say', () => {
    const run = buildRun('single', clean(2));
    expect(run.totals.usd).toBeCloseTo((15880 * 3 + 670 * 15) / 1e6, 10);
  });

  it('takes fewer turns when it batches independent lookups', () => {
    const one = buildRun('single', clean(2, false));
    const batched = buildRun('single', clean(2, true));
    expect(batched.totals.calls).toBe(3);
    expect(batched.totals.inTok).toBeLessThan(one.totals.inTok);
    expect(batched.totals.ms).toBeLessThan(one.totals.ms);
  });

  it('lookupTurns covers every record exactly once', () => {
    for (const batch of [false, true]) {
      const turns = lookupTurns(3, 2, batch);
      const flat = turns.flat();
      expect(flat.filter((r) => r === EXAMPLE.record)).toHaveLength(6);
      expect(flat.filter((r) => r === EXAMPLE.policy)).toHaveLength(1);
    }
  });
});

describe('what the patterns are good and bad at', () => {
  const total = (id: PatternId, o: Options) => buildRun(id, o).totals;

  it('parallel branches finish faster than a pipeline on the same job', () => {
    expect(total('parallel', clean(4)).ms).toBeLessThan(total('pipeline', clean(4)).ms);
  });

  it('workflow patterns beat an agent when the steps are known in advance', () => {
    for (const id of ['pipeline', 'parallel', 'evaluator'] as const) {
      expect(total(id, clean(4)).usd).toBeLessThan(total('single', clean(4)).usd);
    }
  });

  it('a lone agent resending a long context loses to separate worker contexts on long jobs', () => {
    expect(total('orchestrator', clean(6)).tokens).toBeLessThan(total('single', clean(6)).tokens);
    expect(total('orchestrator', clean(6)).ms).toBeLessThan(total('single', clean(6)).ms);
  });

  it('but a single agent is cheaper on short jobs', () => {
    expect(total('single', clean(1, true)).usd).toBeLessThan(total('orchestrator', clean(1, true)).usd);
  });

  it('routing saves the cost of the big prompt when the specialist is small', () => {
    expect(total('routing', clean(2)).inTok).toBeLessThan(total('single', clean(2)).inTok);
  });

  it('orchestrator workers start together after the plan', () => {
    const run = buildRun('orchestrator', clean(2));
    const plan = run.steps.find((s) => s.id === 'plan')!;
    const starts = ['w1c0', 'w2c0', 'w3c0', 'wpc0'].map((id) => run.steps.find((s) => s.id === id)!.start);
    expect(new Set(starts)).toEqual(new Set([plan.end]));
  });

  it('the hand-off carries the whole transcript to the next agent', () => {
    const run = buildRun('handoff', clean(2));
    const firstRefunds = run.steps.find((s) => s.id === 'rc0')!;
    const firstOrders = run.steps.find((s) => s.id === 'oc0')!;
    expect(firstRefunds.inTok).toBeGreaterThan(firstOrders.inTok);
  });
});

describe('a worker returns something wrong', () => {
  const uncaught = IDS.filter((id) => id !== 'evaluator');

  it('reaches the customer in every pattern without a checker, apart from evaluator-optimiser', () => {
    for (const id of uncaught) {
      const run = buildRun(id, { lookups: 2, batch: false, fail: true, checker: false });
      expect(run.outcome.correct).toBe(false);
      expect(run.steps.filter((s) => s.wrong)).toHaveLength(1);
      expect(run.totals.tokens).toBe(buildRun(id, clean(2)).totals.tokens);
    }
  });

  it('is caught by evaluator-optimiser with one revision', () => {
    const run = buildRun('evaluator', { lookups: 2, batch: false, fail: true, checker: false });
    expect(run.outcome).toMatchObject({ correct: true, caught: true, redoCalls: 1 });
    expect(run.totals.calls).toBe(buildRun('evaluator', clean(2)).totals.calls + 2);
  });

  it('is caught by an independent checker in the other patterns, at extra cost', () => {
    for (const id of uncaught) {
      const base = buildRun(id, clean(2));
      const run = buildRun(id, { lookups: 2, batch: false, fail: true, checker: true });
      expect(run.outcome.correct).toBe(true);
      expect(run.outcome.caught).toBe(true);
      expect(run.totals.tokens).toBeGreaterThan(base.totals.tokens);
      expect(run.totals.ms).toBeGreaterThan(base.totals.ms);
      expect(run.steps.some((s) => s.redo)).toBe(true);
      expect(run.steps.filter((s) => s.kind === 'check')).toHaveLength(2);
    }
  });

  it('re-runs the failing step and what depends on it, so a parallel branch is cheaper to fix than a chain', () => {
    const redo = (id: PatternId) => buildRun(id, { lookups: 2, batch: false, fail: true, checker: true }).outcome.redoCalls;
    expect(redo('parallel')).toBe(2); // the bad branch and the writer
    expect(redo('orchestrator')).toBe(2); // the bad worker's last call and the synthesis
    expect(redo('pipeline')).toBe(2); // the draft and the polish
    expect(redo('handoff')).toBeGreaterThan(redo('parallel')); // everything after the bad call, in every later agent
    expect(redo('single')).toBeGreaterThan(redo('parallel'));
  });

  it('a checker on a clean run only adds its own call', () => {
    const base = buildRun('pipeline', clean(2));
    const run = buildRun('pipeline', { lookups: 2, batch: false, fail: false, checker: true });
    expect(run.outcome.correct).toBe(true);
    expect(run.totals.calls).toBe(base.totals.calls + 1);
  });
});

describe('snapshot', () => {
  const run = buildRun('orchestrator', clean(2));

  it('starts empty and ends at the totals', () => {
    const first = snapshot(run, 0);
    expect(first.tokens).toBeGreaterThan(0); // the first call has started and its prompt is counted
    expect(first.done).toHaveLength(0);
    const last = snapshot(run, run.totals.ms + 1);
    expect(last.finished).toBe(true);
    expect(last.tokens).toBe(run.totals.tokens);
    expect(last.calls).toBe(run.totals.calls);
    expect(last.usd).toBeCloseTo(run.totals.usd, 10);
  });

  it('never goes backwards', () => {
    let prev = 0;
    let prevUsd = 0;
    for (let t = 0; t <= run.totals.ms; t += 250) {
      const s = snapshot(run, t);
      expect(s.tokens).toBeGreaterThanOrEqual(prev);
      expect(s.usd).toBeGreaterThanOrEqual(prevUsd);
      prev = s.tokens;
      prevUsd = s.usd;
    }
  });
});

describe('schedule', () => {
  it('refuses a step that depends on one that has not been listed yet', () => {
    expect(() => schedule([{ id: 'a', actor: 'x', kind: 'llm', inTok: 1, outTok: 1, ms: 1, after: ['b'] }])).toThrow();
  });
});

describe('numbers used in the lesson text', () => {
  it('scales a 6,000-token chat by the reported multipliers', () => {
    const [chat, agent, multi] = multiplierExample(6000, 6, 10000);
    expect(chat.tokens).toBe(6000);
    expect(agent.tokens).toBe(24000);
    expect(multi.tokens).toBe(90000);
    expect(chat.perTask).toBeCloseTo(0.036, 10);
    expect(agent.perTask).toBeCloseTo(0.144, 10);
    expect(multi.perTask).toBeCloseTo(0.54, 10);
    expect(chat.perDay).toBeCloseTo(360, 8);
    expect(multi.perDay).toBeCloseTo(5400, 8);
  });

  it('shows how success rates multiply along a chain', () => {
    expect(chainSuccess(0.95, 1)).toBeCloseTo(0.95, 10);
    expect(chainSuccess(0.95, 4)).toBeCloseTo(0.8145, 4);
    expect(chainSuccess(0.95, 10)).toBeCloseTo(0.5987, 4);
    expect(chainSuccess(0.99, 10)).toBeCloseTo(0.9044, 4);
  });
});

describe('numbers quoted in the lesson text', () => {
  const r = (id: PatternId, o: Partial<Options>) => buildRun(id, { ...clean(2), ...o }).totals;
  // Dollars to three decimals and seconds to one, as the lesson quotes them.
  const d = (n: number) => Math.round(n * 1000) / 1000;
  const s = (ms: number) => Math.round(ms / 100) / 10;

  it('short jobs: one agent that batches its tool calls beats an orchestrator on cost and time', () => {
    expect(d(r('single', { lookups: 1, batch: true }).usd)).toBe(0.017);
    expect(s(r('single', { lookups: 1, batch: true }).ms)).toBe(7.0);
    expect(d(r('orchestrator', { lookups: 1 }).usd)).toBe(0.035);
    expect(s(r('orchestrator', { lookups: 1 }).ms)).toBe(8.0);
  });

  it('long jobs: workers with their own small contexts finish sooner than a lone agent', () => {
    expect(d(r('single', { lookups: 6 }).usd)).toBe(0.233);
    expect(s(r('single', { lookups: 6 }).ms)).toBe(30.4);
    expect(d(r('single', { lookups: 6, batch: true }).usd)).toBe(0.1);
    expect(s(r('single', { lookups: 6, batch: true }).ms)).toBe(21.3);
    expect(d(r('orchestrator', { lookups: 6 }).usd)).toBe(0.117);
    expect(s(r('orchestrator', { lookups: 6 }).ms)).toBe(15.1);
    expect(d(r('pipeline', { lookups: 6 }).usd)).toBe(0.025);
    expect(s(r('pipeline', { lookups: 6 }).ms)).toBe(9.6);
  });

  it('a wrong fact plus a checker raises the orchestrator run from from $0.046 to $0.071 and 9.4 to 15.7 seconds', () => {
    const bad = buildRun('orchestrator', { lookups: 2, batch: false, fail: true, checker: true }).totals;
    expect(d(r('orchestrator', {}).usd)).toBe(0.046);
    expect(d(bad.usd)).toBe(0.071);
    expect(s(r('orchestrator', {}).ms)).toBe(9.4);
    expect(s(bad.ms)).toBe(15.7);
  });
});
