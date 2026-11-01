import { describe, expect, it } from 'vitest';
import {
  GB,
  STAGES,
  budgetLeft,
  dailyCost,
  embeddingBytes,
  outcomeAt,
  reductionPercent,
  requestRate,
  scoreScenario,
  scoreStage,
  shuffled,
} from './ml-design';
import { SCENARIOS } from './ml-design-data';

describe('estimates used in the lesson', () => {
  it('feed: 10 million users x 5 loads a day is about 579 requests a second, about 1,736 at a 3x peak', () => {
    const r = requestRate(10_000_000 * 5, 3);
    expect(r.average).toBeCloseTo(578.7037, 3);
    expect(r.peak).toBeCloseTo(1736.111, 2);
  });

  it('feed: 100 million 64-dimension embeddings take 25.6 GB as float32 and 6.4 GB as int8', () => {
    expect(embeddingBytes(100_000_000, 64, 4) / GB).toBeCloseTo(25.6, 10);
    expect(embeddingBytes(100_000_000, 64, 1) / GB).toBeCloseTo(6.4, 10);
  });

  it('feed: keeping 500 of 100 million candidates is a 99.9995 percent cut', () => {
    expect(reductionPercent(100_000_000, 500)).toBeCloseTo(99.9995, 6);
  });

  it('feed: a 200 ms budget with 30 + 30 + 60 + 20 assigned leaves 60 ms', () => {
    expect(budgetLeft(200, [30, 30, 60, 20])).toBe(60);
  });

  it('search: a 300 ms budget with 20 + 50 + 40 + 80 assigned leaves 110 ms', () => {
    expect(budgetLeft(300, [20, 50, 40, 80])).toBe(110);
  });

  it('search: 20 million queries a day is about 231 a second, about 694 at a 3x peak; 10 million 128-dimension float32 embeddings take 5.12 GB', () => {
    const r = requestRate(20_000_000, 3);
    expect(r.average).toBeCloseTo(231.48, 2);
    expect(r.peak).toBeCloseTo(694.44, 2);
    expect(embeddingBytes(10_000_000, 128, 4) / GB).toBeCloseTo(5.12, 10);
  });

  it('fraud: 20 million payments a day at 0.1 percent fraud, 80 percent recall and a 0.5 percent false-positive rate flags about 115,900 and has 13.8 percent precision', () => {
    const o = outcomeAt(20_000_000, 0.001, 0.8, 0.005);
    expect(o.positives).toBeCloseTo(20_000, 6);
    expect(o.tp).toBeCloseTo(16_000, 6);
    expect(o.fn).toBeCloseTo(4_000, 6);
    expect(o.fp).toBeCloseTo(99_900, 6);
    expect(o.flagged).toBeCloseTo(115_900, 6);
    expect(o.precision).toBeCloseTo(0.1380, 3);
    expect(requestRate(20_000_000, 3).peak).toBeCloseTo(694.44, 2);
  });

  it('fraud: with an 80 dollar miss and a 2 dollar false alarm, the middle operating point is cheapest', () => {
    const cost = (recall: number, fpr: number) => dailyCost(outcomeAt(20_000_000, 0.001, recall, fpr), 80, 2);
    const a = cost(0.6, 0.001);
    const b = cost(0.8, 0.005);
    const c = cost(0.9, 0.02);
    expect(a).toBeCloseTo(679_960, 4);
    expect(b).toBeCloseTo(519_800, 4);
    expect(c).toBeCloseTo(959_200, 4);
    expect(b).toBeLessThan(a);
    expect(b).toBeLessThan(c);
  });

  it('accuracy of "approve everything" is 99.9 percent when 0.1 percent of payments are fraud', () => {
    const o = outcomeAt(1_000_000, 0.001, 0, 0);
    expect((o.negatives + 0) / 1_000_000).toBeCloseTo(0.999, 10);
    expect(o.tp).toBe(0);
  });
});

describe('scenario content', () => {
  it('has three scenarios with every stage, in order', () => {
    expect(SCENARIOS).toHaveLength(3);
    for (const s of SCENARIOS) expect(s.stages.map((q) => q.stage)).toEqual(STAGES.map((x) => x.id));
  });

  it('every stage has five options: two core, one fine, two traps, each with a reason', () => {
    for (const s of SCENARIOS) {
      for (const q of s.stages) {
        const label = `${s.id}/${q.stage}`;
        expect(q.options, label).toHaveLength(5);
        expect(q.options.filter((o) => o.kind === 'core'), label).toHaveLength(2);
        expect(q.options.filter((o) => o.kind === 'fine'), label).toHaveLength(1);
        expect(q.options.filter((o) => o.kind === 'trap'), label).toHaveLength(2);
        expect(new Set(q.options.map((o) => o.id)).size, label).toBe(5);
        for (const o of q.options) {
          expect(o.text.length, label).toBeGreaterThan(20);
          expect(o.why.length, label).toBeGreaterThan(20);
          expect(o.text + o.why, label).not.toMatch(/!/);
        }
      }
    }
  });

  it('shuffling is repeatable and keeps every option', () => {
    const q = SCENARIOS[0].stages[0];
    const a = shuffled(q.options, 12);
    const b = shuffled(q.options, 12);
    expect(a.map((o) => o.id)).toEqual(b.map((o) => o.id));
    expect(a.map((o) => o.id).sort()).toEqual(q.options.map((o) => o.id).sort());
  });
});

describe('scoring', () => {
  const q = SCENARIOS[1].stages[0];
  const ids = (kind: string) => q.options.filter((o) => o.kind === kind).map((o) => o.id);

  it('all core and no trap is strong', () => {
    const r = scoreStage(q, new Set(ids('core')));
    expect(r.verdict).toBe('strong');
    expect(r.missed).toHaveLength(0);
    expect(r.traps).toHaveLength(0);
  });

  it('fine options are never penalised', () => {
    expect(scoreStage(q, new Set([...ids('core'), ...ids('fine')])).verdict).toBe('strong');
  });

  it('one core missed is gaps, and none picked is risky', () => {
    expect(scoreStage(q, new Set([ids('core')[0]])).verdict).toBe('gaps');
    expect(scoreStage(q, new Set()).verdict).toBe('risky');
  });

  it('one trap with enough core is gaps, one trap with little core is risky, two traps is risky', () => {
    const [c1] = ids('core');
    const [t1, t2] = ids('trap');
    expect(scoreStage(q, new Set([...ids('core'), t1])).verdict).toBe('gaps');
    expect(scoreStage(q, new Set([t1])).verdict).toBe('risky');
    expect(scoreStage(q, new Set([c1, t1, t2])).verdict).toBe('risky');
    expect(scoreStage(q, new Set([...ids('core'), t1, t2])).verdict).toBe('risky');
  });

  it('the scorecard is perfect for all-core picks and zero for all-trap picks', () => {
    for (const s of SCENARIOS) {
      const perfect: Record<string, Set<string>> = {};
      const worst: Record<string, Set<string>> = {};
      for (const st of s.stages) {
        perfect[st.stage] = new Set(st.options.filter((o) => o.kind === 'core').map((o) => o.id));
        worst[st.stage] = new Set(st.options.filter((o) => o.kind === 'trap').map((o) => o.id));
      }
      const good = scoreScenario(s, perfect);
      expect(good.percent).toBe(100);
      expect(good.max).toBe(14);
      expect(scoreScenario(s, worst).points).toBe(0);
      expect(scoreScenario(s, {}).percent).toBe(0);
    }
  });
});
