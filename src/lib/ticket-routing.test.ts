import { describe, expect, it } from 'vitest';
import { OPTIONS, breakEvenMistakeCost, cheapest, compare, option, runCostPer1000 } from './ticket-routing';

describe('ticket routing example', () => {
  it('prices the LLM call from tokens: 400 in and 10 out at $3 and $15 per million is $1.35 per 1,000', () => {
    expect(runCostPer1000(option('llm'))).toBeCloseTo(1.35, 10);
  });

  it('has a tiny compute cost for the classifier and none for rules', () => {
    expect(runCostPer1000(option('classifier'))).toBeCloseTo(0.02, 10);
    expect(runCostPer1000(option('rules'))).toBe(0);
  });

  it('computes the table at 100,000 tickets a month and $0.80 a mistake', () => {
    const rows = compare(100_000, 0.8);
    const by = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(by.rules.wrongPer1000).toBeCloseTo(290, 6);
    expect(by.classifier.wrongPer1000).toBeCloseTo(120, 6);
    expect(by.llm.wrongPer1000).toBeCloseTo(90, 6);
    expect(by.rules.perThousand).toBeCloseTo(232, 6);
    expect(by.classifier.perThousand).toBeCloseTo(96.02, 6);
    expect(by.llm.perThousand).toBeCloseTo(73.35, 6);
    expect(by.rules.totalMonth).toBeCloseTo(23_500, 4);
    expect(by.classifier.totalMonth).toBeCloseTo(10_402, 4);
    expect(by.llm.totalMonth).toBeCloseTo(8_835, 4);
    expect(cheapest(rows).id).toBe('llm');
  });

  it('prefers the classifier when a mistake is cheap ($0.10) at the same volume', () => {
    const rows = compare(100_000, 0.1);
    expect(cheapest(rows).id).toBe('classifier');
  });

  it('prefers keyword rules at a tiny volume with cheap mistakes', () => {
    expect(cheapest(compare(2_000, 0.1)).id).toBe('rules');
  });

  it('keeps accuracy ordered rules < classifier < LLM in the example', () => {
    const acc = OPTIONS.map((o) => o.accuracy);
    expect(acc[0]).toBeLessThan(acc[1]);
    expect(acc[1]).toBeLessThan(acc[2]);
  });

  it('finds the mistake cost where the LLM overtakes the classifier at 100,000 tickets', () => {
    const be = breakEvenMistakeCost(100_000, 'classifier', 'llm')!;
    // LLM extra fixed = 700 upkeep + (1.35 - 0.02) * 100 = 833; extra mistakes avoided = 30 * 100 = 3,000
    expect(be).toBeCloseTo(833 / 3000, 6);
    const rows = compare(100_000, be);
    const by = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(by.llm.totalMonth).toBeCloseTo(by.classifier.totalMonth, 6);
  });

  it('returns null when the "better" option is not more accurate', () => {
    expect(breakEvenMistakeCost(100_000, 'llm', 'rules')).toBeNull();
  });
});
