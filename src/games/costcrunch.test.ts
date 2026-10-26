import { describe, expect, it } from 'vitest';
import { allOutcomes, baselineOutcome, crunchScenarios, evaluate, levers, marginal } from './costcrunch';

const s = (id: string) => crunchScenarios.find((x) => x.id === id)!;

describe('cost crunch scenarios', () => {
  it('start above target, at baseline quality, with no moves used', () => {
    for (const sc of crunchScenarios) {
      const b = baselineOutcome(sc);
      expect(b.monthly).toBeGreaterThan(sc.target);
      expect(b.quality).toBe(sc.baselineQuality);
      expect(b.win).toBe(false);
      expect(b.movesUsed).toBe(0);
    }
  });

  it('every scenario can be won, can earn two stars, and can earn three', () => {
    for (const sc of crunchScenarios) {
      const all = allOutcomes(sc);
      const best = Math.max(...all.map((a) => a.outcome.stars));
      expect(best, sc.id).toBe(3);
    }
  });

  it('winning is rare enough to need thought', () => {
    for (const sc of crunchScenarios) {
      const all = allOutcomes(sc);
      const wins = all.filter((a) => a.outcome.win).length;
      expect(wins).toBeGreaterThan(0);
      expect(wins / all.length).toBeLessThan(0.3);
    }
  });

  it('the obvious move of switching everything to the small model fails on quality', () => {
    for (const sc of crunchScenarios) {
      const o = evaluate(sc, ['smallModel']);
      expect(o.quality).toBeLessThan(sc.qualityFloor);
    }
  });
});

describe('cost crunch interactions', () => {
  it('trimming the prompt too far disables prompt caching', () => {
    const rag = s('rag-bill'); // system prompt 1200 -> 720 after trimming
    const cachedOnly = evaluate(rag, ['promptCache']);
    const both = evaluate(rag, ['trimPrompt', 'promptCache']);
    expect(cachedOnly.warnings.promptCache).toBeUndefined();
    expect(both.warnings.promptCache).toMatch(/below/);
  });

  it('evals make routing safer without changing cost', () => {
    const sc = s('agent-bill');
    const blind = evaluate(sc, ['route']);
    const measured = evaluate(sc, ['evals', 'route']);
    expect(measured.quality).toBeGreaterThan(blind.quality);
    expect(measured.monthly).toBeCloseTo(blind.monthly, 6);
  });

  it('batch does nothing when nothing is asynchronous', () => {
    const sc = s('chatbot');
    expect(evaluate(sc, ['batch']).warnings.batch).toBeDefined();
    expect(evaluate(sc, ['batch']).monthly).toBeCloseTo(baselineOutcome(sc).monthly, 6);
  });

  it('cutting passages is much riskier when retrieval is weak', () => {
    const weak = s('rag-bill');
    const strong = { ...weak, retrievalStrong: true };
    expect(evaluate(weak, ['fewerChunks']).quality).toBeLessThan(evaluate(strong, ['fewerChunks']).quality);
  });

  it('routing after moving everything to the small model adds nothing', () => {
    const sc = s('chatbot');
    const a = evaluate(sc, ['smallModel']);
    const b = evaluate(sc, ['smallModel', 'route']);
    expect(b.monthly).toBeCloseTo(a.monthly, 6);
    expect(b.quality).toBe(a.quality);
    expect(b.warnings.route).toBeDefined();
  });

  it('reports each lever’s marginal saving in context', () => {
    const sc = s('chatbot');
    const m = marginal(sc, ['promptCache', 'capOutput'], 'promptCache');
    expect(m.saved).toBeGreaterThan(0);
    expect(m.quality).toBe(0);
  });

  it('every lever links to a lesson', () => {
    levers.forEach((l) => expect(l.lesson.href.startsWith('/learn/')).toBe(true));
  });
});
