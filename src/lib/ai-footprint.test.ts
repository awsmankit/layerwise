import { describe, expect, it } from 'vitest';
import {
  GALLON_ML,
  GRID,
  KETTLE_WH,
  KINDS,
  WATER_ML_PER_WH,
  footprint,
  fmtNum,
  geoMid,
  impliedGramsPerKwh,
  kettleBoils,
  ledHours,
  mlPerWh,
  phoneCharges,
  range,
  requestsToMatch,
  shareOfUsHome,
  training,
} from './ai-footprint';

describe('ranges', () => {
  it('takes the geometric midpoint', () => {
    expect(geoMid(0.1, 10)).toBeCloseTo(1, 10);
    expect(range(4, 9).mid).toBeCloseTo(6, 10);
  });
  it('keeps every preset range ordered and positive', () => {
    for (const k of KINDS) {
      expect(k.wh[0]).toBeGreaterThan(0);
      expect(k.wh[1]).toBeGreaterThan(k.wh[0]);
      expect(k.source.length).toBeGreaterThan(10);
    }
    expect(GRID.low).toBeLessThan(GRID.mid);
    expect(GRID.mid).toBeLessThan(GRID.high);
  });
});

describe('footprint', () => {
  it('scales a range of energy per request to a day and a year', () => {
    const f = footprint({ requestsPerDay: 100, wh: [0.1, 1] });
    expect(f.whPerDay.low).toBeCloseTo(10, 10);
    expect(f.whPerDay.high).toBeCloseTo(100, 10);
    expect(f.kwhPerYear.low).toBeCloseTo(3.65, 10);
    expect(f.kwhPerYear.high).toBeCloseTo(36.5, 10);
    expect(f.kwhPerYear.mid).toBeCloseTo(Math.sqrt(3.65 * 36.5), 10);
  });
  it('multiplies the low ends together and the high ends together for carbon', () => {
    const f = footprint({ requestsPerDay: 100, wh: [0.1, 1] });
    expect(f.kgCo2PerYear.low).toBeCloseTo((3.65 * 12) / 1000, 10);
    expect(f.kgCo2PerYear.high).toBeCloseTo((36.5 * 820) / 1000, 10);
    expect(f.kgCo2PerYear.mid).toBeCloseTo((Math.sqrt(3.65 * 36.5) * 458) / 1000, 10);
  });
  it('turns on-site cooling water into litres per year', () => {
    const f = footprint({ requestsPerDay: 100, wh: [0.1, 1] });
    expect(f.litresWaterPerYear.low).toBeCloseTo(3.65 * 0.9, 10);
    expect(f.litresWaterPerYear.high).toBeCloseTo(36.5 * 1.1, 10);
  });
  it('is zero for zero requests', () => {
    const f = footprint({ requestsPerDay: 0, wh: [0.05, 1] });
    expect(f.kwhPerYear.high).toBe(0);
    expect(f.kgCo2PerYear.high).toBe(0);
  });
  it('is linear in the number of requests', () => {
    const a = footprint({ requestsPerDay: 10, wh: [0.05, 1] });
    const b = footprint({ requestsPerDay: 1000, wh: [0.05, 1] });
    expect(b.kwhPerYear.high / a.kwhPerYear.high).toBeCloseTo(100, 8);
  });
});

describe('checks against the sources', () => {
  it('derives the water per watt-hour range from the two 2025 disclosures', () => {
    expect(mlPerWh(0.26, 0.24)).toBeCloseTo(1.083, 3);
    // 0.000085 US gallons at 0.34 Wh
    expect(mlPerWh(0.000085 * GALLON_ML, 0.34)).toBeCloseTo(0.946, 3);
    expect(WATER_ML_PER_WH[0]).toBeLessThan(0.95);
    expect(WATER_ML_PER_WH[1]).toBeGreaterThan(1.08);
  });
  it('reproduces the reasoning ratios in AI Energy Score v2', () => {
    expect(7626.53 / 49.53).toBeCloseTo(154, 0);
    expect(9461.61 / 18.42).toBeCloseTo(514, 0);
    expect(12791.22 / 18.35).toBeCloseTo(697, 0);
  });
  it('reproduces the BLOOM numbers', () => {
    // 433,196 kWh at 57 g per kWh is 24.69 tonnes (Luccioni, Viguier and Ligozat, 2022)
    expect((433196 * 57) / 1e6).toBeCloseTo(24.69, 2);
    // the API instance: 914 kWh over 230,768 requests, in watt-hours per request
    expect((914 * 1000) / 230768).toBeCloseTo(3.96, 2);
  });
  it('turns the Llama 3.1 405B model card into energy and an implied grid intensity', () => {
    const t = training({ gpuHours: 30.84e6, wattsPerGpu: 700, overhead: 1, gridGPerKwh: 414 });
    expect(t.itMwh).toBeCloseTo(21588, 6);
    expect(t.tonnes).toBeCloseTo(8937.4, 1);
    expect(impliedGramsPerKwh(8930, 21588)).toBeCloseTo(413.7, 1);
    // the three models add to the 39.3 million GPU hours and 11,390 tonnes reported
    expect(1.46 + 7.0 + 30.84).toBeCloseTo(39.3, 2);
    expect(420 + 2040 + 8930).toBe(11390);
  });
  it('shows how many requests it takes to match a training run', () => {
    expect(requestsToMatch(21588, 0.3)).toBeCloseTo(7.196e10, -7);
    expect(requestsToMatch(1, 1)).toBe(1e6);
  });
});

describe('everyday comparisons', () => {
  it('heats a litre of water from 20 C to 100 C with about 93 Wh', () => {
    expect(KETTLE_WH).toBeCloseTo(93.02, 2);
    expect(kettleBoils(93.02)).toBeCloseTo(1, 3);
  });
  it('compares to a 10 W bulb, a phone charge and a US home', () => {
    expect(ledHours(1)).toBeCloseTo(0.1, 10);
    expect(phoneCharges(22)).toBe(1);
    expect(shareOfUsHome(105)).toBeCloseTo(0.01, 10);
  });
});

describe('fmtNum', () => {
  it('formats small and large numbers', () => {
    expect(fmtNum(0)).toBe('0');
    expect(fmtNum(0.0023)).toBe('0.0023');
    expect(fmtNum(0.05)).toBe('0.05');
    expect(fmtNum(1.5)).toBe('1.5');
    expect(fmtNum(12.34)).toBe('12.3');
    expect(fmtNum(250)).toBe('250');
    expect(fmtNum(7.2e10)).toBe('72 billion');
    expect(fmtNum(21588)).toBe('21,588');
    expect(fmtNum(4.3e11)).toBe('430 billion');
    expect(fmtNum(2.2e10)).toBe('22 billion');
  });
});
