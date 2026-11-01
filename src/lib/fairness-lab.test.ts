import { describe, expect, it } from 'vitest';
import {
  GROUPS,
  START,
  bestThresholds,
  calibrationGap,
  confusionAt,
  evaluate,
  fprFromPpv,
  matchThreshold,
  metricsFromConfusion,
  overallAccuracy,
} from './fairness-lab';

describe('metrics from a confusion table (hand-computed)', () => {
  // 200 people: 60 repay, 140 do not. 50 approved, of whom 40 repay.
  const c = { tp: 40, fp: 10, fn: 20, tn: 130 };
  const m = metricsFromConfusion(c);

  it('selection rate is approved over everybody: 50 / 200', () => {
    expect(m.selectionRate).toBeCloseTo(0.25, 10);
  });
  it('true positive rate is 40 / 60 and false positive rate is 10 / 140', () => {
    expect(m.tpr).toBeCloseTo(2 / 3, 10);
    expect(m.fpr).toBeCloseTo(1 / 14, 10);
  });
  it('precision is 40 / 50, accuracy is 170 / 200, base rate is 60 / 200', () => {
    expect(m.ppv).toBeCloseTo(0.8, 10);
    expect(m.accuracy).toBeCloseTo(0.85, 10);
    expect(m.baseRate).toBeCloseTo(0.3, 10);
  });
  it('precision is undefined, not zero, when nobody is approved', () => {
    expect(metricsFromConfusion({ tp: 0, fp: 0, fn: 5, tn: 5 }).ppv).toBeNull();
  });
});

describe('the invented groups', () => {
  it('have the intended sizes and base rates', () => {
    expect(GROUPS.A.total).toBe(2400);
    expect(GROUPS.B.total).toBe(1600);
    expect(GROUPS.A.positives).toBe(1404);
    expect(GROUPS.B.positives).toBe(542);
    expect(GROUPS.A.positives / GROUPS.A.total).toBeCloseTo(0.585, 10);
    expect(GROUPS.B.positives / GROUPS.B.total).toBeCloseTo(0.33875, 10);
  });

  it('are exactly calibrated: in every band the repay share equals the band midpoint', () => {
    for (const g of [GROUPS.A, GROUPS.B]) {
      for (const b of g.bands) expect(b.total === 0 || Math.abs(b.positives / b.total - b.mid) < 1e-12).toBe(true);
      expect(calibrationGap(g)).toBeLessThan(1e-12);
    }
  });

  it('have whole-number counts in every band', () => {
    for (const g of [GROUPS.A, GROUPS.B]) {
      for (const b of g.bands) {
        expect(Number.isInteger(b.total)).toBe(true);
        expect(Number.isInteger(b.positives)).toBe(true);
      }
    }
  });
});

describe('confusion tables at one threshold (hand-computed from the band counts)', () => {
  it('group A at 0.50 (k = 10)', () => {
    expect(confusionAt(GROUPS.A, 10)).toEqual({ tp: 1203, fp: 357, fn: 201, tn: 639 });
  });
  it('group B at 0.50 (k = 10)', () => {
    expect(confusionAt(GROUPS.B, 10)).toEqual({ tp: 339, fp: 101, fn: 203, tn: 957 });
  });
  it('group B at 0.15 (k = 3) approves far more people', () => {
    const c = confusionAt(GROUPS.B, 3);
    expect(c.tp + c.fp).toBe(1600 - 6 * 40 - 5 * 40 - 4 * 40); // everyone except the three lowest bands
    expect(c.tp + c.fp + c.fn + c.tn).toBe(1600);
  });
  it('threshold 0 approves everyone and threshold 20 approves nobody', () => {
    expect(confusionAt(GROUPS.A, 0)).toEqual({ tp: 1404, fp: 996, fn: 0, tn: 0 });
    expect(confusionAt(GROUPS.A, 20)).toEqual({ tp: 0, fp: 0, fn: 1404, tn: 996 });
  });
  it('every table adds up to the group size', () => {
    for (let k = 0; k <= 20; k++) {
      const c = confusionAt(GROUPS.A, k);
      expect(c.tp + c.fp + c.fn + c.tn).toBe(GROUPS.A.total);
    }
  });
});

describe('one common threshold of 0.50', () => {
  const r = evaluate(START, 0.02);
  const byId = Object.fromEntries(r.criteria.map((c) => [c.id, c]));

  it('gives the hand-computed rates for each group', () => {
    expect(r.a.metrics.selectionRate).toBeCloseTo(0.65, 10);
    expect(r.b.metrics.selectionRate).toBeCloseTo(0.275, 10);
    expect(r.a.metrics.tpr).toBeCloseTo(1203 / 1404, 10);
    expect(r.b.metrics.tpr).toBeCloseTo(339 / 542, 10);
    expect(r.a.metrics.ppv).toBeCloseTo(1203 / 1560, 10);
    expect(r.b.metrics.ppv).toBeCloseTo(339 / 440, 10);
  });

  it('keeps calibration and (almost) predictive parity, and breaks the approval-rate and error-rate criteria', () => {
    expect(byId.calibration.holds).toBe(true);
    expect(byId.predictive.holds).toBe(true);
    expect(byId.predictive.gap!).toBeLessThan(0.001);
    expect(byId.demographic.holds).toBe(false);
    expect(byId.opportunity.holds).toBe(false);
    expect(byId.odds.holds).toBe(false);
  });

  it('is the best choice of thresholds, so it costs nothing', () => {
    expect(bestThresholds()).toEqual({ kA: 10, kB: 10, correct: 3138 });
    expect(r.extraWrong).toBe(0);
    expect(r.accuracy).toBeCloseTo(3138 / 4000, 10);
    expect(r.wrong).toBe(862);
  });
});

describe('matching a rate by moving the threshold for group B', () => {
  it('matching approval rates needs a much lower bar for B (k = 3), and costs 236 more wrong decisions', () => {
    const kB = matchThreshold(10, 'demographic');
    expect(kB).toBe(3);
    const r = evaluate({ kA: 10, kB }, 0.02);
    expect(overallAccuracy(10, kB).correct).toBe(2902);
    expect(r.extraWrong).toBe(236);
    // and precision for B collapses to about 50%, so predictive parity breaks
    expect(r.b.metrics.ppv!).toBeCloseTo(0.501, 3);
    expect(r.criteria.find((c) => c.id === 'predictive')!.holds).toBe(false);
  });

  it('matching true positive rates needs k = 5 for B, and breaks predictive parity', () => {
    const kB = matchThreshold(10, 'opportunity');
    expect(kB).toBe(5);
    const r = evaluate({ kA: 10, kB }, 0.05);
    expect(r.criteria.find((c) => c.id === 'opportunity')!.holds).toBe(true);
    expect(r.criteria.find((c) => c.id === 'predictive')!.holds).toBe(false);
    expect(overallAccuracy(10, kB).correct).toBe(3046);
  });

  it('matching precision keeps the common threshold', () => {
    expect(matchThreshold(10, 'predictive')).toBe(10);
  });
});

describe('Chouldechova identity', () => {
  it('reproduces the false positive rate from base rate, precision and true positive rate', () => {
    for (const g of [GROUPS.A, GROUPS.B]) {
      for (const k of [4, 8, 10, 12, 15]) {
        const m = metricsFromConfusion(confusionAt(g, k));
        expect(fprFromPpv(m.baseRate, m.ppv!, m.tpr)).toBeCloseTo(m.fpr, 10);
      }
    }
  });

  it('shows equal precision plus different base rates forces unequal error rates (hand example)', () => {
    // base rates 0.5 and 0.2, both with precision 0.8 and true positive rate 0.6
    expect(fprFromPpv(0.5, 0.8, 0.6)).toBeCloseTo(0.15, 10);
    expect(fprFromPpv(0.2, 0.8, 0.6)).toBeCloseTo(0.0375, 10);
  });
});
