import { describe, expect, it } from 'vitest';
import { batchSizes, costPerMTok, example, kvPerUserGB, lastReplySeconds, maxBatch, modeCost, modeTokS, perUserTokS, stepSeconds, totalTokS, weightsGB } from './no-batching';

describe('no batching what-if', () => {
  it('example model is 16 GB and each 2,000-token cache is 0.262144 GB', () => {
    expect(weightsGB()).toBe(16);
    expect(kvPerUserGB()).toBeCloseTo(0.262144, 9);
  });
  it('one user: (16 + 0.262144) GB over 1,300 GB/s is about 12.5 ms, 79.9 tokens per second', () => {
    expect(stepSeconds(1)).toBeCloseTo(16.262144 / 1300, 9);
    expect(totalTokS(1)).toBeCloseTo(1300 / 16.262144, 6);
    expect(totalTokS(1)).toBeGreaterThan(79.9);
    expect(totalTokS(1)).toBeLessThan(80);
  });
  it('cost per million tokens at batch 1 is price per second over tokens per second', () => {
    expect(costPerMTok(1)).toBeCloseTo((2.5 / 3600 / (1300 / 16.262144)) * 1e6, 6);
    expect(costPerMTok(1)).toBeCloseTo(8.69, 2);
  });
  it('throughput rises and cost per token falls with batch size', () => {
    for (let i = 1; i < batchSizes.length; i++) {
      expect(totalTokS(batchSizes[i])).toBeGreaterThan(totalTokS(batchSizes[i - 1]));
      expect(costPerMTok(batchSizes[i])).toBeLessThan(costPerMTok(batchSizes[i - 1]));
    }
  });
  it('each user slows down a little as the batch grows', () => {
    expect(perUserTokS(64)).toBeLessThan(perUserTokS(1));
    expect(perUserTokS(64)).toBeGreaterThan(perUserTokS(1) / 3);
  });
  it('is memory-bound at these sizes: compute time is far below memory time', () => {
    const compute = (64 * 2 * example.paramsB * 1e9) / (example.tflops * 1e12);
    expect(compute).toBeLessThan(stepSeconds(64) / 8);
  });
  it('the compute ceiling takes over when the arithmetic is slow', () => {
    const slow = { ...example, tflops: 1 };
    expect(stepSeconds(8, slow)).toBeCloseTo((8 * 16e9) / 1e12, 9);
  });
  it('memory allows 213 users at this context length', () => {
    expect(maxBatch()).toBe(Math.floor((72 - 16) / 0.262144));
    expect(maxBatch({ ...example, memGB: 16 })).toBe(0);
  });
  it('last reply: one at a time waits n full replies; batched waits one slower reply', () => {
    expect(lastReplySeconds(1, false)).toBeCloseTo(200 * stepSeconds(1), 9);
    expect(lastReplySeconds(8, false)).toBeCloseTo(8 * lastReplySeconds(1, false), 9);
    expect(lastReplySeconds(8, true)).toBeCloseTo(200 * stepSeconds(8), 9);
    expect(lastReplySeconds(64, true)).toBeLessThan(lastReplySeconds(64, false) / 30);
  });
  it('mode helpers: one at a time never improves with more waiting', () => {
    expect(modeTokS(64, false)).toBe(modeTokS(1, true));
    expect(modeCost(64, false)).toBe(costPerMTok(1));
    expect(modeTokS(64, true)).toBe(totalTokS(64));
  });
});
