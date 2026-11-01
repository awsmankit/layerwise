import { describe, expect, it } from 'vitest';
import { RUNGS, RUNG_ORDER, SCENARIOS, judge, rungInfo, tally, type Rung } from './tool-choice';

describe('tool ladder', () => {
  it('orders rungs from simplest to most complex', () => {
    const pts = RUNGS.map((r) => r.points);
    expect([...pts].sort((a, b) => a - b)).toEqual(pts);
    expect(RUNG_ORDER[0]).toBe('person');
    expect(RUNG_ORDER[RUNG_ORDER.length - 1]).toBe('agent');
  });
});

describe('scenarios', () => {
  it('has 8 to 10 scenarios with unique ids', () => {
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(8);
    expect(SCENARIOS.length).toBeLessThanOrEqual(10);
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(SCENARIOS.length);
  });

  it('always lists the best rung among the acceptable ones, and uses valid rungs', () => {
    for (const s of SCENARIOS) {
      expect(s.ok, s.id).toContain(s.best);
      for (const r of s.ok) expect(RUNG_ORDER, s.id).toContain(r);
    }
  });

  it('covers the rungs a learner might reach for, including both ends of the ladder', () => {
    const best = new Set(SCENARIOS.map((s) => s.best));
    for (const r of ['person', 'rules', 'search', 'model', 'llm', 'agent'] as Rung[]) expect(best.has(r), r).toBe(true);
  });

  it('gives every scenario feedback text for each failure mode and a safeguard', () => {
    for (const s of SCENARIOS) {
      for (const k of ['job', 'facts', 'ifWrong', 'why', 'tooSimple', 'tooMuch', 'safeguard'] as const) expect(s[k].length, `${s.id}.${k}`).toBeGreaterThan(20);
    }
  });
});

describe('judge', () => {
  const byId = (id: string) => SCENARIOS.find((s) => s.id === id)!;

  it('accepts the best rung', () => {
    const j = judge(byId('invoice'), 'rules');
    expect(j).toMatchObject({ verdict: 'best', right: true });
  });

  it('accepts a listed alternative and says what the strongest fit is', () => {
    const j = judge(byId('tickets'), 'llm');
    expect(j.verdict).toBe('ok');
    expect(j.right).toBe(true);
    expect(j.message).toContain(rungInfo('model').label);
  });

  it('calls an LLM for exact arithmetic too much', () => {
    const j = judge(byId('invoice'), 'llm');
    expect(j).toMatchObject({ verdict: 'too-much', right: false });
    expect(j.message).toMatch(/sum wrong/);
  });

  it('calls rules for the contract clause too simple', () => {
    expect(judge(byId('clause'), 'rules')).toMatchObject({ verdict: 'too-simple', right: false });
  });

  it('calls automation for twenty emails a month too much', () => {
    expect(judge(byId('feedback'), 'model').verdict).toBe('too-much');
    expect(judge(byId('feedback'), 'person').verdict).toBe('best');
  });

  it('says a single call is too simple for the open-ended debugging job', () => {
    expect(judge(byId('pipeline'), 'llm').verdict).toBe('too-simple');
  });

  it('every non-accepted choice gets a verdict and a message', () => {
    for (const s of SCENARIOS)
      for (const r of RUNG_ORDER) {
        const j = judge(s, r);
        expect(j.message.length, `${s.id}/${r}`).toBeGreaterThan(20);
        expect(j.right).toBe(s.ok.includes(r));
      }
  });
});

describe('tally', () => {
  it('counts right answers and complexity points', () => {
    const answers: Record<string, Rung> = { invoice: 'llm', spam: 'model', feedback: 'person' };
    const t = tally(answers);
    expect(t.answered).toBe(3);
    expect(t.right).toBe(2);
    expect(t.chosenPoints).toBe(5 + 3 + 0);
    expect(t.bestPoints).toBe(1 + 3 + 0);
  });

  it('is empty before any answer', () => {
    expect(tally({})).toEqual({ answered: 0, right: 0, chosenPoints: 0, bestPoints: 0 });
  });
});
