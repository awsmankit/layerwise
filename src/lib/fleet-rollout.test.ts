import { describe, expect, it } from 'vitest';
import {
  BASELINE,
  CLASSES,
  FLEET,
  SCENARIOS,
  analyse,
  binomUpperTail,
  deviceFailureRate,
  devicesToSeeFailures,
  falseHaltProb,
  haltCount,
  logGamma,
  makeRng,
  sampleBinomial,
  simulate,
  stageFractions,
  stageSizes,
  zeroFailureUpperBound,
  type Config,
} from './fleet-rollout';

const scenario = (id: string) => SCENARIOS.find((s) => s.id === id)!;
const base = (over: Partial<Config> = {}): Config => ({
  canary: 0.01,
  growth: 5,
  threshold: 0.02,
  reporting: 0.5,
  evenCanary: false,
  perClass: false,
  scenario: scenario('lowram'),
  ...over,
});

describe('the fleet', () => {
  it('has class shares that sum to one', () => {
    expect(CLASSES.reduce((s, c) => s + c.share, 0)).toBeCloseTo(1, 12);
  });
});

describe('stages', () => {
  it('grow by the factor and end at the whole fleet', () => {
    expect(stageFractions(0.01, 5)).toEqual([0.01, 0.05, 0.25, 1]);
    expect(stageFractions(0.01, 10)).toEqual([0.01, 0.1, 1]);
  });
  it('have sizes that add up to the fleet', () => {
    const sizes = stageSizes(stageFractions(0.01, 5));
    expect(sizes).toEqual([1000, 4000, 20000, 75000]);
    expect(sizes.reduce((a, b) => a + b, 0)).toBe(FLEET);
  });
});

describe('binomial helpers', () => {
  it('logGamma matches factorials', () => {
    expect(Math.exp(logGamma(6))).toBeCloseTo(120, 8);
    expect(Math.exp(logGamma(11))).toBeCloseTo(3628800, 4);
  });
  it('upper tail matches exact sums computed with rational arithmetic', () => {
    expect(binomUpperTail(10, 0.5, 8)).toBeCloseTo(0.0546875, 10);
    expect(binomUpperTail(5, 0.2, 1)).toBeCloseTo(0.67232, 10);
    expect(binomUpperTail(500, 0.02, 20)).toBeCloseTo(0.0031263426850115877, 9);
    expect(binomUpperTail(300, 0.03, 5)).toBeCloseTo(0.9475658680410778, 9);
    expect(binomUpperTail(2000, 0.005, 15)).toBeCloseTo(0.08293655044977552, 9);
  });
  it('handles the edges', () => {
    expect(binomUpperTail(10, 0.3, 0)).toBe(1);
    expect(binomUpperTail(10, 0.3, 11)).toBe(0);
    expect(binomUpperTail(10, 0, 1)).toBe(0);
  });
  it('sampling is seeded and centred on the mean', () => {
    expect(sampleBinomial(makeRng(3), 1000, 0.1)).toBe(sampleBinomial(makeRng(3), 1000, 0.1));
    const rng = makeRng(11);
    let total = 0;
    for (let i = 0; i < 400; i++) total += sampleBinomial(rng, 500, 0.04);
    expect(total / 400).toBeGreaterThan(19);
    expect(total / 400).toBeLessThan(21);
  });
});

describe('failure rates', () => {
  it('combine the background and the regression as independent causes', () => {
    expect(deviceFailureRate(false, 0.1)).toBe(BASELINE);
    expect(deviceFailureRate(true, 0.1)).toBeCloseTo(1 - 0.995 * 0.9, 12);
  });
  it('halt counts round up and are at least one', () => {
    expect(haltCount(0.02, 500)).toBe(10);
    expect(haltCount(0.02, 501)).toBe(11);
    expect(haltCount(0.02, 10)).toBe(1);
  });
});

describe('analysis', () => {
  it('first-stage numbers match a hand calculation', () => {
    const a = analyse(base());
    const s1 = a.rows[0];
    expect(s1.cohort).toBe(1000);
    expect(s1.observed).toBe(500);
    // rate = 0.85 * 0.005 + 0.15 * (1 - 0.995 * 0.9)
    expect(s1.rate).toBeCloseTo(0.85 * 0.005 + 0.15 * (1 - 0.995 * 0.9), 12);
    expect(s1.haltAt).toBe(10);
    expect(s1.haltProb).toBeCloseTo(binomUpperTail(500, s1.rate, 10), 12);
    expect(s1.reachProb).toBe(1);
  });
  it('exposure never exceeds the fleet and probabilities are consistent', () => {
    const a = analyse(base());
    expect(a.expectedExposed).toBeLessThanOrEqual(FLEET);
    expect(a.expectedExposed).toBeGreaterThanOrEqual(1000);
    expect(a.pFull + a.pHalt).toBeGreaterThan(0.999);
    const last = a.rows[a.rows.length - 1];
    expect(last.reachProb).toBeCloseTo(a.pFull, 12);
  });
  it('a stricter threshold exposes fewer devices to a real regression', () => {
    const loose = analyse(base({ threshold: 0.05 }));
    const strict = analyse(base({ threshold: 0.01 }));
    expect(strict.expectedExposed).toBeLessThan(loose.expectedExposed);
  });
  it('a bigger canary or an even canary exposes the rare class sooner', () => {
    const plain = analyse(base());
    const even = analyse(base({ evenCanary: true }));
    expect(even.rows[0].haltProb).toBeGreaterThan(plain.rows[0].haltProb);
  });
  it('a tiny canary with a strict rule false-halts healthy updates more than a generous rule', () => {
    const noisy = falseHaltProb(base({ threshold: 0.006, canary: 0.001 }));
    const calm = falseHaltProb(base({ threshold: 0.02 }));
    expect(noisy).toBeGreaterThan(calm);
    expect(calm).toBeLessThan(0.01);
  });
  it('the control scenario has no affected devices and no extra failures', () => {
    const a = analyse(base({ scenario: scenario('none') }));
    expect(a.expectedAffected).toBe(0);
    expect(a.expectedExtraFailures).toBe(0);
  });
});

describe('judging each device class separately', () => {
  it('catches a rare-class bug that a fleet-wide rate hides', () => {
    const rare = scenario('rare');
    const fleetWide = analyse(base({ scenario: rare, threshold: 0.015, canary: 0.05, growth: 2 }));
    const sliced = analyse(base({ scenario: rare, threshold: 0.015, canary: 0.05, growth: 2, perClass: true }));
    expect(sliced.pFull).toBeLessThan(fleetWide.pFull);
  });
  it('multiplies the chances that each class stays quiet', () => {
    const a = analyse(base({ perClass: true }));
    const s1 = a.rows[0];
    const stay = s1.classes.reduce((p, x) => p * (1 - x.haltProb), 1);
    expect(s1.haltProb).toBeCloseTo(1 - stay, 12);
    expect(s1.classes.reduce((n, x) => n + x.observed, 0)).toBeGreaterThanOrEqual(s1.observed - 2);
  });
  it('pays for it with more false alarms on a tiny canary', () => {
    const flat = falseHaltProb(base({ canary: 0.001, threshold: 0.015 }));
    const sliced = falseHaltProb(base({ canary: 0.001, threshold: 0.015, perClass: true }));
    expect(sliced).toBeGreaterThan(flat);
  });
  it('simulates deterministically and names the class that tripped the rule', () => {
    const c = base({ perClass: true, evenCanary: true });
    const r = simulate(c, 2);
    expect(r).toEqual(simulate(c, 2));
    const last = r.rows[r.rows.length - 1];
    if (last.halted) expect(last.haltedClass).not.toBeNull();
  });
});

describe('one simulated rollout', () => {
  it('is repeatable for a seed and stops at the first halt', () => {
    const a = simulate(base(), 5);
    const b = simulate(base(), 5);
    expect(a).toEqual(b);
    if (a.haltedAt !== null) expect(a.rows.length).toBe(a.haltedAt + 1);
    else expect(a.rows.length).toBe(stageFractions(0.01, 5).length);
  });
});

describe('rules of thumb', () => {
  it('devices needed to see ten failures from a 5 percent class with 2 percent failures', () => {
    expect(devicesToSeeFailures(10, 0.05, 0.02)).toBeCloseTo(10000, 6);
  });
  it('zero failures in n devices leaves an upper bound of about three over n', () => {
    expect(zeroFailureUpperBound(1000)).toBeCloseTo(0.002988, 5);
    expect(zeroFailureUpperBound(1000) * 1000).toBeGreaterThan(2.9);
    expect(zeroFailureUpperBound(1000) * 1000).toBeLessThan(3.1);
  });
});
