import { describe, expect, it } from 'vitest';
import { PARAM_COUNT, decode, encode, initParams, klGauss, lossAndGrad, makeData, summarise, train } from './autoencoder';

describe('klGauss', () => {
  it('is zero for the standard bell curve', () => {
    expect(klGauss(0, 0)).toBe(0);
  });
  it('matches a hand calculation: mean 1, variance 0.25', () => {
    // 0.5 * (1 + 0.25 - 1 - ln 0.25) = 0.5 * (0.25 + 1.386294) = 0.818147
    expect(klGauss(1, Math.log(0.25))).toBeCloseTo(0.818147, 5);
  });
  it('grows as the mean moves away from zero', () => {
    expect(klGauss(2, 0)).toBeGreaterThan(klGauss(1, 0));
    expect(klGauss(1, 0)).toBeCloseTo(0.5, 10);
  });
});

describe('gradients', () => {
  const data = makeData('clumps', 12, 3);
  const eps = data.map((_, i) => Math.sin(i + 1));
  for (const [mode, w] of [['ae', 0], ['vae', 0.3]] as const) {
    it(`match finite differences (${mode})`, () => {
      const p = initParams(4);
      const { grad } = lossAndGrad(p, data, mode, w, eps);
      const h = 1e-6;
      for (let i = 0; i < PARAM_COUNT; i += 3) {
        const a = Float64Array.from(p);
        const b = Float64Array.from(p);
        a[i] += h;
        b[i] -= h;
        const num = (lossAndGrad(a, data, mode, w, eps).loss - lossAndGrad(b, data, mode, w, eps).loss) / (2 * h);
        expect(grad[i]).toBeCloseTo(num, 5);
      }
    });
  }
});

describe('training', () => {
  const clumps = makeData('clumps', 160, 1);
  it('is repeatable for a seed', () => {
    const a = train(clumps, 'vae', 0.05, 2, 100);
    const b = train(clumps, 'vae', 0.05, 2, 100);
    expect(Array.from(a.params)).toEqual(Array.from(b.params));
  });
  it('lowers the loss', () => {
    const t = train(clumps, 'vae', 0.05, 1, 300);
    expect(t.lossHistory[t.lossHistory.length - 1]).toBeLessThan(t.lossHistory[0] / 2);
  });
  it('lets a plain autoencoder rebuild the points through a one-number code', () => {
    const s = summarise(train(clumps, 'ae', 0, 1), clumps);
    expect(s.recon).toBeLessThan(0.1);
  });
  it('encode and decode agree with the summary', () => {
    const t = train(clumps, 'ae', 0, 1, 200);
    const { mu } = encode(t.params, clumps[0]);
    const s = summarise(t, clumps);
    expect(s.codes[0]).toBe(mu);
    expect(decode(t.params, mu)).toHaveLength(2);
  });
  it('VAE codes sit near a standard bell curve, a plain autoencoder code scale is arbitrary', () => {
    for (const seed of [1, 2, 3]) {
      const v = summarise(train(clumps, 'vae', 0.05, seed), clumps);
      expect(Math.abs(v.codeMean)).toBeLessThan(0.25);
      expect(v.codeStd).toBeGreaterThan(0.8);
      expect(v.codeStd).toBeLessThan(1.4);
    }
  });
  it('on two clumps, samples drawn from the prior land on real data more often for the VAE', () => {
    for (const seed of [1, 2, 3]) {
      const ae = summarise(train(clumps, 'ae', 0, seed), clumps);
      const vae = summarise(train(clumps, 'vae', 0.05, seed), clumps);
      expect(vae.priorOnData).toBeGreaterThan(ae.priorOnData);
      expect(vae.priorOnData).toBeGreaterThan(0.8);
    }
  });
  it('a heavy KL weight blurs the reconstruction (the trade-off)', () => {
    const arc = makeData('arc', 160, 1);
    const light = summarise(train(arc, 'vae', 0.05, 1), arc);
    const heavy = summarise(train(arc, 'vae', 1, 1), arc);
    expect(heavy.recon).toBeGreaterThan(5 * light.recon);
    expect(heavy.kl).toBeLessThan(light.kl);
  });
});
