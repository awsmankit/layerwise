import { describe, expect, it } from 'vitest';
import { cohenKappa, kappa2x2, readKappa, tableFromLabels } from './kappa';

/*
 * Worked by hand (50 answers, two labellers, pass or fail):
 *   both pass 20, A pass / B fail 5, A fail / B pass 10, both fail 15
 *   p_o = (20 + 15) / 50 = 0.70
 *   A passes 25 of 50 = 0.5, B passes 30 of 50 = 0.6
 *   p_e = 0.5 * 0.6 + 0.5 * 0.4 = 0.30 + 0.20 = 0.50
 *   kappa = (0.70 - 0.50) / (1 - 0.50) = 0.40
 */
describe('cohenKappa, hand-computed 2x2', () => {
  it('matches 0.40 for the 50-answer table', () => {
    const r = kappa2x2(20, 5, 10, 15);
    expect(r.n).toBe(50);
    expect(r.po).toBeCloseTo(0.7, 12);
    expect(r.pe).toBeCloseTo(0.5, 12);
    expect(r.kappa).toBeCloseTo(0.4, 12);
  });

  /*
   * 90% agreement but a rare "fail": both pass 85, A pass / B fail 5, A fail / B pass 5, both fail 5.
   *   p_o = 90 / 100 = 0.90; A passes 90, B passes 90
   *   p_e = 0.9 * 0.9 + 0.1 * 0.1 = 0.82
   *   kappa = (0.90 - 0.82) / 0.18 = 0.4444...
   */
  it('is low when agreement is high but one label is rare', () => {
    const r = kappa2x2(85, 5, 5, 5);
    expect(r.po).toBeCloseTo(0.9, 12);
    expect(r.pe).toBeCloseTo(0.82, 12);
    expect(r.kappa).toBeCloseTo(0.08 / 0.18, 12);
  });

  it('is 1 for perfect agreement and 0 when agreement equals chance', () => {
    expect(kappa2x2(30, 0, 0, 20).kappa).toBeCloseTo(1, 12);
    // A passes 50%, B passes 50%, independent: 25 / 25 / 25 / 25 gives p_o = 0.5 = p_e
    expect(kappa2x2(25, 25, 25, 25).kappa).toBeCloseTo(0, 12);
  });

  it('is negative when they systematically disagree', () => {
    expect(kappa2x2(0, 10, 10, 0).kappa).toBeCloseTo(-1, 12);
  });

  it('is undefined (NaN) when everything is in one category', () => {
    expect(Number.isNaN(kappa2x2(40, 0, 0, 0).kappa)).toBe(true);
    expect(Number.isNaN(cohenKappa([[0, 0], [0, 0]]).kappa)).toBe(true);
  });

  it('is symmetric when the labellers swap', () => {
    expect(kappa2x2(20, 5, 10, 15).kappa).toBeCloseTo(kappa2x2(20, 10, 5, 15).kappa, 12);
  });
});

/*
 * Three categories, 60 items:
 *   [[20, 5, 0], [3, 15, 2], [1, 4, 10]]
 *   p_o = (20 + 15 + 10) / 60 = 0.75
 *   rows 25, 20, 15; columns 24, 24, 12
 *   p_e = (25*24 + 20*24 + 15*12) / 60^2 = (600 + 480 + 180) / 3600 = 0.35
 *   kappa = (0.75 - 0.35) / 0.65 = 0.6153846...
 */
describe('cohenKappa, three categories', () => {
  it('matches the hand calculation', () => {
    const r = cohenKappa([
      [20, 5, 0],
      [3, 15, 2],
      [1, 4, 10],
    ]);
    expect(r.n).toBe(60);
    expect(r.rowTotals).toEqual([25, 20, 15]);
    expect(r.colTotals).toEqual([24, 24, 12]);
    expect(r.po).toBeCloseTo(0.75, 12);
    expect(r.pe).toBeCloseTo(0.35, 12);
    expect(r.kappa).toBeCloseTo(0.4 / 0.65, 12);
  });
});

describe('tableFromLabels', () => {
  it('counts pairs and agrees with the table calculation', () => {
    const a = ['pass', 'pass', 'fail', 'fail', 'pass'] as const;
    const b = ['pass', 'fail', 'fail', 'pass', 'pass'] as const;
    const t = tableFromLabels(a, b, ['pass', 'fail']);
    expect(t).toEqual([
      [2, 1],
      [1, 1],
    ]);
    // p_o = 3/5, A passes 3/5, B passes 3/5, p_e = 0.36 + 0.16 = 0.52, kappa = 0.08 / 0.48
    expect(cohenKappa(t).kappa).toBeCloseTo(0.08 / 0.48, 12);
  });
  it('ignores unknown labels', () => {
    expect(tableFromLabels(['x', 'a'], ['a', 'a'], ['a', 'b'])).toEqual([
      [1, 0],
      [0, 0],
    ]);
  });
});

describe('readKappa', () => {
  it('gives a band for each range', () => {
    expect(readKappa(0.4)).toBe('Fair.');
    expect(readKappa(0.44)).toBe('Moderate.');
    expect(readKappa(0.9)).toBe('Almost perfect.');
    expect(readKappa(-0.2)).toMatch(/Worse than chance/);
    expect(readKappa(NaN)).toMatch(/Not defined/);
  });
});
