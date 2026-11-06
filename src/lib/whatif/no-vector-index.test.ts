import { describe, expect, it } from 'vitest';
import {
  BUDGET_MS, annChecks, annMs, brutePastBudget, bruteChecks, bruteMs, crossover, fmtCount, fmtTime, indexBytes, litCells, multiplyAdds, shareChecked, sizeFromExp, speedup, vectorBytes,
} from './no-vector-index';

describe('no vector index what-if', () => {
  it('an exact scan checks every vector and costs N times 768 multiply-adds', () => {
    expect(bruteChecks(1000)).toBe(1000);
    expect(multiplyAdds(bruteChecks(1_000_000))).toBe(768_000_000);
  });
  it('scan time is bytes read over bandwidth (hand-checked: 1M x 768 x 4 B = 3.072 GB at 20 GB/s = 153.6 ms)', () => {
    expect(vectorBytes(1_000_000)).toBe(3_072_000_000);
    expect(bruteMs(1_000_000)).toBeCloseTo(153.6, 6);
    expect(bruteMs(2_000_000)).toBeCloseTo(2 * bruteMs(1_000_000), 6); // a straight line
  });
  it('index checks grow with log2 of the size (400 x log2 1,048,576 = 8,000)', () => {
    expect(annChecks(1_048_576)).toBe(8000);
    expect(annMs(1_048_576)).toBeCloseTo(4, 6);
    expect(annChecks(100)).toBe(100); // never more than a full scan
  });
  it('index time barely moves while scan time explodes', () => {
    const e = [1e4, 1e6, 1e8];
    expect(annMs(e[2]) / annMs(e[0])).toBeLessThan(3);
    expect(bruteMs(e[2]) / bruteMs(e[0])).toBeCloseTo(1e4, 3);
    expect(speedup(1e6)).toBeGreaterThan(30);
    expect(speedup(1e9)).toBeGreaterThan(speedup(1e6));
  });
  it('small collections: the scan wins; the crossover is in the tens of thousands', () => {
    expect(speedup(1000)).toBeLessThan(1);
    const c = crossover();
    expect(c).toBeGreaterThan(10_000);
    expect(c).toBeLessThan(40_000);
    expect(annMs(c)).toBeLessThanOrEqual(bruteMs(c));
    expect(annMs(c - 5)).toBeGreaterThanOrEqual(bruteMs(c - 5) - 1e-9);
  });
  it('the scan goes over a 100 ms budget at about 650,000 vectors', () => {
    expect(BUDGET_MS).toBe(100);
    expect(brutePastBudget()).toBe(651_042);
    expect(bruteMs(brutePastBudget())).toBeGreaterThanOrEqual(100);
  });
  it('the index costs extra memory: 16 links of 4 bytes per vector', () => {
    expect(indexBytes(1_000_000)).toBe(64_000_000);
    expect(indexBytes(1_000_000) / vectorBytes(1_000_000)).toBeCloseTo(64 / 3072, 10);
  });
  it('lights the share of cells that one search touches', () => {
    expect(litCells(1e6, false, 200)).toBe(200);
    expect(litCells(1e6, true, 200)).toBe(2); // 0.8% of 200 cells is 1.6, rounded up
    expect(litCells(1e9, true, 200)).toBe(1);
    expect(shareChecked(1e6, true)).toBeCloseTo(0.007973, 5);
    expect(litCells(1000, true, 200)).toBe(200); // index = scan at this size
  });
  it('formats', () => {
    expect(sizeFromExp(6)).toBe(1_000_000);
    expect(sizeFromExp(2.5)).toBe(316);
    expect(fmtCount(1_500_000)).toBe('1.5 million');
    expect(fmtCount(1e9)).toBe('1 billion');
    expect(fmtCount(5000)).toBe('5,000');
    expect(fmtTime(0.2)).toBe('200 microseconds');
    expect(fmtTime(153.6)).toBe('154 ms');
    expect(fmtTime(2500)).toBe('2.5 s');
  });
});
