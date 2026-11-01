import { describe, expect, it } from 'vitest';
import { DEFAULTS, SCENARIOS, binomial, simulate, summarise, zStat, type Settings } from './rollout-sim';
import { casesPerGroup } from './serving-modes';
import { mulberry32 } from './data-prep';

const base = (o: Partial<Settings>): Settings => ({ ...DEFAULTS, ...o });

describe('zStat', () => {
  it('matches a hand calculation: 50/1000 against 70/1000', () => {
    // pooled = 120/2000 = 0.06; se = sqrt(0.06 x 0.94 x 2/1000); z = 0.02 / se = 1.883
    expect(zStat(1000, 50, 1000, 70)).toBeCloseTo(0.02 / Math.sqrt(0.06 * 0.94 * 0.002), 10);
    expect(zStat(1000, 50, 1000, 70)!).toBeCloseTo(1.8831, 3);
  });
  it('is null with no data and zero for equal rates', () => {
    expect(zStat(0, 0, 10, 1)).toBeNull();
    expect(zStat(100, 5, 100, 5)).toBe(0);
  });
});

describe('binomial', () => {
  it('has the right mean for small and large n', () => {
    const rand = mulberry32(5);
    let s = 0;
    for (let i = 0; i < 2000; i++) s += binomial(20, 0.3, rand);
    expect(s / 2000).toBeGreaterThan(5.7);
    expect(s / 2000).toBeLessThan(6.3);
    let t = 0;
    for (let i = 0; i < 2000; i++) t += binomial(1000, 0.05, rand);
    expect(t / 2000).toBeGreaterThan(49);
    expect(t / 2000).toBeLessThan(51);
  });
});

describe('simulate', () => {
  it('is deterministic for a seed', () => {
    expect(simulate(base({ seed: 4 }))).toEqual(simulate(base({ seed: 4 })));
  });

  it('a 5% canary catches a 3-point bug within hours and exposes few users (lesson figures)', () => {
    const s = summarise(base({ strategy: 'canary', scenario: 'bug', share: 0.05 }));
    expect(s.detectionRate).toBeGreaterThan(0.95);
    expect(s.medianHours).toBe(5);
    expect(s.medianServed).toBe(500);
  });

  it('a 5% canary finds a one-point drop in 99% of runs, median hour 35; a 1% canary in about half', () => {
    const a = summarise(base({ scenario: 'small', share: 0.05 }));
    expect(a.detectionRate).toBeCloseTo(0.99, 2);
    expect(a.medianHours).toBe(35);
    expect(a.medianServed).toBe(3600);
    const b = summarise(base({ scenario: 'small', share: 0.01 }));
    expect(b.detectionRate).toBeGreaterThan(0.4);
    expect(b.detectionRate).toBeLessThan(0.65);
  });

  it('shadow serves nobody, harms nobody, and cannot see a regression that only shows in user behaviour', () => {
    const r = simulate(base({ strategy: 'shadow', scenario: 'behaviour' }));
    expect(r.servedNew).toBe(0);
    expect(r.extraBad).toBe(0);
    expect(summarise(base({ strategy: 'shadow', scenario: 'behaviour' })).detectionRate).toBeLessThan(0.1);
    expect(summarise(base({ strategy: 'shadow', scenario: 'bug' })).detectionRate).toBeGreaterThan(0.95);
  });

  it('a canary does see the behavioural regression', () => {
    expect(summarise(base({ strategy: 'canary', scenario: 'behaviour', share: 0.1 })).detectionRate).toBeGreaterThan(0.9);
  });

  it('an A/B test only decides at the end, and exposes half of traffic for the whole period', () => {
    const r = simulate(base({ strategy: 'ab', scenario: 'bug', hours: 48 }));
    expect(r.haltHour).toBe(48);
    expect(r.servedNew).toBe(1000 * 48);
    expect(r.points.filter((p) => p.looked)).toHaveLength(1);
    expect(r.extraBad).toBeCloseTo(1000 * 48 * 0.03, 10);
    expect(simulate(base({ strategy: 'ab', scenario: 'small', hours: 72 })).servedNew).toBe(72000);
  });

  it('label delay postpones detection by about the delay', () => {
    const fast = summarise(base({ labelDelay: 0, share: 0.1 }));
    const slow = summarise(base({ labelDelay: 24, share: 0.1 }));
    expect(slow.medianHours! - fast.medianHours!).toBeGreaterThanOrEqual(24);
    expect(slow.medianExtraBad).toBeGreaterThan(fast.medianExtraBad);
  });

  it('with nothing wrong a strict threshold rarely halts, a lax one with hourly looks raises false alarms', () => {
    const strict = summarise(base({ scenario: 'none', zHalt: 3 }));
    const lax = summarise(base({ scenario: 'none', zHalt: 1.64 }));
    expect(strict.detectionRate).toBeLessThan(0.1);
    expect(lax.detectionRate).toBeGreaterThan(0.25);
  });

  it('a one-point regression is rarely caught by a small canary in a day', () => {
    const day = summarise(base({ scenario: 'small', share: 0.05, hours: 24 }));
    expect(day.detectionRate).toBeLessThan(0.5);
    const week = summarise(base({ scenario: 'small', share: 0.05, hours: 168 }));
    expect(week.detectionRate).toBeGreaterThan(day.detectionRate);
  });

  it('the scenario list has one row per id', () => {
    expect(new Set(SCENARIOS.map((x) => x.id)).size).toBe(SCENARIOS.length);
  });
});

describe('sample size for a rollout check (examples used in the lesson)', () => {
  it('bad-outcome rate 5% to 6%, 8% and 13%', () => {
    expect(casesPerGroup(0.05, 0.06)).toBe(8159);
    expect(casesPerGroup(0.05, 0.08)).toBe(1061);
    expect(casesPerGroup(0.05, 0.13)).toBe(201);
  });
});
