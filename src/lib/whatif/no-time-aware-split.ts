/**
 * What if we shuffle time-ordered data before splitting? A toy monthly series: a steady trend, a yearly cycle
 * and a little noise. The "model" is deliberately simple and flexible: to guess a month it averages the K
 * training months nearest to it in time (a nearest-neighbour model that can only copy what it has seen).
 * Split at random, most test months have training months on BOTH sides, so the model is really interpolating
 * between neighbours: it has seen the future. Split by time (train on the past, test on the future) it must
 * guess beyond the end of what it saw. Every number on the page is computed here.
 */

export const N = 96; // eight years of months
export const PERIOD = 12;
export const BASE = 50;
export const AMP = 8;
export const NOISE = 2;
export const K = 2;
export const TEST_SHARE = 0.25;
export const SHOWN_SEED = 11;

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(r: () => number): number {
  return Math.sqrt(-2 * Math.log(Math.max(r(), 1e-12))) * Math.cos(2 * Math.PI * r());
}

/** value(t) = BASE + trend * t + AMP * sin(2 pi t / 12) + noise. Rounded so every machine prints the same digits. */
export function makeSeries(trend: number, seed = 7): number[] {
  const r = rng(seed);
  return Array.from({ length: N }, (_, t) => {
    const v = BASE + trend * t + AMP * Math.sin((2 * Math.PI * t) / PERIOD) + NOISE * gauss(r);
    return Math.round(v * 1000) / 1000;
  });
}

/** isTest[t] is true when month t is held back. */
export type Split = boolean[];

/** The honest split: the last share of the months is the test set. */
export function timeSplit(n = N, share = TEST_SHARE): Split {
  const testN = Math.round(n * share);
  return Array.from({ length: n }, (_, t) => t >= n - testN);
}

/** The careless split: shuffle all months, then take a share as the test set. */
export function randomSplit(seed: number, n = N, share = TEST_SHARE): Split {
  const r = rng(seed);
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const test = new Set(idx.slice(0, Math.round(n * share)));
  return Array.from({ length: n }, (_, t) => test.has(t));
}

/** Average of the K training months nearest in time to month t (ties go to the earlier month). */
export function predictAt(y: number[], isTest: Split, t: number, k = K): number {
  const near: number[] = [];
  for (let i = 0; i < y.length; i++) if (!isTest[i]) near.push(i);
  near.sort((a, b) => Math.abs(a - t) - Math.abs(b - t) || a - b);
  const use = near.slice(0, k);
  return use.reduce((s, i) => s + y[i], 0) / use.length;
}

export type Scored = {
  tests: { t: number; actual: number; guess: number; err: number }[];
  mae: number;
  /** Test months that have at least one training month AFTER them: the model has seen their future. */
  seesFuture: number;
};

export function score(y: number[], isTest: Split, k = K): Scored {
  const lastTrain = isTest.lastIndexOf(false);
  const tests = [];
  let seesFuture = 0;
  for (let t = 0; t < y.length; t++) {
    if (!isTest[t]) continue;
    const guess = predictAt(y, isTest, t, k);
    tests.push({ t, actual: y[t], guess, err: Math.abs(guess - y[t]) });
    if (lastTrain > t) seesFuture++;
  }
  return { tests, mae: tests.reduce((s, x) => s + x.err, 0) / tests.length, seesFuture };
}

/** Mean absolute error of the random split, averaged over many different shuffles. */
export function averageRandomMae(y: number[], repeats = 100): number {
  let sum = 0;
  for (let i = 0; i < repeats; i++) sum += score(y, randomSplit(1000 + i)).mae;
  return sum / repeats;
}

/**
 * Expanding-window folds the way scikit-learn's TimeSeriesSplit makes them (default settings):
 * test blocks of n // (splits + 1) months, each fold trains on everything before its test block.
 */
export function expandingFolds(n: number, splits: number): { trainEnd: number; testStart: number; testEnd: number }[] {
  const size = Math.floor(n / (splits + 1));
  return Array.from({ length: splits }, (_, f) => {
    const testStart = n - (splits - f) * size;
    return { trainEnd: testStart, testStart, testEnd: testStart + size };
  });
}

export function expandingMae(y: number[], splits = 5, k = K): number {
  const folds = expandingFolds(y.length, splits);
  let sum = 0;
  for (const f of folds) {
    // months from trainEnd on are not trained on; only the fold's own block is scored
    const held = y.map((_, t) => t >= f.trainEnd);
    let e = 0;
    for (let t = f.testStart; t < f.testEnd; t++) e += Math.abs(predictAt(y, held, t, k) - y[t]);
    sum += e / (f.testEnd - f.testStart);
  }
  return sum / folds.length;
}
