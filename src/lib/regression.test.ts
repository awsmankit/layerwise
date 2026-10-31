import { describe, expect, it } from 'vitest';
import { accuracyAt, boundaryAt, fitLine, fitMultiple, logLoss, logisticStep, logit, mse, predict, probability, residuals, sigmoid, sse, trainLogistic, type Labelled } from './regression';

const FIVE = [
  { x: 1, y: 2 },
  { x: 2, y: 3 },
  { x: 3, y: 5 },
  { x: 4, y: 4 },
  { x: 5, y: 6 },
];

describe('fitLine (least squares by hand)', () => {
  it('gives slope 0.9 and intercept 1.3 for the five-point example in the lesson', () => {
    const l = fitLine(FIVE);
    expect(l.slope).toBeCloseTo(0.9, 10);
    expect(l.intercept).toBeCloseTo(1.3, 10);
  });

  it('has residuals -0.2, -0.1, 1, -0.9, 0.2 and a squared error of 1.90', () => {
    const l = fitLine(FIVE);
    const r = residuals(FIVE, l);
    [-0.2, -0.1, 1, -0.9, 0.2].forEach((v, i) => expect(r[i]).toBeCloseTo(v, 10));
    expect(sse(FIVE, l)).toBeCloseTo(1.9, 10);
    expect(mse(FIVE, l)).toBeCloseTo(0.38, 10);
  });

  it('beats the nearby line y = x + 1, which scores 2', () => {
    expect(sse(FIVE, { slope: 1, intercept: 1 })).toBeCloseTo(2, 10);
  });

  it('residuals of the best line sum to zero', () => {
    const r = residuals(FIVE, fitLine(FIVE));
    expect(r.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 10);
  });

  it('no nearby line has a smaller squared error', () => {
    const best = fitLine(FIVE);
    const base = sse(FIVE, best);
    for (const ds of [-0.1, 0, 0.1]) for (const di of [-0.2, 0, 0.2]) if (ds || di) expect(sse(FIVE, { slope: best.slope + ds, intercept: best.intercept + di })).toBeGreaterThan(base);
  });

  it('predicts by reading along the line', () => {
    expect(predict(fitLine(FIVE), 6)).toBeCloseTo(6.7, 10);
  });

  it('handles degenerate input without NaN', () => {
    expect(fitLine([])).toEqual({ slope: 0, intercept: 0 });
    expect(fitLine([{ x: 2, y: 7 }])).toEqual({ slope: 0, intercept: 7 });
    expect(fitLine([{ x: 2, y: 4 }, { x: 2, y: 8 }])).toEqual({ slope: 0, intercept: 6 });
  });
});

describe('fitMultiple', () => {
  it('matches fitLine for one input', () => {
    const b = fitMultiple(FIVE.map((p) => [p.x]), FIVE.map((p) => p.y))!;
    expect(b[0]).toBeCloseTo(1.3, 8);
    expect(b[1]).toBeCloseTo(0.9, 8);
  });

  it('recovers an exact two-input rule', () => {
    const rows = [[1, 2], [2, 1], [3, 5], [4, 3], [5, 8]];
    const ys = rows.map(([a, b]) => 3 + 2 * a - 1 * b);
    const b = fitMultiple(rows, ys)!;
    expect(b[0]).toBeCloseTo(3, 8);
    expect(b[1]).toBeCloseTo(2, 8);
    expect(b[2]).toBeCloseTo(-1, 8);
  });

  it('gives the lesson example: 7.90 + 6.71 x revised + 3.40 x slept', () => {
    const rows = [[1, 6], [2, 8], [3, 5], [4, 7], [5, 9], [6, 6]];
    const ys = [35, 48, 45, 60, 72, 68];
    const b = fitMultiple(rows, ys)!;
    expect(b[0]).toBeCloseTo(7.9, 1);
    expect(b[1]).toBeCloseTo(6.71, 2);
    expect(b[2]).toBeCloseTo(3.4, 2);
  });

  it('returns null when one input is a copy of another', () => {
    expect(fitMultiple([[1, 2], [2, 4], [3, 6]], [1, 2, 3])).toBeNull();
  });
});

describe('sigmoid', () => {
  it('maps 0 to 0.5 and squashes large scores towards 0 and 1', () => {
    expect(sigmoid(0)).toBe(0.5);
    expect(sigmoid(2)).toBeCloseTo(0.8808, 4);
    expect(sigmoid(-2)).toBeCloseTo(0.1192, 4);
    expect(sigmoid(2.4)).toBeCloseTo(0.9168, 4);
    expect(sigmoid(-2.4)).toBeCloseTo(0.0832, 4);
    expect(sigmoid(800)).toBe(1);
    expect(sigmoid(-800)).toBe(0);
  });

  it('is inverted by logit', () => {
    for (const z of [-3, -0.5, 0, 1.7]) expect(logit(sigmoid(z))).toBeCloseTo(z, 10);
  });
});

const DATA: Labelled[] = [
  { x: -3, label: 0 },
  { x: -2, label: 0 },
  { x: -1, label: 0 },
  { x: -0.5, label: 1 },
  { x: 0.5, label: 0 },
  { x: 1, label: 1 },
  { x: 2, label: 1 },
  { x: 3, label: 1 },
];

describe('logistic regression', () => {
  it('gives log loss ln 2 = 0.693 for a model that always says 0.5', () => {
    expect(logLoss(DATA, { w: 0, b: 0 })).toBeCloseTo(Math.LN2, 10);
  });

  it('lowers the loss on every one of the first steps of gradient descent', () => {
    let m = { w: 0, b: 0 };
    let prev = logLoss(DATA, m);
    for (let i = 0; i < 20; i++) {
      m = logisticStep(DATA, m, 0.5);
      const now = logLoss(DATA, m);
      expect(now).toBeLessThan(prev);
      prev = now;
    }
  });

  it('after 200 steps has a positive slope and a boundary near the middle', () => {
    const m = trainLogistic(DATA, { w: 0, b: 0 }, 200, 0.5);
    expect(m.w).toBeGreaterThan(0.5);
    const edge = boundaryAt(m, 0.5)!;
    expect(edge).toBeGreaterThan(-1.5);
    expect(edge).toBeLessThan(1.5);
    expect(accuracyAt(DATA, m, 0.5)).toBeGreaterThanOrEqual(6 / 8);
  });

  it('puts the boundary where the probability equals the threshold', () => {
    const m = { w: 1.2, b: -4.8 }; // 50% at 4 hours
    expect(boundaryAt(m, 0.5)).toBeCloseTo(4, 10);
    const t = 0.8;
    expect(probability(m, boundaryAt(m, t)!)).toBeCloseTo(t, 10);
    expect(boundaryAt({ w: 0, b: 1 }, 0.5)).toBeNull();
  });

  it('a higher threshold moves the boundary to the right when the slope is positive', () => {
    const m = { w: 1, b: 0 };
    expect(boundaryAt(m, 0.9)!).toBeGreaterThan(boundaryAt(m, 0.5)!);
  });
});
