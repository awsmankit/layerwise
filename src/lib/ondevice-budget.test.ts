import { describe, expect, it } from 'vitest';
import { BITS, DEVICES, MODELS, bandwidthFromRate, budget, kvBytesPerToken, kvGB, weightsGB } from './ondevice-budget';

const model = (id: string) => MODELS.find((m) => m.id === id)!;
const device = (id: string) => DEVICES.find((d) => d.id === id)!;

describe('weights', () => {
  it('are parameters times bits divided by eight', () => {
    expect(weightsGB(3.8, 4)).toBeCloseTo(1.9, 6);
    expect(weightsGB(8, 16)).toBeCloseTo(16, 6);
    expect(weightsGB(1, 8)).toBeCloseTo(1, 6);
  });
  it('agree with the Phi-3 report (4-bit 3.8B is about 1.8 GB) to within 10 percent', () => {
    expect(Math.abs(weightsGB(3.8, 4) - 1.8) / 1.8).toBeLessThan(0.1);
  });
});

describe('KV cache', () => {
  it('matches the worked examples in the lesson', () => {
    const phi = model('phi3-mini');
    const perTokenPhi = kvBytesPerToken(phi.layers, phi.kvHeads, phi.headDim, 2);
    expect(perTokenPhi).toBe(393216);
    expect(kvGB(perTokenPhi, 4096)).toBeCloseTo(1.6106, 3);
    const q = model('qwen25-3b');
    const perTokenQ = kvBytesPerToken(q.layers, q.kvHeads, q.headDim, 2);
    expect(perTokenQ).toBe(36864);
    expect(kvGB(perTokenQ, 8192)).toBeCloseTo(0.302, 3);
    expect(perTokenPhi / perTokenQ).toBeCloseTo(10.67, 2);
  });
  it('halves with an 8-bit cache and doubles with double the context', () => {
    const m = model('qwen25-1.5b');
    const a = kvBytesPerToken(m.layers, m.kvHeads, m.headDim, 2);
    const b = kvBytesPerToken(m.layers, m.kvHeads, m.headDim, 1);
    expect(a).toBe(2 * b);
    expect(kvGB(a, 8000)).toBeCloseTo(2 * kvGB(a, 4000), 9);
  });
});

describe('bandwidth from the memory rate', () => {
  it('reproduces the Snapdragon X Elite brief: 8448 MT/s on a 128-bit bus is about 135 GB/s', () => {
    expect(bandwidthFromRate(8448, 128)).toBeCloseTo(135.168, 3);
    expect(Math.round(bandwidthFromRate(8448, 128))).toBe(135);
  });
});

describe('budget', () => {
  const q4 = BITS.find((b) => b.id === 'q4k')!.bits;
  it('fits a 1.5B 4.5-bit model with 4k context on the example phone', () => {
    const r = budget({ model: model('qwen25-1.5b'), device: device('phone'), reservedShare: 0.5, bitsPerWeight: q4, kvBytes: 2, contextTokens: 4096, efficiency: 0.6 });
    expect(r.weights).toBeCloseTo(0.866, 2);
    expect(r.verdict).toBe('fits');
    expect(r.usable).toBeCloseTo(6, 6);
    expect(r.headroom).toBeGreaterThan(0);
  });
  it('does not fit a 16-bit Phi-3-mini on an 8 GB Jetson', () => {
    const r = budget({ model: model('phi3-mini'), device: device('jetson'), reservedShare: 0.25, bitsPerWeight: 16, kvBytes: 2, contextTokens: 4096, efficiency: 0.6 });
    expect(r.weights).toBeCloseTo(7.6, 6);
    expect(r.verdict).toBe('no');
    expect(r.maxContextThatFits).toBe(0);
  });
  it('the speed ceiling is bandwidth divided by bytes read per token', () => {
    const r = budget({ model: model('phi3-mini'), device: device('macbook'), reservedShare: 0.4, bitsPerWeight: 4, kvBytes: 2, contextTokens: 1000, efficiency: 0.5 });
    const read = 1.9 + (393216 * 1000) / 1e9;
    expect(r.readPerTokenGB).toBeCloseTo(read, 9);
    expect(r.ceilingTps).toBeCloseTo(120 / read, 9);
    expect(r.estimateTps).toBeCloseTo((120 / read) * 0.5, 9);
  });
  it('maximum context uses the memory left after weights and overhead', () => {
    const r = budget({ model: model('qwen25-3b'), device: device('ipad'), reservedShare: 0.4, bitsPerWeight: 4.5, kvBytes: 2, contextTokens: 1024, efficiency: 1 });
    const spare = 12 * 0.6 - (3.09 * 4.5) / 8 - 0.3;
    expect(r.maxContextThatFits).toBe(Math.floor((spare * 1e9) / 36864));
  });
  it('flags tight when above 85 percent of usable memory but under 100', () => {
    const r = budget({ model: model('phi3-mini'), device: { ramGB: 8, bandwidthGBs: 50 }, reservedShare: 0.5, bitsPerWeight: 4, kvBytes: 2, contextTokens: 4096, efficiency: 1 });
    // usable 4.0; total 1.9 + 1.61 + 0.3 = 3.81, which is 95 percent
    expect(r.verdict).toBe('tight');
  });
  it('lists the invented phone as an assumption and the others as datasheet figures', () => {
    expect(device('phone').basis).toBe('assumption');
    expect(DEVICES.filter((d) => d.basis === 'datasheet')).toHaveLength(4);
  });
});
