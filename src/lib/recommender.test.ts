import { describe, expect, it } from 'vitest';
import {
  evaluate,
  ITEMS,
  itemSimilarity,
  leaveOneOut,
  LIKE,
  likeCounts,
  LOOP_ITEMS,
  makeRatings,
  makeScorer,
  mfPredict,
  N_USERS,
  randomHitRate,
  recommend,
  simulateLoop,
  trainMf,
  type Ratings,
} from './recommender';

describe('makeRatings', () => {
  it('is deterministic and fills about half the cells with 1 to 5', () => {
    const a = makeRatings(1);
    expect(makeRatings(1)).toEqual(a);
    expect(makeRatings(2)).not.toEqual(a);
    expect(a).toHaveLength(N_USERS);
    const vals = a.flat().filter((v): v is number => v !== null);
    expect(vals.every((v) => Number.isInteger(v) && v >= 1 && v <= 5)).toBe(true);
    expect(vals.length / (N_USERS * ITEMS.length)).toBeGreaterThan(0.4);
    expect(vals.length / (N_USERS * ITEMS.length)).toBeLessThan(0.65);
    expect(a.every((row) => row.filter((v) => v !== null).length >= 5)).toBe(true);
  });
});

describe('leaveOneOut', () => {
  it('hides exactly one liked item per eligible user and keeps the rest', () => {
    const r = makeRatings(1);
    const { train, heldOut } = leaveOneOut(r);
    heldOut.forEach((h, u) => {
      if (h === null) return;
      expect(r[u][h]).toBeGreaterThanOrEqual(LIKE);
      expect(train[u][h]).toBeNull();
      const before = r[u].filter((v) => v !== null).length;
      expect(train[u].filter((v) => v !== null).length).toBe(before - 1);
      // it was the user's highest rating
      expect(r[u][h]).toBe(Math.max(...(r[u].filter((v) => v !== null) as number[])));
    });
  });
});

describe('popularity', () => {
  it('counts ratings of 4 or more and recommends the most-liked unseen items', () => {
    const r: Ratings = [
      [5, 5, null, null, ...Array(10).fill(null)],
      [4, 2, 5, null, ...Array(10).fill(null)],
      [5, null, 4, 5, ...Array(10).fill(null)],
    ];
    expect(likeCounts(r).slice(0, 4)).toEqual([3, 1, 2, 1]);
    const scorer = makeScorer(r, 'popularity');
    expect(recommend(r, scorer, 0, 2)).toEqual([2, 3]);
  });
});

describe('itemSimilarity', () => {
  it('is symmetric, between -1 and 1, and positive for items two users rate alike', () => {
    const r: Ratings = Array.from({ length: 4 }, () => Array(ITEMS.length).fill(null));
    r[0][0] = 5; r[0][1] = 5; r[0][2] = 1;
    r[1][0] = 4; r[1][1] = 4; r[1][2] = 2;
    r[2][0] = 2; r[2][1] = 1; r[2][2] = 5;
    const s = itemSimilarity(r);
    expect(s[0][1]).toBeCloseTo(s[1][0], 10);
    expect(s[0][1]).toBeGreaterThan(0.9);
    expect(s[0][2]).toBeLessThan(0);
    for (const row of s) for (const v of row) expect(Math.abs(v)).toBeLessThanOrEqual(1 + 1e-9);
  });
  it('is 0 when fewer than two users rated both items', () => {
    const r: Ratings = Array.from({ length: 3 }, () => Array(ITEMS.length).fill(null));
    r[0][0] = 5; r[0][1] = 4; r[1][0] = 3;
    expect(itemSimilarity(r)[0][1]).toBe(0);
  });
});

describe('matrix factorisation', () => {
  it('fits the observed ratings better as k grows (training error)', () => {
    const r = makeRatings(1);
    const rmse = (k: number) => {
      const m = trainMf(r, k, { seed: 1 });
      let s = 0;
      let n = 0;
      r.forEach((row, u) => row.forEach((v, i) => { if (v !== null) { s += (v - mfPredict(m, u, i)) ** 2; n++; } }));
      return Math.sqrt(s / n);
    };
    expect(rmse(0)).toBeGreaterThan(rmse(2));
    expect(rmse(2)).toBeGreaterThan(rmse(8) - 1e-9);
  });
  it('is deterministic for a given seed', () => {
    const r = makeRatings(3);
    expect(trainMf(r, 2, { seed: 5 }).q).toEqual(trainMf(r, 2, { seed: 5 }).q);
  });
  it('with k = 0 every user gets the same item order (biases only)', () => {
    const r = makeRatings(1);
    const sc = makeScorer(r, 'mf', 0);
    const order = (u: number) => ITEMS.map((_, i) => i).sort((a, b) => sc(u)[b] - sc(u)[a]);
    expect(order(0)).toEqual(order(5));
  });
});

describe('evaluate', () => {
  it('reports a hit rate between 0 and 1 for every method on the default table', () => {
    const r = makeRatings(1);
    for (const m of ['popularity', 'itemitem', 'mf'] as const) {
      const e = evaluate(r, m, 2);
      expect(e.users).toBe(12);
      expect(e.rate).toBeGreaterThanOrEqual(0);
      expect(e.rate).toBeLessThanOrEqual(1);
      expect(e.hits).toBe(e.perUser.filter((p) => p.hit).length);
    }
  });
  it('the numbers quoted in the lesson for the default table (seed 1) hold', () => {
    const r = makeRatings(1);
    expect(evaluate(r, 'popularity').hits).toBe(5);
    expect(evaluate(r, 'itemitem').hits).toBe(8);
    expect(evaluate(r, 'mf', 2).hits).toBe(8);
  });
  it('averaged over 200 invented tables, personalised methods beat a random pick and matrix factorisation beats popularity (lesson figures)', () => {
    const S = 200;
    const avg = (f: (r: Ratings) => number) => {
      let s = 0;
      for (let seed = 1; seed <= S; seed++) s += f(makeRatings(seed));
      return s / S;
    };
    const random = avg((r) => randomHitRate(r));
    const pop = avg((r) => evaluate(r, 'popularity').rate);
    const ii = avg((r) => evaluate(r, 'itemitem').rate);
    const mf = avg((r) => evaluate(r, 'mf', 2).rate);
    expect(random).toBeGreaterThan(0.36);
    expect(random).toBeLessThan(0.41);
    expect(pop).toBeGreaterThan(random + 0.1);
    expect(ii).toBeGreaterThan(random + 0.1);
    expect(mf).toBeGreaterThan(pop + 0.03);
    expect(mf).toBeGreaterThan(ii + 0.03);
  });
});

describe('simulateLoop', () => {
  it('is deterministic, adds 60 impressions per round of 20 people, and tracks the share of the best item', () => {
    const a = simulateLoop(1, 0.1, 50);
    expect(simulateLoop(1, 0.1, 50)).toEqual(a);
    expect(a.impressions).toHaveLength(51);
    expect(a.impressions[50].reduce((x, y) => x + y, 0)).toBe(50 * 20 * 3);
    expect(a.bestShownShare[50]).toBeCloseTo(a.impressions[50][LOOP_ITEMS - 1] / 3000, 10);
  });
  it('with no exploration the system finds the best item only by luck; with exploration it usually does (300 seeds)', () => {
    const S = 300;
    const rate = (eps: number, rank: 'clicks' | 'rate') => {
      let n = 0;
      for (let s = 1; s <= S; s++) {
        const imp = simulateLoop(s, eps, 100, 20, rank).impressions[100];
        const top3 = [...imp.keys()].sort((a, b) => imp[b] - imp[a]).slice(0, 3);
        if (top3.includes(LOOP_ITEMS - 1)) n++;
      }
      return n / S;
    };
    expect(rate(0, 'rate')).toBeGreaterThan(0.25);
    expect(rate(0, 'rate')).toBeLessThan(0.42);
    expect(rate(0.2, 'rate')).toBeGreaterThan(0.85);
    expect(rate(0.2, 'rate')).toBeLessThan(0.93);
    // ranking by raw click counts: small amounts of exploration cannot overtake the leaders
    expect(rate(0.2, 'clicks')).toBeLessThan(0.42);
  });
});
