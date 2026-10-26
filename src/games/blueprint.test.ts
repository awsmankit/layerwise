import { describe, expect, it } from 'vitest';
import { defaultChoice, enumerate, evaluate, scenarios, slotInfo, slots, solutions, type Choice } from './blueprint';

const byId = (id: string) => scenarios.find((s) => s.id === id)!;
const withChoice = (over: Partial<Choice>): Choice => ({ ...defaultChoice(), ...over });

describe('blueprint scenarios', () => {
  it('every scenario is solvable, and difficulty ramps up', () => {
    const counts = scenarios.map((s) => solutions(s).length);
    counts.forEach((n) => expect(n).toBeGreaterThan(0));
    expect(counts[0]).toBeGreaterThan(counts[2]);
    expect(counts[1]).toBeGreaterThan(counts[2]);
  });

  it('enumerates every combination of options', () => {
    const expected = slots.reduce((n, s) => n * slotInfo[s].options.length, 1);
    expect(enumerate(scenarios[0])).toHaveLength(expected);
  });

  it('scores are bounded and a passing design always outscores a failing one', () => {
    for (const s of scenarios) {
      const all = enumerate(s);
      const bestFail = Math.max(...all.filter((e) => !e.result.allPass).map((e) => e.result.score));
      const worstPass = Math.min(...all.filter((e) => e.result.allPass).map((e) => e.result.score));
      expect(bestFail).toBeLessThan(70);
      expect(worstPass).toBeGreaterThanOrEqual(70);
      all.forEach((e) => {
        expect(e.result.score).toBeGreaterThanOrEqual(0);
        expect(e.result.score).toBeLessThanOrEqual(100);
      });
    }
  });

  it('every check explains itself and points to a lesson', () => {
    const r = evaluate(byId('support'), defaultChoice());
    for (const c of r.checks) {
      expect(c.detail.length).toBeGreaterThan(10);
      expect(c.hint.length).toBeGreaterThan(10);
      expect(c.lesson?.href.startsWith('/learn/')).toBe(true);
    }
  });
});

describe('blueprint cause and effect', () => {
  const shop = byId('shop');
  const hr = byId('hr');
  const support = byId('support');

  it('the naive shop design fails only on budget, and caching fixes it', () => {
    const naive = evaluate(shop, defaultChoice());
    expect(naive.checks.filter((c) => !c.pass).map((c) => c.id)).toEqual(['budget']);
    const cached = evaluate(shop, withChoice({ caching: 'both' }));
    expect(cached.monthly).toBeLessThan(naive.monthly);
    expect(cached.allPass).toBe(true);
  });

  it('prompt caching cuts cost and first-token time when the prompt carries the knowledge', () => {
    const none = evaluate(shop, defaultChoice());
    const cached = evaluate(shop, withChoice({ caching: 'prompt' }));
    expect(cached.monthly).toBeLessThan(none.monthly * 0.5);
    expect(cached.ttftMs).toBeLessThan(none.ttftMs);
  });

  it('a bigger model costs more, answers better and responds slower', () => {
    const a = evaluate(shop, withChoice({ model: 'small' }));
    const b = evaluate(shop, withChoice({ model: 'mid' }));
    const c = evaluate(shop, withChoice({ model: 'large' }));
    expect(a.monthly).toBeLessThan(b.monthly);
    expect(b.monthly).toBeLessThan(c.monthly);
    expect(a.quality).toBeLessThan(b.quality);
    expect(b.quality).toBeLessThan(c.quality);
    expect(a.ttftMs).toBeLessThan(b.ttftMs);
    expect(b.ttftMs).toBeLessThan(c.ttftMs);
  });

  it('cannot put a two-million-token library in the prompt', () => {
    const r = evaluate(hr, withChoice({ knowledge: 'prompt' }));
    expect(r.checks.find((c) => c.id === 'context')?.pass).toBe(false);
  });

  it('fine-tuning cannot cite sources or follow weekly changes', () => {
    const r = evaluate(hr, withChoice({ knowledge: 'finetune' }));
    expect(r.checks.find((c) => c.id === 'citations')?.pass).toBe(false);
    const rag = evaluate(hr, withChoice({ knowledge: 'rag' }));
    expect(r.quality).toBeLessThan(rag.quality);
  });

  it('per-user access needs retrieval plus access filters, and a shared cache breaks it', () => {
    const good = withChoice({ knowledge: 'rag', safety: 'guard-access', observability: 'tracing' });
    expect(evaluate(hr, good).checks.find((c) => c.id === 'access')?.pass).toBe(true);
    expect(evaluate(hr, { ...good, safety: 'guard' }).checks.find((c) => c.id === 'access')?.pass).toBe(false);
    expect(evaluate(hr, { ...good, knowledge: 'prompt' }).checks.find((c) => c.id === 'access')?.pass).toBe(false);
  });

  it('a router without evals loses quality', () => {
    const base = withChoice({ knowledge: 'rag', model: 'router' });
    const blind = evaluate(support, { ...base, observability: 'none' });
    const measured = evaluate(support, { ...base, observability: 'tracing' });
    expect(blind.quality).toBeLessThan(measured.quality - 5);
  });

  it('only a fallback reaches three nines of availability', () => {
    const avail = (reliability: string) => evaluate(support, withChoice({ reliability })).availability;
    expect(avail('single')).toBeLessThan(99.9);
    expect(avail('retry')).toBeLessThan(99.9);
    expect(avail('fallback')).toBeGreaterThanOrEqual(99.9);
  });

  it('over-building is penalised when the team is small', () => {
    const everything = evaluate(shop, {
      knowledge: 'hybrid',
      model: 'router',
      caching: 'both',
      safety: 'guard-access',
      reliability: 'fallback',
      observability: 'tracing',
    });
    expect(everything.checks.find((c) => c.id === 'operable')?.pass).toBe(false);
    expect(everything.checks.find((c) => c.id === 'budget')?.pass).toBe(false);
  });

  it('the strongest design is deterministic', () => {
    expect(solutions(support)[0].choice).toEqual(solutions(support)[0].choice);
    expect(solutions(support)[0].result.allPass).toBe(true);
  });
});
