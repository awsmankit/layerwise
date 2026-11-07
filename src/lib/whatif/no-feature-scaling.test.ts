import { describe, expect, it } from "vitest";
import {
  K,
  MAX_STEPS,
  N_TEST,
  N_TRAIN,
  accuracy,
  bowl,
  coords,
  descend,
  dist,
  fitScaler,
  makeData,
  neighbours,
  ratioMeans,
  showcaseQuery,
  unitSweep,
  type Row,
} from "./no-feature-scaling";

const row = (income: number, ratio: number, label: 0 | 1 = 0): Row => ({
  income,
  ratio,
  label,
});

describe("no feature scaling what-if", () => {
  it("builds a fixed, balanced toy dataset", () => {
    const a = makeData();
    expect(a.train).toHaveLength(N_TRAIN);
    expect(a.test).toHaveLength(N_TEST);
    expect(makeData()).toEqual(a);
    const ones = [...a.train, ...a.test].filter((r) => r.label === 1).length;
    expect(ones).toBe((N_TRAIN + N_TEST) / 2);
    for (const r of a.train) {
      expect(r.ratio).toBeGreaterThanOrEqual(0);
      expect(r.ratio).toBeLessThanOrEqual(1);
      expect(r.income).toBeGreaterThanOrEqual(8000);
    }
  });

  it("standardising gives each feature mean 0 and spread 1 on the training rows", () => {
    const { train } = makeData();
    const sc = fitScaler(train);
    const xs = train.map((t) => coords(t, sc));
    const mean = (i: 0 | 1) => xs.reduce((s, c) => s + c[i], 0) / xs.length;
    const sd = (i: 0 | 1) =>
      Math.sqrt(xs.reduce((s, c) => s + (c[i] - mean(i)) ** 2, 0) / xs.length);
    expect(mean(0)).toBeCloseTo(0, 9);
    expect(mean(1)).toBeCloseTo(0, 9);
    expect(sd(0)).toBeCloseTo(1, 9);
    expect(sd(1)).toBeCloseTo(1, 9);
  });

  it("hand-checked: a $300 income gap outweighs the biggest possible ratio gap when unscaled", () => {
    const a = row(50000, 0.1);
    const b = row(50300, 0.1);
    const c = row(50000, 1.0);
    expect(dist(a, b, null)).toBeCloseTo(300, 9);
    expect(dist(a, c, null)).toBeCloseTo(0.9, 9);
    // so c, which differs most in the clue that matters, still counts as the nearer row
    expect(dist(a, c, null)).toBeLessThan(dist(a, b, null));
  });

  it("unscaled, almost all of the distance to the neighbours is income; standardised, it is shared", () => {
    const { train, test } = makeData();
    const sc = fitScaler(train);
    for (const q of test.slice(0, 10)) {
      expect(neighbours(train, q, null).incomeShare).toBeGreaterThan(0.999);
      const s = neighbours(train, q, sc).incomeShare;
      expect(s).toBeGreaterThan(0.05);
      expect(s).toBeLessThan(0.95);
    }
  });

  it("standardising lifts the score from near a coin flip to high", () => {
    const { train, test } = makeData();
    const raw = accuracy(train, test, false);
    const scaled = accuracy(train, test, true);
    expect(raw).toBeLessThan(0.65);
    expect(scaled).toBeGreaterThan(0.8);
    expect(scaled - raw).toBeGreaterThan(0.2);
  });

  it("returns k neighbours, sorted by distance, with an odd vote", () => {
    const { train, test } = makeData();
    const n = neighbours(train, test[0], null);
    expect(n.idx).toHaveLength(K);
    const d = n.idx.map((i) => dist(train[i], test[0], null));
    expect([...d].sort((x, y) => x - y)).toEqual(d);
    expect(n.radius).toBe(d[K - 1]);
  });

  it("only the unit of income matters without scaling: bigger units hand the ratio more say", () => {
    const { train, test } = makeData();
    const u = unitSweep(train, test);
    expect(u.map((x) => x.unit)).toEqual([1, 1000, 10000, 100000]);
    expect(u[0].accuracy).toBeLessThan(0.65);
    expect(u[3].accuracy).toBeGreaterThan(u[0].accuracy + 0.2);
    // scaling makes the answer independent of the unit
    const a = accuracy(train, test, true, K, 1);
    const b = accuracy(train, test, true, K, 100000);
    expect(a).toBe(b);
  });

  it("the showcase customer is one that unscaled gets wrong and scaled gets right", () => {
    const { train, test } = makeData();
    const i = showcaseQuery(train, test);
    const sc = fitScaler(train);
    expect(neighbours(train, test[i], null).vote).not.toBe(test[i].label);
    expect(neighbours(train, test[i], sc).vote).toBe(test[i].label);
  });

  it("the loss bowl is stretched about 100,000 to 1 unscaled and nearly round standardised", () => {
    const { train } = makeData();
    const raw = bowl(train, false);
    const scaled = bowl(train, true);
    expect(raw.stretch).toBeGreaterThan(10000);
    expect(scaled.stretch).toBeLessThan(2);
    expect(scaled.lambda[0]).toBeGreaterThanOrEqual(scaled.lambda[1]);
  });

  it("the best weights are where the gradient is zero", () => {
    const { train } = makeData();
    for (const s of [false, true]) {
      const b = bowl(train, s);
      const [h11, h12, h22] = b.h;
      // minimum of the loss: the linear term of the loss is 0 at w*, so the loss of w* is no more than any nearby point
      const loss = (w1: number, w2: number) => {
        const d1 = w1 - b.best[0];
        const d2 = w2 - b.best[1];
        return 0.5 * (h11 * d1 * d1 + 2 * h12 * d1 * d2 + h22 * d2 * d2);
      };
      expect(loss(b.best[0], b.best[1])).toBe(0);
      expect(
        loss(b.best[0] + 1e-3 / Math.sqrt(b.lambda[0]), b.best[1]),
      ).toBeGreaterThan(0);
    }
  });

  it("gradient descent: standardised reaches 1% in a couple of steps, unscaled barely moves in 200", () => {
    const { train } = makeData();
    const s = descend(bowl(train, true), 200);
    const r = descend(bowl(train, false), 200);
    expect(s.stepsTo1pct).not.toBeNull();
    expect(s.stepsTo1pct as number).toBeLessThan(10);
    expect(r.remaining).toHaveLength(201);
    expect(r.remaining[0]).toBe(1);
    expect(r.remaining[200]).toBeGreaterThan(0.5);
    expect(r.stepsTo1pct === null || r.stepsTo1pct > 100000).toBe(true);
    expect(MAX_STEPS).toBeGreaterThan(1000);
    // the loss never goes up with the safe step size
    for (let i = 1; i < r.remaining.length; i++)
      expect(r.remaining[i]).toBeLessThanOrEqual(r.remaining[i - 1] + 1e-12);
  });

  it("the ratio really is the strong clue", () => {
    const m = ratioMeans(makeData().train);
    expect(m.onTime - m.late).toBeGreaterThan(0.2);
  });
});
