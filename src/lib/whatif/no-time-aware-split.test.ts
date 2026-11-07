import { describe, expect, it } from 'vitest';
import { N, SHOWN_SEED, averageRandomMae, expandingFolds, makeSeries, predictAt, randomSplit, score, timeSplit } from './no-time-aware-split';

describe('no time-aware split what-if', () => {
  it('builds the same series every time, with the trend and the yearly cycle in it', () => {
    const a = makeSeries(0.5);
    expect(a).toHaveLength(N);
    expect(makeSeries(0.5)).toEqual(a);
    expect(a[95]).toBeGreaterThan(a[0] + 30);
  });
  it('a time split holds back exactly the last quarter; a random split holds back the same number', () => {
    const t = timeSplit();
    expect(t.filter(Boolean)).toHaveLength(24);
    expect(t.indexOf(true)).toBe(72);
    const r = randomSplit(SHOWN_SEED);
    expect(r.filter(Boolean)).toHaveLength(24);
    expect(randomSplit(SHOWN_SEED)).toEqual(r);
    expect(r.indexOf(true)).toBeLessThan(72); // test months are scattered through the whole timeline
  });
  it('the model averages the two nearest training months (hand-checked)', () => {
    const y = [10, 20, 30, 40, 50];
    // month 2 held out: nearest training months are 1 and 3, so (20 + 40) / 2
    expect(predictAt(y, [false, false, true, false, false], 2)).toBe(30);
    // months 4 held out at the end: nearest are 3 and 2, so (40 + 30) / 2 = 35 against the truth 50
    expect(predictAt(y, [false, false, false, false, true], 4)).toBe(35);
  });
  it('no test month has a training month after it in a time split; nearly all do in a random one', () => {
    const y = makeSeries(0.3);
    expect(score(y, timeSplit()).seesFuture).toBe(0);
    expect(score(y, randomSplit(SHOWN_SEED)).seesFuture).toBeGreaterThanOrEqual(20);
  });
  it('the shuffled split looks much better than the honest one, and the gap grows with the trend', () => {
    let lastGap = -1;
    for (const trend of [0, 0.3, 0.6, 1]) {
      const y = makeSeries(trend);
      const shuffled = score(y, randomSplit(SHOWN_SEED)).mae;
      const honest = score(y, timeSplit()).mae;
      expect(honest).toBeGreaterThan(shuffled * 1.5);
      expect(honest - shuffled).toBeGreaterThan(lastGap);
      lastGap = honest - shuffled;
    }
  });
  it('the shuffled score is not a lucky shuffle: it stays low on average too', () => {
    const y = makeSeries(0.3);
    expect(averageRandomMae(y, 50)).toBeLessThan(3.2);
    expect(score(y, timeSplit()).mae).toBeGreaterThan(6);
  });
  it('expanding folds follow the scikit-learn documentation example', () => {
    // 6 samples, 5 splits: fold i trains on [0..i], tests on i + 1
    expect(expandingFolds(6, 5)).toEqual([
      { trainEnd: 1, testStart: 1, testEnd: 2 },
      { trainEnd: 2, testStart: 2, testEnd: 3 },
      { trainEnd: 3, testStart: 3, testEnd: 4 },
      { trainEnd: 4, testStart: 4, testEnd: 5 },
      { trainEnd: 5, testStart: 5, testEnd: 6 },
    ]);
  });
});
