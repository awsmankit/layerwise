import { describe, expect, it } from 'vitest';
import {
  accuracy, analyse, BOILERPLATE, COPIES, keepFlags, makeRaw, N_REPEATED, N_UNIQUE, newLines, nextDist, split, topCopied, train, START,
} from './no-deduplication';

describe('deduplication what-if (toy)', () => {
  it('raw data: 150 distinct lines, 30 of them twice, plus K copies of the boilerplate line', () => {
    for (const k of [1, 20, 80]) {
      const raw = makeRaw(k);
      expect(raw).toHaveLength(N_UNIQUE + N_REPEATED + k);
      expect(raw.filter((d) => d.text === BOILERPLATE)).toHaveLength(k);
      expect(new Set(raw.map((d) => d.text)).size).toBe(N_UNIQUE + 1);
    }
    expect(makeRaw(40)).toEqual(makeRaw(40));
  });

  it('dedup keeps exactly one copy of each distinct line and removes all the rest', () => {
    const raw = makeRaw(40);
    const kept = keepFlags(raw);
    expect(kept.filter(Boolean)).toHaveLength(N_UNIQUE + 1);
    expect(raw.length - kept.filter(Boolean).length).toBe(N_REPEATED + 39);
    expect(analyse(true, 40).removed).toBe(N_REPEATED + 39);
    expect(analyse(false, 40).removed).toBe(0);
  });

  it('split: last fifth of what is kept is validation, and sizes add up', () => {
    const raw = makeRaw(20);
    const s = split(raw, false);
    expect(s.train.length + s.val.length).toBe(raw.length);
    expect(s.val.length).toBe(Math.round(raw.length * 0.2));
    const d = split(raw, true);
    expect(d.train.length + d.val.length).toBe(N_UNIQUE + 1);
  });

  it('trigram counts, checked by hand on two lines', () => {
    const c = train(['a b c', 'a b d', 'a b c']);
    expect(nextDist(c, [START, 'a'])).toEqual([['b', 3]]);
    expect(nextDist(c, ['a', 'b'])).toEqual([['c', 2], ['d', 1]]);
    expect(nextDist(c, ['x', 'b'])[0][0]).toBe('c'); // backs off to the one-word context "b"
    expect(accuracy(c, ['a b c'])).toBe(1);
    expect(accuracy(c, ['a b d'])).toBeCloseTo(3 / 4, 12); // the d is guessed as c
  });

  it('without dedup, validation lines leak from training; with it, none do', () => {
    for (const k of COPIES) {
      expect(analyse(false, k).leaked).toBeGreaterThan(0);
      expect(analyse(true, k).leaked).toBe(0);
      expect(analyse(true, k).leakShare).toBe(0);
    }
  });

  it('the reported validation score is inflated above the honest score once the boilerplate is common', () => {
    const a = analyse(false, 80);
    expect(a.valAccuracy).toBeGreaterThan(a.honestAccuracy + 0.05);
    const d = analyse(true, 80);
    expect(d.valAccuracy).toBe(d.honestAccuracy);
  });

  it('the more copies, the bigger the boilerplate share of training data and of what the model writes', () => {
    let prevShare = 0;
    let prevBoiler = -1;
    for (const k of COPIES) {
      const a = analyse(false, k);
      expect(a.boilerShareOfTrain).toBeGreaterThan(prevShare);
      expect(a.boilerCount).toBeGreaterThanOrEqual(prevBoiler);
      prevShare = a.boilerShareOfTrain;
      prevBoiler = a.boilerCount;
    }
    const heavy = analyse(false, 80);
    expect(heavy.boilerCount / heavy.samples.length).toBeGreaterThan(0.25); // matches its ~32% share of the training data
    expect(Math.abs(heavy.boilerCount / heavy.samples.length - heavy.boilerShareOfTrain)).toBeLessThan(0.08);
  });

  it('deduplication cuts the copied lines a lot', () => {
    const raw = analyse(false, 80);
    const dd = analyse(true, 80);
    expect(dd.boilerCount).toBeLessThanOrEqual(2);
    expect(raw.copiedCount).toBeGreaterThan(5 * dd.copiedCount);
    expect(topCopied(raw)[0].boiler).toBe(true);
    expect(topCopied(raw)[0].count).toBe(raw.boilerCount);
  });

  it('new lines are never copies', () => {
    const a = analyse(false, 40);
    const train = new Set(a.split.train);
    for (const t of newLines(a, 5)) expect(train.has(t)).toBe(false);
  });
});
