import { describe, expect, it } from 'vitest';
import { apportion, avoidableSpend, badAnswers, bigCost, cells, costPerGoodAnswer, dayCost, example, priceRatio, routerCost, savingShare, smallCost, split } from './no-model-routing';

describe('no model routing what-if', () => {
  it('example prices: big request $0.0125, small $0.00125, ratio 10, router $0.00005', () => {
    expect(bigCost()).toBeCloseTo(0.0125, 10);
    expect(smallCost()).toBeCloseTo(0.00125, 10);
    expect(priceRatio()).toBeCloseTo(10, 9);
    expect(routerCost()).toBeCloseTo(0.00005, 10);
  });
  it('everything to the big model: 10,000 requests cost $125 a day, whatever the mix', () => {
    expect(dayCost(0.7, 0, false)).toBeCloseTo(125, 8);
    expect(dayCost(0, 0, false)).toBeCloseTo(125, 8);
    expect(dayCost(1, 0.3, false)).toBeCloseTo(125, 8);
  });
  it('a perfect router at 70% easy: 7,000 x 0.00125 + 3,000 x 0.0125 + 10,000 x 0.00005 = $46.75', () => {
    expect(dayCost(0.7, 0, true)).toBeCloseTo(46.75, 8);
    expect(savingShare(0.7, 0)).toBeCloseTo(1 - 46.75 / 125, 9);
    expect(badAnswers(0.7, 0, true)).toBe(0);
  });
  it('a router that is wrong 20% of the time at 70% easy', () => {
    const s = split(0.7, 0.2, true);
    expect(s.easyToSmall).toBeCloseTo(0.56, 12);
    expect(s.easyToBig).toBeCloseTo(0.14, 12);
    expect(s.hardToBig).toBeCloseTo(0.24, 12);
    expect(s.hardToSmall).toBeCloseTo(0.06, 12);
    // 0.06 of requests go to the small model although hard, and it slips on 60% of them: 360 a day
    expect(badAnswers(0.7, 0.2, true)).toBeCloseTo(360, 8);
    // small: 0.62, big: 0.38
    expect(dayCost(0.7, 0.2, true)).toBeCloseTo(10000 * (0.62 * 0.00125 + 0.38 * 0.0125 + 0.00005), 8);
  });
  it('the shares always add up to 1', () => {
    for (const router of [true, false])
      for (const m of [0, 0.1, 0.5]) {
        const s = split(0.4, m, router);
        expect(s.easyToSmall + s.hardToBig + s.easyToBig + s.hardToSmall).toBeCloseTo(1, 12);
      }
  });
  it('more easy requests means a bigger saving; more mistakes means a smaller saving and more bad answers', () => {
    for (let e = 0.1; e <= 1; e += 0.1) expect(savingShare(e, 0.1)).toBeGreaterThan(savingShare(e - 0.1, 0.1));
    for (let m = 0.05; m <= 0.4; m += 0.05) {
      expect(badAnswers(0.7, m, true)).toBeGreaterThan(badAnswers(0.7, m - 0.05, true));
      expect(savingShare(0.7, m)).toBeLessThan(savingShare(0.7, m - 0.05));
    }
  });
  it('edge cases: nothing is easy, so a perfect router saves nothing and costs the router fee', () => {
    expect(dayCost(0, 0, true)).toBeCloseTo(125 + 0.5, 8);
    expect(savingShare(0, 0)).toBeLessThan(0);
    expect(savingShare(1, 0)).toBeGreaterThan(0.85);
  });
  it('the all-big bill spends this much on easy requests: 70% x 10,000 x ($0.0125 - $0.00125)', () => {
    expect(avoidableSpend(0.7)).toBeCloseTo(78.75, 8);
  });
  it('cost per good answer is cost over good answers', () => {
    expect(costPerGoodAnswer(0.7, 0.2, true)).toBeCloseTo(dayCost(0.7, 0.2, true) / 9640, 10);
    expect(costPerGoodAnswer(0.7, 0, false)).toBeCloseTo(0.0125, 10);
  });
  it('apportion returns whole numbers adding to the total', () => {
    expect(apportion([0.56, 0.24, 0.14, 0.06], 100)).toEqual([56, 24, 14, 6]);
    expect(apportion([1, 1, 1], 100).reduce((a, b) => a + b, 0)).toBe(100);
    expect(apportion([0.5, 0.5, 0, 0], 3)).toEqual([2, 1, 0, 0]);
  });
  it('cells: 100 of them, all big without a router', () => {
    const off = cells(0.7, 0.1, false);
    expect(off).toHaveLength(100);
    expect(off.filter((c) => c === 'waste')).toHaveLength(70);
    expect(off.filter((c) => c === 'big')).toHaveLength(30);
    const on = cells(0.7, 0.2, true);
    expect(on.filter((c) => c === 'small')).toHaveLength(56);
    expect(on.filter((c) => c === 'bad')).toHaveLength(6);
  });
  it('uses the stated example', () => {
    expect(example.requestsPerDay).toBe(10000);
  });
});
