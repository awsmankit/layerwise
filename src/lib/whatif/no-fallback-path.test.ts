import { describe, expect, it } from 'vitest';
import { DEFAULT_BUDGET_MS, DEFAULT_THRESHOLD, EVENT_COUNT, RULE_INTENTS, cause, events, outcomeWith, outcomeWithout, run, tally } from './no-fallback-path';

describe('no fallback path what-if', () => {
  it('has a fixed script of 50 events', () => {
    expect(events()).toHaveLength(EVENT_COUNT);
    expect(events().map((e) => e.latencyMs)).toEqual(events().map((e) => e.latencyMs));
    for (const e of events()) {
      expect(e.confidence).toBeGreaterThan(0);
      expect(e.confidence).toBeLessThanOrEqual(1);
      expect(e.latencyMs).toBeGreaterThan(0);
      if (e.ruleCan) expect(RULE_INTENTS).toContain(e.intent);
    }
  });
  it('hand-checked outcomes on made-up events', () => {
    const slow = { id: 0, intent: 'pause', latencyMs: 300, confidence: 0.95, modelRight: true, ruleCan: true } as const;
    const unsure = { id: 1, intent: 'answer call', latencyMs: 60, confidence: 0.4, modelRight: false, ruleCan: false } as const;
    const sure = { id: 2, intent: 'volume up', latencyMs: 60, confidence: 0.95, modelRight: false, ruleCan: true } as const;
    expect(outcomeWithout(slow, 150)).toBe('silence');
    expect(outcomeWith(slow, 150, 0.6)).toBe('right');
    expect(cause(slow, 150, 0.6)).toBe('timeout');
    expect(outcomeWithout(unsure, 150)).toBe('wrong');
    expect(outcomeWith(unsure, 150, 0.6)).toBe('ask');
    expect(cause(unsure, 150, 0.6)).toBe('low');
    // a confident mistake gets past a fallback: it is not slow and not unsure
    expect(outcomeWith(sure, 150, 0.6)).toBe('wrong');
    expect(cause(sure, 150, 0.6)).toBe('ok');
  });
  it('the example run: without a fallback nobody is told anything, with one nothing is silent', () => {
    const r = run(DEFAULT_BUDGET_MS, DEFAULT_THRESHOLD);
    expect(r.tallyWithout.right + r.tallyWithout.wrong + r.tallyWithout.silence + r.tallyWithout.ask).toBe(EVENT_COUNT);
    expect(r.tallyWith.right + r.tallyWith.wrong + r.tallyWith.silence + r.tallyWith.ask).toBe(EVENT_COUNT);
    expect(r.tallyWithout.ask).toBe(0);
    expect(r.tallyWith.silence).toBe(0);
    expect(r.tallyWithout.silence).toBeGreaterThan(0);
    expect(r.tallyWith.right).toBeGreaterThan(r.tallyWithout.right);
    expect(r.tallyWith.wrong).toBeLessThan(r.tallyWithout.wrong);
  });
  it('a tighter time limit means more silence without a fallback (monotone)', () => {
    let prev = -1;
    for (const budget of [400, 300, 200, 150, 100, 60]) {
      const s = run(budget, DEFAULT_THRESHOLD).tallyWithout.silence;
      expect(s).toBeGreaterThanOrEqual(prev);
      prev = s;
    }
  });
  it('a higher confidence bar sends more events to the fallback: fewer wrong actions, more asks', () => {
    let prevWrong = Infinity;
    let prevAsk = -1;
    for (const t of [0.3, 0.5, 0.7, 0.8, 0.9, 0.99]) {
      const w = run(DEFAULT_BUDGET_MS, t).tallyWith;
      expect(w.wrong).toBeLessThanOrEqual(prevWrong);
      expect(w.ask).toBeGreaterThanOrEqual(prevAsk);
      prevWrong = w.wrong;
      prevAsk = w.ask;
    }
  });
  it('the fallback never makes things silent or wrong by itself: it either answers right or asks', () => {
    const r = run(100, 0.9);
    r.causes.forEach((c, i) => {
      if (c !== 'ok') expect(['right', 'ask']).toContain(r.withFallback[i]);
    });
  });
  it('counts only the events shown so far', () => {
    expect(Object.values(run(150, 0.6, 10).tallyWith).reduce((a, b) => a + b, 0)).toBe(10);
    expect(tally(['right', 'wrong', 'right'])).toEqual({ right: 2, wrong: 1, silence: 0, ask: 0 });
  });
});
