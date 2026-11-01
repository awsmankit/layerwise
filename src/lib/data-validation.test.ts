import { describe, expect, it } from 'vitest';
import { COUNTRIES, DAYS, DEFAULT_CONFIG, FAULTS, PRESETS, REF, RULES, dayStats, evaluate, failedRules, faultOn, generateStream, mulberry32, type Batch, type Config } from './data-validation';

const SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);

function cfgWith(patch: Partial<Record<keyof Config, Partial<Config[keyof Config]>>>): Config {
  const c = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as Config;
  for (const [k, v] of Object.entries(patch)) Object.assign(c[k as keyof Config], v);
  return c;
}

const healthy: Batch = {
  day: 1,
  rows: Array.from({ length: 100 }, (_, i) => ({ amount: 42, items: 1 + (i % 3), country: COUNTRIES[i % 4], deliveryDays: i % 50 === 0 ? null : 2 })),
};

describe('stream generation', () => {
  it('is deterministic for a seed and differs between seeds', () => {
    expect(generateStream(7)).toEqual(generateStream(7));
    expect(generateStream(7)).not.toEqual(generateStream(8));
  });

  it('has one batch per day, in order', () => {
    const s = generateStream(1);
    expect(s).toHaveLength(DAYS);
    expect(s.map((b) => b.day)).toEqual(Array.from({ length: DAYS }, (_, i) => i + 1));
  });

  it('plants faults in windows that do not overlap', () => {
    for (let d = 1; d <= DAYS; d++) expect(FAULTS.filter((f) => d >= f.start && d <= f.end).length).toBeLessThanOrEqual(1);
    expect(faultOn(12)?.id).toBe('units');
    expect(faultOn(14)).toBeUndefined();
  });

  it('writes the planted problems into the data', () => {
    const s = generateStream(7);
    expect(s[3].rows).toHaveLength(14); // outage
    expect(s[7].rows.some((r) => r.items === -1)).toBe(true);
    expect(s[11].rows.every((r) => r.amount > 100)).toBe(true); // pence
    expect(dayStats(s[15], 200).nullRate).toBeGreaterThan(0.2);
    expect(s[19].rows.some((r) => r.country === 'GB')).toBe(true);
    expect(dayStats(s[29], 200).meanAmount).toBeGreaterThan(REF.amountMean * 1.1);
    expect(dayStats(s[0], 200).meanAmount).toBeLessThan(REF.amountMean * 1.1);
  });

  it('has a seeded generator in [0, 1)', () => {
    const r = mulberry32(3);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('statistics and rules on hand-made batches', () => {
  it('measures a healthy batch', () => {
    const s = dayStats(healthy, 200);
    expect(s.rows).toBe(100);
    expect(s.meanAmount).toBe(42);
    expect(s.meanZ).toBe(0);
    expect(s.itemsOutShare).toBe(0);
    expect(s.nullRate).toBeCloseTo(0.02, 10);
    expect(s.unseenShare).toBe(0);
    expect(failedRules(healthy, DEFAULT_CONFIG)).toEqual([]);
  });

  it('computes the distance of the mean in standard errors', () => {
    const shifted: Batch = { day: 1, rows: healthy.rows.map((r) => ({ ...r, amount: 46.8 })) };
    // 100 rows: standard error is 12 / 10 = 1.2; shift is 4.8, so 4 standard errors
    expect(dayStats(shifted, 200).meanZ).toBeCloseTo(4, 10);
    expect(failedRules(shifted, cfgWith({ 'mean-amount': { threshold: 3.5 } }))).toEqual(['mean-amount']);
    expect(failedRules(shifted, cfgWith({ 'mean-amount': { threshold: 4.5 } }))).toEqual([]);
  });

  it('tolerates one bad row in a hundred but not two', () => {
    const one: Batch = { day: 1, rows: healthy.rows.map((r, i) => (i === 0 ? { ...r, items: -1 } : r)) };
    const two: Batch = { day: 1, rows: healthy.rows.map((r, i) => (i < 2 ? { ...r, items: -1 } : r)) };
    expect(failedRules(one, DEFAULT_CONFIG)).toEqual([]);
    expect(failedRules(two, DEFAULT_CONFIG)).toEqual(['range-items']);
  });

  it('respects the enabled flag', () => {
    const two: Batch = { day: 1, rows: healthy.rows.map((r, i) => (i < 2 ? { ...r, items: -1 } : r)) };
    expect(failedRules(two, cfgWith({ 'range-items': { enabled: false } }))).toEqual([]);
  });

  it('fails the row-count rule below the threshold only', () => {
    const small: Batch = { day: 1, rows: healthy.rows.slice(0, 59) };
    expect(failedRules(small, cfgWith({ rows: { threshold: 50 } }))).toContain('rows');
    expect(failedRules(small, cfgWith({ rows: { threshold: 40 } }))).not.toContain('rows');
  });

  it('describes every rule', () => {
    for (const r of RULES) expect(r.describe(DEFAULT_CONFIG[r.id].threshold).length).toBeGreaterThan(10);
  });
});

describe('evaluation over the stream', () => {
  it('the sensible preset catches every planted fault with at most one false alarm day on average', () => {
    let falseAlarms = 0;
    for (const seed of SEEDS) {
      const e = evaluate(generateStream(seed), PRESETS[0].config);
      expect(e.caught).toBe(FAULTS.length);
      falseAlarms += e.falseAlarmDays;
    }
    expect(falseAlarms / SEEDS.length).toBeLessThan(1);
  });

  it('no rules catch nothing and raise no alerts', () => {
    const none = PRESETS.find((p) => p.id === 'none')!;
    const e = evaluate(generateStream(7), none.config);
    expect(e.caught).toBe(0);
    expect(e.falseAlarmDays).toBe(0);
  });

  it('thresholds that are too loose miss real faults', () => {
    const loose = PRESETS.find((p) => p.id === 'loose')!;
    for (const seed of SEEDS) expect(evaluate(generateStream(seed), loose.config).caught).toBeLessThan(FAULTS.length - 1);
  });

  it('thresholds that are too tight raise many false alarms', () => {
    const tight = PRESETS.find((p) => p.id === 'tight')!;
    let total = 0;
    for (const seed of SEEDS) total += evaluate(generateStream(seed), tight.config).falseAlarmDays;
    expect(total / SEEDS.length).toBeGreaterThan(5);
  });

  it('a rule that only checks values misses the slow drift; the mean rule finds it', () => {
    const schema = PRESETS.find((p) => p.id === 'schema')!;
    const e = evaluate(generateStream(7), schema.config);
    expect(e.perFault.find((f) => f.fault.id === 'drift')!.caught).toBe(false);
    const withMean = evaluate(generateStream(7), DEFAULT_CONFIG);
    const drift = withMean.perFault.find((f) => f.fault.id === 'drift')!;
    expect(drift.caught).toBe(true);
    expect(drift.by).toEqual(['mean-amount']);
    expect(drift.delay).toBeGreaterThan(0); // slow drift is not caught on its first day
  });

  it('a very high mean threshold lets the slow drift through', () => {
    const e = evaluate(generateStream(7), cfgWith({ 'mean-amount': { threshold: 10 } }));
    expect(e.perFault.find((f) => f.fault.id === 'drift')!.caught).toBe(false);
  });

  it('a lower mean threshold catches the drift sooner and raises more false alarms', () => {
    let lowFa = 0;
    let highFa = 0;
    let lowDelay = 0;
    let highDelay = 0;
    for (const seed of SEEDS) {
      const lo = evaluate(generateStream(seed), cfgWith({ 'mean-amount': { threshold: 2 } }));
      const hi = evaluate(generateStream(seed), cfgWith({ 'mean-amount': { threshold: 5 } }));
      lowFa += lo.falseAlarmDays;
      highFa += hi.falseAlarmDays;
      lowDelay += lo.perFault.find((f) => f.fault.id === 'drift')!.delay ?? 99;
      highDelay += hi.perFault.find((f) => f.fault.id === 'drift')!.delay ?? 99;
    }
    expect(lowFa).toBeGreaterThan(highFa);
    expect(lowDelay).toBeLessThan(highDelay);
  });

  it('counts clean days as the days with no fault', () => {
    const e = evaluate(generateStream(7), DEFAULT_CONFIG);
    const faultDays = FAULTS.reduce((a, f) => a + (f.end - f.start + 1), 0);
    expect(e.cleanDays).toBe(DAYS - faultDays);
  });
});

describe('numbers quoted in the lesson (30 random months, other rules at their defaults)', () => {
  function sweep(k: number) {
    let falseAlarms = 0;
    let caught = 0;
    let delay = 0;
    for (const seed of SEEDS) {
      const e = evaluate(generateStream(seed), cfgWith({ 'mean-amount': { threshold: k } }));
      falseAlarms += e.falseAlarmDays;
      const d = e.perFault.find((f) => f.fault.id === 'drift')!;
      if (d.caught) {
        caught += 1;
        delay += d.delay!;
      }
    }
    return { fa: falseAlarms / SEEDS.length, caught, delay: caught ? delay / caught : NaN };
  }

  it('2 standard errors: about 2.3 false alarm days, drift always caught, about 0.7 days in', () => {
    const r = sweep(2);
    expect(r.fa).toBeCloseTo(2.3, 1);
    expect(r.caught).toBe(30);
    expect(r.delay).toBeCloseTo(0.7, 1);
  });
  it('4 standard errors: about 0.1 false alarm days, always caught, about 2.5 days in', () => {
    const r = sweep(4);
    expect(r.fa).toBeCloseTo(0.1, 1);
    expect(r.caught).toBe(30);
    expect(r.delay).toBeCloseTo(2.5, 1);
  });
  it('10 standard errors: no false alarms, drift caught in only 3 of 30 months', () => {
    const r = sweep(10);
    expect(r.fa).toBe(0);
    expect(r.caught).toBe(3);
  });
});
