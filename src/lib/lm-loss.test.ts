import { describe, expect, it } from 'vitest';
import { KL_MODELS, MODEL_PRESETS, P_STEPS, SENTENCE_TEXT, TRUTH, bits, bitsPerByte, crossEntropy, entropy, kl, meanBits, perplexity, utf8Bytes } from './lm-loss';

describe('cross-entropy and perplexity', () => {
  it('bits of surprise for powers of one half', () => {
    expect(P_STEPS.map(bits)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
  it('a model that gives probability 1 to every true token has loss 0 and perplexity 1', () => {
    expect(meanBits([1, 1, 1])).toBe(0);
    expect(perplexity([1, 1, 1])).toBe(1);
  });
  it('a model that is always 1/4 sure has perplexity 4 (like choosing among four equally likely words)', () => {
    expect(meanBits([0.25, 0.25, 0.25])).toBe(2);
    expect(perplexity([0.25, 0.25, 0.25])).toBe(4);
  });
  it('hand example: bits 1,2,0,1,3,2 average 1.5 and perplexity 2^1.5', () => {
    const probs = [1, 2, 0, 1, 3, 2].map((b) => Math.pow(2, -b));
    expect(meanBits(probs)).toBeCloseTo(1.5, 12);
    expect(perplexity(probs)).toBeCloseTo(2.8284271, 6);
  });
  it('perplexity from bits equals exp of the mean natural-log loss', () => {
    const probs = [0.5, 0.125, 0.25];
    const nats = probs.reduce((s, p) => s - Math.log(p), 0) / 3;
    expect(perplexity(probs)).toBeCloseTo(Math.exp(nats), 10);
  });
});

describe('bits per byte', () => {
  it('the example sentence is 22 bytes', () => {
    expect(utf8Bytes(SENTENCE_TEXT)).toBe(22);
  });
  it('is independent of how the text is cut into tokens', () => {
    const total = 9; // bits for the whole sentence
    expect(bitsPerByte(total, 22)).toBeCloseTo(9 / 22, 12);
    // per-token perplexity differs a lot between 6 tokens and 22 characters
    expect(Math.pow(2, total / 6)).toBeCloseTo(2.83, 2);
    expect(Math.pow(2, total / 22)).toBeCloseTo(1.328, 3);
  });
  it('counts bytes, not characters, for non-ASCII text', () => {
    expect(utf8Bytes('café')).toBe(5);
  });
});

describe('KL divergence', () => {
  it('entropy of the example truth is 1.75 bits', () => {
    expect(entropy(TRUTH)).toBeCloseTo(1.75, 12);
  });
  it('a uniform guess pays 2 bits, so 0.25 bits more than the entropy', () => {
    const flat = KL_MODELS.find((m) => m.id === 'flat')!.q;
    expect(crossEntropy(TRUTH, flat)).toBeCloseTo(2, 12);
    expect(kl(TRUTH, flat)).toBeCloseTo(0.25, 12);
  });
  it('the exactly-right model has zero KL', () => {
    expect(kl(TRUTH, KL_MODELS[0].q)).toBeCloseTo(0, 12);
  });
  it('KL is never negative and is not symmetric', () => {
    for (const m of KL_MODELS) expect(kl(TRUTH, m.q)).toBeGreaterThanOrEqual(-1e-12);
    const q = KL_MODELS.find((m) => m.id === 'cocky')!.q;
    expect(kl(TRUTH, q)).not.toBeCloseTo(kl(q, TRUTH), 3);
  });
  it('confidently wrong costs more than overconfident', () => {
    const k = (id: string) => kl(TRUTH, KL_MODELS.find((m) => m.id === id)!.q);
    expect(k('wrong')).toBeGreaterThan(k('cocky'));
  });
});

describe('presets', () => {
  it('give the model order small > bigger in loss, and a confidently wrong model is worst', () => {
    const ppl = (id: string) => perplexity(MODEL_PRESETS.find((m) => m.id === id)!.steps.map((i) => P_STEPS[i]));
    expect(ppl('big')).toBeLessThan(ppl('small'));
    expect(ppl('sure')).toBeGreaterThan(ppl('small'));
  });
});
