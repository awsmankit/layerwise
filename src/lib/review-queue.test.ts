import { describe, expect, it } from 'vitest';
import { BIN_COUNT, DEFAULT_QUEUE, EXAMPLE_BANDS, P_MAX, SHIFT_MIN, auditSampleSize, makeItems, reliability, runQueue, type QueueConfig } from './review-queue';

const run = (o: Partial<QueueConfig>) => runQueue({ ...DEFAULT_QUEUE, ...o });
const r1 = (n: number) => Math.round(n * 10) / 10;

describe('makeItems', () => {
  it('makes rate x 8 hours of items with the expected overall error count', () => {
    const items = makeItems(60, false);
    expect(items).toHaveLength(480);
    const total = items.reduce((a, b) => a + b.p, 0);
    // Mean of P_MAX * u^4 over 0..1 is P_MAX / 5 = 0.12, so 57.6 expected errors in 480 items.
    expect(total).toBeGreaterThan(57.4);
    expect(total).toBeLessThan(57.8);
  });
  it('is deterministic and spans the whole shift', () => {
    expect(makeItems(60, false)).toEqual(makeItems(60, false));
    const items = makeItems(30, false);
    expect(items[0].at).toBe(0);
    expect(items[items.length - 1].at).toBeLessThan(SHIFT_MIN);
  });
  it('an overconfident model shows half the true risk', () => {
    for (const it of makeItems(10, true)) expect(it.shown).toBeCloseTo(it.p / 2, 12);
  });
});

describe('thresholds trade workload against errors reaching customers (default: 2 reviewers, 3 minutes, 90% catch)', () => {
  const table = [
    // threshold, sent, load (2 d.p.), errors reaching customers (1 d.p.)
    [0, 480, 1.5, 5.7],
    [0.05, 222, 0.69, 8.1],
    [0.1, 173, 0.54, 11.3],
    [0.2, 115, 0.36, 18.9],
    [0.3, 76, 0.24, 27.7],
    [0.7, 0, 0, 57.6],
  ] as const;
  for (const [threshold, sent, load, reach] of table) {
    it(`threshold ${threshold}`, () => {
      const r = run({ threshold });
      expect(r.sent).toBe(sent);
      expect(r.sent + r.auto).toBe(480);
      expect(Math.round(r.load * 100) / 100).toBe(load);
      expect(r1(r.reachCustomers)).toBe(reach);
    });
  }
  it('reviewing 36% of items removes about 80% of the wrong drafts that would reach customers', () => {
    const r = run({ threshold: 0.1 });
    expect(r.sent / r.total).toBeCloseTo(0.36, 2);
    expect(1 - r.reachCustomers / r.expectedErrors).toBeGreaterThan(0.79);
    expect(1 - r.reachCustomers / r.expectedErrors).toBeLessThan(0.81);
  });
  it('raising the threshold never reduces the errors that reach customers', () => {
    let prev = -1;
    for (let t = 0; t <= 0.6; t += 0.05) {
      const r = run({ threshold: t });
      expect(r.reachCustomers).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = r.reachCustomers;
    }
  });
});

describe('overload', () => {
  it('reviewing everything with 2 reviewers cannot clear the queue (load 1.5)', () => {
    const r = run({ threshold: 0 });
    expect(r.load).toBeCloseTo(1.5, 10);
    expect(r.reviewed).toBe(320);
    expect(r.backlog).toBe(160);
    expect(r.utilisation).toBe(1);
    expect(r.series[r.series.length - 1]).toBe(160);
  });
  it('under overload, first-in-first-out makes people wait far longer than risk-first', () => {
    const risk = run({ threshold: 0, order: 'risk' });
    const fifo = run({ threshold: 0, order: 'fifo' });
    expect(fifo.meanWait).toBeGreaterThan(risk.meanWait * 10);
    expect(fifo.breached).toBeGreaterThan(risk.breached);
    // Risk-first reviews the riskier items, so fewer expected errors are missed in review.
    expect(risk.missedInReview).toBeGreaterThan(fifo.missedInReview);
  });
  it('without overload the order makes no difference', () => {
    const a = run({ threshold: 0.2, order: 'risk' });
    const b = run({ threshold: 0.2, order: 'fifo' });
    expect(a.reviewed).toBe(b.reviewed);
    expect(a.reachCustomers).toBeCloseTo(b.reachCustomers, 9);
  });
  it('more reviewers clear the backlog', () => {
    expect(run({ threshold: 0, reviewers: 4 }).backlog).toBe(0);
  });
});

describe('reviewer catch rate', () => {
  it('a perfect reviewer leaves only the auto-approved errors', () => {
    const r = run({ catchRate: 1 });
    expect(r.missedInReview).toBeCloseTo(0, 9);
    expect(r.reachCustomers).toBeCloseTo(r.autoErrors, 9);
  });
  it('a reviewer who catches nothing is no better than no review', () => {
    const r = run({ catchRate: 0 });
    expect(r.reachCustomers).toBeCloseTo(r.expectedErrors - 0, 0);
  });
});

describe('overconfident scores', () => {
  it('keep the same ranking but the same threshold sends fewer items to review', () => {
    const calm = run({ threshold: 0.1 });
    const over = run({ threshold: 0.1, overconfident: true });
    expect(over.sent).toBe(115);
    expect(over.sent).toBeLessThan(calm.sent);
    expect(r1(over.reachCustomers)).toBe(18.9);
  });
  it('and the dashboard under-predicts what reaches customers', () => {
    const over = run({ threshold: 0.1, overconfident: true });
    expect(r1(over.predicted)).toBe(9.5);
    expect(over.predicted).toBeLessThan(over.reachCustomers);
    const calm = run({ threshold: 0.1 });
    expect(calm.predicted).toBeCloseTo(calm.reachCustomers, 9);
  });
});

describe('bins and series', () => {
  it('bins count every item once', () => {
    const r = run({});
    const n = r.bins.reduce((a, b) => a + b.auto + b.sent, 0);
    expect(r.bins).toHaveLength(BIN_COUNT);
    expect(n).toBe(r.total);
    expect(r.bins[BIN_COUNT - 1].hi).toBeCloseTo(P_MAX, 10);
  });
  it('has a 30-minute series for the shift', () => {
    expect(run({}).series).toHaveLength(16);
  });
});

describe('auditSampleSize', () => {
  it('needs about 753 items to estimate a 2% error rate to within one percentage point', () => {
    expect(auditSampleSize(0.02, 0.01)).toBe(753);
  });
  it('needs more when the margin is tighter', () => {
    expect(auditSampleSize(0.02, 0.005)).toBeGreaterThan(auditSampleSize(0.02, 0.01));
  });
});

describe('reliability example (lesson table)', () => {
  it('observed error rates rise with the score band', () => {
    const r = reliability(EXAMPLE_BANDS, 2, 0.9);
    expect(r.observed.map((x) => Math.round(x * 1000) / 10)).toEqual([4, 14.1, 36, 61.7]);
    expect(r.total).toBe(1000);
    expect(r.wrong).toBe(150);
  });
  it('the stated scores under-predict the errors (110.5 against 150)', () => {
    expect(reliability(EXAMPLE_BANDS, 2, 0.9).predicted).toBeCloseTo(110.5, 9);
  });
  it('reviewing the top two bands covers 21% of items and 60.7% of errors, leaving 68.1 of 1,000 (6.8%)', () => {
    const r = reliability(EXAMPLE_BANDS, 2, 0.9);
    expect(r.reviewedItems).toBe(210);
    expect(r.reviewedShare).toBeCloseTo(0.21, 10);
    expect(r.errorsInReviewedShare).toBeCloseTo(91 / 150, 10);
    expect(r.reach).toBeCloseTo(68.1, 9);
    expect(r.reachRate).toBeCloseTo(0.0681, 10);
  });
  it('reviewing the top three bands covers 48% of items and 86% of errors, leaving 33.9 (3.4%)', () => {
    const r = reliability(EXAMPLE_BANDS, 3, 0.9);
    expect(r.reviewedItems).toBe(480);
    expect(r.errorsInReviewedShare).toBeCloseTo(129 / 150, 10);
    expect(r.reach).toBeCloseTo(33.9, 9);
  });
  it('reviewing nothing lets all 150 through', () => {
    expect(reliability(EXAMPLE_BANDS, 0, 0.9).reach).toBe(150);
  });
});
