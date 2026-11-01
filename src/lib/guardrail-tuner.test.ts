import { describe, expect, it } from 'vitest';
import {
  JUDGE_BAND,
  LATENCY,
  PROMPTS,
  THRESHOLDS,
  blockStatsFromRates,
  counts,
  decide,
  decideAll,
  itemWeight,
  latencySummary,
  ruleHit,
  sweep,
  totalCost,
  trafficStats,
  weightedQuantile,
  wilson,
  type Config,
  type Traffic,
} from './guardrail-tuner';

const byId = (id: number) => PROMPTS.find((p) => p.id === id)!;
const off: Config = { rules: 'off', threshold: 0.5, judge: false };
const traffic: Traffic = { n: 10000, prevalence: 0.01, baitShare: 0.05 };

describe('the prompt set', () => {
  it('has 40 prompts with unique ids: 14 plain, 12 risky-looking benign, 8 clear bad, 6 sneaky bad', () => {
    expect(PROMPTS).toHaveLength(40);
    expect(new Set(PROMPTS.map((p) => p.id)).size).toBe(40);
    const c = counts(decideAll(off));
    expect([c.nPlain, c.nBait, c.nBad]).toEqual([14, 12, 14]);
    expect(PROMPTS.filter((p) => p.kind === 'clear')).toHaveLength(8);
    expect(PROMPTS.filter((p) => p.kind === 'sneaky')).toHaveLength(6);
  });
  it('keeps every score in 0..1', () => {
    for (const p of PROMPTS) expect(p.score >= 0 && p.score <= 1).toBe(true);
  });
  it('scripts a judge that is wrong on exactly four prompts', () => {
    const wrong = PROMPTS.filter((p) => p.judgeSaysBad !== (p.label === 'bad')).map((p) => p.id);
    expect(wrong).toEqual([15, 21, 33, 39]);
  });
});

describe('the rule layer', () => {
  it('the phrase rule catches the known injection phrase, and one innocent question about it', () => {
    const hits = PROMPTS.filter((p) => ruleHit(p.text, 'phrase')).map((p) => p.id);
    expect(hits).toEqual([24, 27]);
  });
  it('misses the obfuscated and role-play versions', () => {
    expect(ruleHit(byId(36).text, 'phrase')).toBe(false);
    expect(ruleHit(byId(35).text, 'phrase')).toBe(false);
  });
  it('the blunt word list blocks nine benign prompts and two bad ones', () => {
    const hits = PROMPTS.filter((p) => ruleHit(p.text, 'words'));
    expect(hits.filter((p) => p.label === 'ok')).toHaveLength(9);
    expect(hits.filter((p) => p.label === 'bad').map((p) => p.id)).toEqual([27, 28]);
  });
  it('does nothing when off', () => {
    expect(PROMPTS.some((p) => ruleHit(p.text, 'off'))).toBe(false);
  });
});

describe('decide', () => {
  it('blocks at or above the threshold', () => {
    const p = byId(13); // score 0.31
    expect(decide(p, { ...off, threshold: 0.31 }).blocked).toBe(true);
    expect(decide(p, { ...off, threshold: 0.32 }).blocked).toBe(false);
  });
  it('a rule hit short-circuits the classifier', () => {
    const d = decide(byId(27), { rules: 'phrase', threshold: 1, judge: false });
    expect(d).toMatchObject({ blocked: true, by: 'rule', ms: LATENCY.rule });
  });
  it('asks the judge only in the band just under the threshold', () => {
    const cfg: Config = { rules: 'off', threshold: 0.7, judge: true };
    const inBand = decide(byId(33), cfg); // score 0.62, bad, judge wrongly says ok
    expect(inBand.askedJudge).toBe(true);
    expect(inBand.blocked).toBe(false);
    expect(inBand.ms).toBe(LATENCY.classifier + LATENCY.judge);
    const below = decide(byId(37), cfg); // score 0.33, well under 0.7 - 0.2
    expect(below.askedJudge).toBe(false);
    const edge = decide(byId(35), { ...cfg, threshold: 0.61 }); // 0.41 = 0.61 - JUDGE_BAND
    expect(JUDGE_BAND).toBe(0.2);
    expect(edge.askedJudge).toBe(true);
    expect(edge.blocked).toBe(true);
  });
  it('the judge can block a benign prompt it gets wrong', () => {
    const d = decide(byId(15), { rules: 'off', threshold: 0.7, judge: true });
    expect(d).toMatchObject({ blocked: true, by: 'judge' });
  });
});

describe('statistics', () => {
  it('Wilson interval for 9 of 14 caught', () => {
    const [lo, hi] = wilson(9, 14);
    expect(lo).toBeCloseTo(0.3876, 3);
    expect(hi).toBeCloseTo(0.8366, 3);
  });
  it('Wilson interval is wide at the extremes and never leaves 0..1', () => {
    const [lo0, hi0] = wilson(0, 14);
    expect(lo0).toBe(0);
    expect(hi0).toBeCloseTo(0.2153, 3);
    expect(wilson(14, 14)[1]).toBe(1);
    expect(wilson(0, 0)).toEqual([0, 1]);
  });
  it('counts blocked benign and caught bad at threshold 0.5 with no other layer', () => {
    const c = counts(decideAll(off));
    expect(c).toMatchObject({ blockedPlain: 0, blockedBait: 5, caught: 9 });
  });
});

describe('traffic arithmetic', () => {
  it('worked example: 95% recall, 2% false-positive rate, 1% bad, 100,000 requests', () => {
    const s = blockStatsFromRates(0.95, 0.02, 100000, 0.01);
    expect(s.badTotal).toBeCloseTo(1000, 6);
    expect(s.caught).toBeCloseTo(950, 6);
    expect(s.missed).toBeCloseTo(50, 6);
    expect(s.benignTotal).toBeCloseTo(99000, 6);
    expect(s.falseBlocks).toBeCloseTo(1980, 6);
    expect(s.precision).toBeCloseTo(950 / 2930, 6);
    expect(s.precision).toBeCloseTo(0.3242, 3);
  });
  it('worked example: cut the false-positive rate to 0.2%', () => {
    const s = blockStatsFromRates(0.95, 0.002, 100000, 0.01);
    expect(s.falseBlocks).toBeCloseTo(198, 6);
    expect(s.precision).toBeCloseTo(950 / 1148, 6);
  });
  it('worked example: the same checker when 10% of traffic is bad', () => {
    const s = blockStatsFromRates(0.95, 0.02, 100000, 0.1);
    expect(s.caught).toBeCloseTo(9500, 6);
    expect(s.falseBlocks).toBeCloseTo(1800, 6);
    expect(s.precision).toBeCloseTo(9500 / 11300, 6);
  });
  it('weights classes by traffic mix and the weights add to 1', () => {
    const c = counts(decideAll(off));
    const total = PROMPTS.reduce((s, p) => s + itemWeight(p, c, traffic), 0);
    expect(total).toBeCloseTo(1, 9);
  });
  it('traffic stats at threshold 0.5: 64% recall and about 2.1% of benign blocked', () => {
    const s = trafficStats(decideAll(off), traffic);
    expect(s.recall).toBeCloseTo(9 / 14, 9);
    expect(s.fpr).toBeCloseTo(0.05 * (5 / 12), 9);
    expect(s.falseBlocks).toBeCloseTo(9900 * 0.05 * (5 / 12), 6);
    expect(s.caught).toBeCloseTo(100 * (9 / 14), 6);
  });
  it('total cost weighs a missed bad request by the ratio', () => {
    const s = blockStatsFromRates(0.5, 0.01, 10000, 0.01);
    expect(totalCost(s, 20)).toBeCloseTo(99 + 50 * 20, 6);
  });
});

describe('latency', () => {
  it('weighted quantile picks the value where the weight reaches q', () => {
    const v = [
      { v: 10, w: 0.9 },
      { v: 100, w: 0.1 },
    ];
    expect(weightedQuantile(v, 0.5)).toBe(10);
    expect(weightedQuantile(v, 0.95)).toBe(100);
    expect(weightedQuantile([], 0.95)).toBe(0);
  });
  it('without a judge every request costs one classifier call', () => {
    const l = latencySummary(decideAll(off), traffic);
    expect(l.mean).toBeCloseTo(LATENCY.classifier, 6);
    expect(l.p95).toBe(LATENCY.classifier);
    expect(l.judgeShare).toBe(0);
  });
  it('p95 jumps to the judge path once at least 5% of requests reach it', () => {
    const cfg: Config = { rules: 'off', threshold: 0.4, judge: true };
    const l = latencySummary(decideAll(cfg), traffic);
    expect(l.judgeShare).toBeGreaterThan(0.05);
    expect(l.p95).toBe(LATENCY.classifier + LATENCY.judge);
    const small = latencySummary(decideAll({ ...cfg, threshold: 0.8 }), traffic);
    expect(small.judgeShare).toBeLessThan(0.05);
    expect(small.p95).toBe(LATENCY.classifier);
  });
});

describe('sweep', () => {
  it('covers 0.05 to 1.00 in steps of 0.05', () => {
    expect(THRESHOLDS).toHaveLength(20);
    expect(THRESHOLDS[0]).toBe(0.05);
    expect(THRESHOLDS[19]).toBe(1);
  });
  it('with 1% bad traffic and a missed bad costing 20 false blocks, the best classifier-only threshold is the lowest that still catches everything', () => {
    const { best } = sweep({ rules: 'off', judge: false }, traffic, 20);
    expect(best.threshold).toBe(0.3);
    expect(best.recall).toBe(1);
  });
  it('a second-look judge lowers the best cost', () => {
    const a = sweep({ rules: 'off', judge: false }, traffic, 20).best;
    const b = sweep({ rules: 'off', judge: true }, traffic, 20).best;
    expect(b.cost).toBeLessThan(a.cost);
    expect(b.threshold).toBe(0.45);
  });
  it('when bad traffic is very rare and misses are cheap, the best move is to block only the clear cases', () => {
    const { best } = sweep({ rules: 'off', judge: false }, { ...traffic, prevalence: 0.001 }, 5);
    expect(best.threshold).toBe(0.7);
    expect(best.fpr).toBe(0);
  });
});
