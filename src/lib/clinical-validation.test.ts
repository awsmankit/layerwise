import { describe, expect, it } from 'vitest';
import {
  CLINICS,
  GROUPS,
  N,
  Phi,
  RISK_CUTS,
  calibrationTable,
  confusion,
  priorShift,
  risk,
  scoreForRisk,
} from './clinical-validation';

// Reference values below were computed independently with Python's math.erf.
const A = CLINICS[0].prevalence;
const B = CLINICS[1].prevalence;

describe('normal distribution', () => {
  it('matches known values', () => {
    expect(Phi(0)).toBeCloseTo(0.5, 6);
    expect(Phi(1.96)).toBeCloseTo(0.9750021, 5);
    expect(Phi(-1)).toBeCloseTo(0.1586553, 5);
    expect(Phi(-Infinity)).toBe(0);
    expect(Phi(Infinity)).toBe(1);
  });
});

describe('risk', () => {
  it('rises with the score, from near 0 to near 1', () => {
    expect(risk(1)).toBeGreaterThan(risk(0));
    expect(risk(-6)).toBeLessThan(0.001);
    expect(risk(8)).toBeGreaterThan(0.99);
  });
  it('can be inverted', () => {
    const s = scoreForRisk(0.3);
    expect(s).toBeCloseTo(1.346533, 4);
    expect(risk(s)).toBeCloseTo(0.3, 6);
  });
});

describe('sensitivity and specificity do not depend on prevalence; predictive values do', () => {
  const t = scoreForRisk(0.3);
  const a = confusion(A, t);
  const b = confusion(B, t);
  it('has the same sensitivity and specificity at both clinics', () => {
    expect(a.sensitivity).toBeCloseTo(0.777769, 5);
    expect(a.specificity).toBeCloseTo(0.910935, 5);
    expect(b.sensitivity).toBeCloseTo(a.sensitivity, 12);
    expect(b.specificity).toBeCloseTo(a.specificity, 12);
  });
  it('counts patients per 10,000', () => {
    expect(a.tp).toBeCloseTo(1555.54, 1);
    expect(a.fn).toBeCloseTo(444.46, 1);
    expect(a.fp).toBeCloseTo(712.52, 1);
    expect(a.tn).toBeCloseTo(7287.48, 1);
    expect(a.tp + a.fn + a.fp + a.tn).toBeCloseTo(N, 8);
    expect(b.tp).toBeCloseTo(155.55, 1);
    expect(b.fp).toBeCloseTo(872.84, 1);
  });
  it('has very different predictive values', () => {
    expect(a.ppv).toBeCloseTo(0.68585, 4);
    expect(a.npv).toBeCloseTo(0.94252, 4);
    expect(b.ppv).toBeCloseTo(0.15126, 4);
    expect(b.npv).toBeCloseTo(0.99505, 4);
  });
  it('matches the textbook formula for PPV from sensitivity, specificity and prevalence', () => {
    const { sensitivity: se, specificity: sp } = b;
    expect(b.ppv).toBeCloseTo((B * se) / (B * se + (1 - B) * (1 - sp)), 10);
  });
});

describe('subgroups', () => {
  const t = scoreForRisk(0.3);
  const g1 = confusion(A, t, GROUPS[0]);
  const g2 = confusion(A, t, GROUPS[1]);
  const all = confusion(A, t);
  it('shows a gap the overall number hides', () => {
    expect(g1.sensitivity).toBeCloseTo(0.853936, 5);
    expect(g2.sensitivity).toBeCloseTo(0.600046, 5);
    expect(all.sensitivity).toBeGreaterThan(g2.sensitivity);
    expect(all.sensitivity).toBeLessThan(g1.sensitivity);
  });
  it('splits the patients by share and adds back to the total', () => {
    expect(g1.n).toBeCloseTo(7000, 8);
    expect(g2.n).toBeCloseTo(3000, 8);
    expect(g1.tp + g2.tp).toBeCloseTo(all.tp, 8);
    expect(g1.fn + g2.fn).toBeCloseTo(all.fn, 8);
    expect(g1.fp + g2.fp).toBeCloseTo(all.fp, 8);
  });
});

describe('calibration', () => {
  it('is calibrated at the development clinic', () => {
    const rows = calibrationTable(A);
    expect(rows).toHaveLength(RISK_CUTS.length + 1);
    for (const r of rows) expect(r.predicted).toBeCloseTo(r.observed, 3);
    expect(rows[0].share).toBeCloseTo(0.4987, 3);
    expect(rows[2].observed).toBeCloseTo(0.3257, 3);
    expect(rows.reduce((a, r) => a + r.share, 0)).toBeCloseTo(1, 8);
  });
  it('overstates risk at a clinic with lower prevalence', () => {
    const rows = calibrationTable(B);
    expect(rows[2].predicted).toBeCloseTo(0.316, 3);
    expect(rows[2].observed).toBeCloseTo(0.0379, 3);
    expect(rows[4].predicted).toBeCloseTo(0.9043, 3);
    expect(rows[4].observed).toBeCloseTo(0.5028, 3);
    expect(rows[0].share).toBeCloseTo(0.6017, 3);
  });
  it('is calibrated again after the prior-shift correction', () => {
    const shift = priorShift(A, B);
    expect(shift).toBeCloseTo(-2.5055, 3);
    for (const r of calibrationTable(B, shift)) expect(r.predicted).toBeCloseTo(r.observed, 3);
  });
});
