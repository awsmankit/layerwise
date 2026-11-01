import { describe, expect, it } from 'vitest';
import {
  GIB,
  JAMBA_SHAPE as S,
  LAYOUTS,
  MIB,
  attentionDecodeMacs,
  attentionPairs,
  cacheBytes,
  compose,
  decodeMacs,
  fixedGates,
  gatedState,
  holdShares,
  kvBytes,
  kvBytesPerToken,
  memoryCrossover,
  parallelScan,
  prefillPairs,
  recurrence,
  scanDepth,
  selectiveGates,
  ssmDecodeMacs,
  ssmStateBytes,
  ssmStateValues,
} from './ssm';

describe('attention against state: counting', () => {
  it('counts causal pairs as n(n+1)/2 and quadruples (nearly) when n doubles', () => {
    expect(attentionPairs(4)).toBe(10);
    expect(attentionPairs(1000)).toBe(500500);
    expect(attentionPairs(2000) / attentionPairs(1000)).toBeCloseTo(4, 2);
  });

  it('reproduces the KV cache sizes in the Jamba paper table at 256K tokens (GB there means GiB)', () => {
    const n = 262144;
    expect(kvBytes(n, S, 4) / GIB).toBe(4); // Jamba: 4 attention layers, 8 KV heads
    expect(kvBytes(n, S, 32) / GIB).toBe(32); // Mistral and Mixtral: 32 layers, 8 KV heads
    expect(kvBytes(n, { ...S, kvHeads: 32 }, 32) / GIB).toBe(128); // Llama-2 7B: 32 KV heads
  });

  it('gives 131,072 bytes per token for 32 layers of 8 KV heads of size 128, and one eighth of that for 4 layers', () => {
    expect(kvBytesPerToken(S, 32)).toBe(131072);
    expect(kvBytesPerToken(S, 4)).toBe(16384);
    expect(kvBytesPerToken(S, 0)).toBe(0);
  });

  it('sizes the state of a Mamba-style layer as expand x width x N', () => {
    expect(ssmStateValues(S)).toBe(2 * 4096 * 16);
    expect(ssmStateBytes(S, 4) / MIB).toBe(7); // 28 layers x 131,072 values x 2 bytes
    expect(ssmStateBytes(S, 0) / MIB).toBe(8);
    expect(ssmStateBytes(S, 32)).toBe(0);
  });

  it('keeps the state the same at every length while the cache grows', () => {
    expect(ssmStateBytes(S, 4)).toBe(ssmStateBytes(S, 4));
    expect(cacheBytes(2000, S, 4) - cacheBytes(1000, S, 4)).toBe(16384 * 1000);
    expect(cacheBytes(1000, S, 0)).toBe(cacheBytes(1_000_000, S, 0));
  });

  it('finds the length below which the state is bigger than the cache it replaces: 64 tokens for this shape', () => {
    expect(memoryCrossover(S, 4)).toBe(64);
    expect(memoryCrossover(S, 0)).toBe(64);
    expect(memoryCrossover(S, 32)).toBe(Infinity);
    expect(cacheBytes(63, S, 4)).toBeGreaterThan(kvBytes(63, S, 32));
    expect(cacheBytes(65, S, 4)).toBeLessThan(kvBytes(65, S, 32));
  });

  it('counts length-dependent work per generated token', () => {
    expect(attentionDecodeMacs(1000, S)).toBe(8_192_000);
    expect(ssmDecodeMacs(S)).toBe(393_216);
    expect(decodeMacs(1000, S, 32)).toBe(32 * 8_192_000);
    expect(decodeMacs(1000, S, 0)).toBe(32 * 393_216);
    // a hybrid mixes them
    expect(decodeMacs(1000, S, 4)).toBe(4 * 8_192_000 + 28 * 393_216);
    expect(decodeMacs(2000, S, 0)).toBe(decodeMacs(1000, S, 0));
  });

  it('counts prefill pair scores over heads and attention layers', () => {
    expect(prefillPairs(4, S, 32)).toBe(10 * 32 * 32);
    expect(prefillPairs(4, S, 0)).toBe(0);
  });

  it('has three layouts that fill the same 32 layers', () => {
    expect(LAYOUTS.map((l) => l.attnLayers)).toEqual([32, 4, 0]);
  });

  it('computes the depth of a parallel scan', () => {
    expect(scanDepth(1)).toBe(0);
    expect(scanDepth(8)).toBe(3);
    expect(scanDepth(9)).toBe(4);
    expect(scanDepth(1_000_000)).toBe(20);
  });
});

describe('the recurrence', () => {
  const steps = [0.9, 0.5, 0.2, 1.1, 0.7, 0.3, 0.8].map((a, i) => ({ a, b: Math.sin(i + 1) }));

  it('composition is associative, so the steps can be grouped in any order', () => {
    const [p, q, r] = [steps[0], steps[1], steps[2]];
    const left = compose(compose(p, q), r);
    const right = compose(p, compose(q, r));
    expect(left.a).toBeCloseTo(right.a, 12);
    expect(left.b).toBeCloseTo(right.b, 12);
  });

  it('a parallel scan gives the same states as the step-by-step loop', () => {
    const seq = recurrence(steps, 0.4);
    const par = parallelScan(steps, 0.4);
    par.states.forEach((v, i) => expect(v).toBeCloseTo(seq[i], 10));
    expect(par.rounds).toBe(scanDepth(steps.length));
  });
});

describe('the selective gate', () => {
  it('matches the worked example in the lesson', () => {
    const x = [4, 0, 0, 0, 0];
    const fixed = gatedState(x, fixedGates(5, 0.3));
    [1.2, 0.84, 0.588, 0.4116, 0.28812].forEach((v, i) => expect(fixed[i]).toBeCloseTo(v, 10));
    const sel = gatedState(x, [0.9, 0.05, 0.05, 0.05, 0.05]);
    [3.6, 3.42, 3.249, 3.08655, 2.9322225].forEach((v, i) => expect(sel[i]).toBeCloseTo(v, 10));
    expect(fixed[4] / 4).toBeCloseTo(0.072, 3);
    expect(sel[4] / 4).toBeCloseTo(0.733, 3);
  });

  it('shares of the state add up to 1 minus what is left of the start', () => {
    const g = [0.3, 0.3, 0.3];
    const shares = holdShares(g, 2);
    expect(shares[0]).toBeCloseTo(0.147, 12);
    expect(shares[1]).toBeCloseTo(0.21, 12);
    expect(shares[2]).toBeCloseTo(0.3, 12);
    expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(1 - 0.7 ** 3, 12);
  });

  it('shares explain the state: sum of share x input equals the recurrence', () => {
    const x = [2, -1, 5, 0, 3, 1];
    const g = [0.2, 0.7, 0.1, 0.5, 0.9, 0.05];
    const h = gatedState(x, g);
    for (let t = 0; t < x.length; t++) {
      const shares = holdShares(g, t);
      expect(shares.reduce((acc, w, s) => acc + w * x[s], 0)).toBeCloseTo(h[t], 12);
    }
  });

  it('a fixed gate forgets by a fixed factor; a selective gate keeps a marked token', () => {
    const marked = [false, false, true, false, false, false, false, false, false, false];
    const fixed = holdShares(fixedGates(10, 0.3), 9)[2];
    const sel = holdShares(selectiveGates(marked), 9)[2];
    expect(fixed).toBeCloseTo(0.3 * 0.7 ** 7, 12);
    expect(sel).toBeCloseTo(0.9 * 0.97 ** 7, 12);
    expect(sel).toBeGreaterThan(10 * fixed);
  });

  it('a second marked token pushes the first one out', () => {
    const one = selectiveGates([true, false, false, false]);
    const two = selectiveGates([true, false, true, false]);
    expect(holdShares(two, 3)[0]).toBeLessThan(holdShares(one, 3)[0] / 5);
  });
});
