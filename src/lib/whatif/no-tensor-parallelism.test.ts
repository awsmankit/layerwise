import { describe, expect, it } from 'vitest';
import { example, fewestGpus, kvBytesPerToken, kvGB, links, maxContext, models, split, splits, totalGB, usableGB, weightsGB, type Setup } from './no-tensor-parallelism';

const m = (id: string) => models.find((x) => x.id === id)!;
const setup = (id: string, gpuGB: number, over: Partial<Setup> = {}): Setup => ({ model: m(id), gpuGB, weightBytes: 2, batch: 8, context: 8192, ...over });
const fast = links[0].gbPerS;
const slow = links[1].gbPerS;

describe('no tensor parallelism what-if', () => {
  it('weights: 70B parameters at 2 bytes is 140 GB, at 1 byte 70 GB', () => {
    expect(weightsGB(setup('70b', 80))).toBeCloseTo(140, 9);
    expect(weightsGB(setup('70b', 80, { weightBytes: 1 }))).toBeCloseTo(70, 9);
    expect(weightsGB(setup('8b', 24))).toBeCloseTo(16, 9);
  });
  it('KV cache per token is 2 x layers x kv heads x head width x 2 bytes: 128 KiB for the 8B shape, 320 KiB for the 70B shape', () => {
    expect(kvBytesPerToken(m('8b'))).toBe(2 * 32 * 8 * 128 * 2);
    expect(kvBytesPerToken(m('8b'))).toBe(128 * 1024);
    expect(kvBytesPerToken(m('70b'))).toBe(320 * 1024);
  });
  it('KV cache grows in a straight line with batch and with context', () => {
    const base = kvGB(setup('70b', 80));
    expect(base).toBeCloseTo((8 * 8192 * 327680) / 1e9, 9);
    expect(kvGB(setup('70b', 80, { batch: 16 }))).toBeCloseTo(2 * base, 9);
    expect(kvGB(setup('70b', 80, { context: 16384 }))).toBeCloseTo(2 * base, 9);
    expect(totalGB(setup('70b', 80))).toBeCloseTo(140 + base, 9);
  });
  it('the 70B example does not fit on one 80 GB GPU (161.5 GB needed, 72 GB usable) and says by how much', () => {
    const r = split(setup('70b', 80), 1, fast);
    expect(usableGB(setup('70b', 80))).toBeCloseTo(72, 9);
    expect(r.perGpu).toBeCloseTo(161.4748, 3);
    expect(r.fits).toBe(false);
    expect(r.overBy).toBeCloseTo(89.4748, 3);
    expect(r.stepMs).toBeNull();
    expect(r.commBytes).toBe(0);
  });
  it('splitting divides weights and KV by n: 2 GPUs still do not fit, 4 do (40.4 GB each), 8 give 20.2 GB each', () => {
    const s = setup('70b', 80);
    expect(split(s, 2, fast).perGpu).toBeCloseTo(80.7374, 3);
    expect(split(s, 2, fast).fits).toBe(false);
    expect(split(s, 4, fast).perGpu).toBeCloseTo(40.3687, 3);
    expect(split(s, 4, fast).fits).toBe(true);
    expect(split(s, 8, fast).perGpu).toBeCloseTo(20.1844, 3);
    expect(fewestGpus(s)).toBe(4);
  });
  it('per-GPU memory falls with every doubling of GPUs', () => {
    const s = setup('70b', 141);
    let prev = Infinity;
    for (const n of splits) {
      const p = split(s, n, fast).perGpu;
      expect(p).toBeLessThan(prev);
      prev = p;
    }
  });
  it('communication: 2 all-reduces per layer, 160 for 80 layers; 4 GPUs at batch 8 send 160 x 1.5 x 8 x 8192 x 2 = 31,457,280 bytes per step', () => {
    const r = split(setup('70b', 80), 4, fast);
    expect(r.allReduces).toBe(160);
    expect(r.commBytes).toBe(160 * 1.5 * 8 * 8192 * 2);
    expect(r.commBytes).toBe(31457280);
  });
  it('step time = read time + communication time: 40.37 GB / 3,000 GB/s = 13.46 ms, plus 160 x 10 us + bytes over the link = 1.67 ms', () => {
    const r = split(setup('70b', 80), 4, fast);
    expect(r.readMs).toBeCloseTo(13.4562, 3);
    expect(r.commMs).toBeCloseTo(1.6 + 31457280 / 450e9 * 1000, 9);
    expect(r.stepMs).toBeCloseTo(r.readMs! + r.commMs!, 9);
    expect(r.commShare).toBeCloseTo(r.commMs! / r.stepMs!, 12);
  });
  it('a slow link makes communication cost more; more GPUs move more bytes per GPU and spend a bigger share on talking', () => {
    const s = setup('70b', 141, { batch: 32 });
    expect(split(s, 4, slow).commMs!).toBeGreaterThan(split(s, 4, fast).commMs!);
    expect(split(s, 8, fast).commBytes).toBeGreaterThan(split(s, 2, fast).commBytes);
    expect(split(s, 8, fast).commShare!).toBeGreaterThan(split(s, 2, fast).commShare!);
    expect(split(s, 8, slow).stepMs!).toBeGreaterThan(split(s, 8, fast).stepMs!);
  });
  it('a small model on a big GPU fits alone and pays no communication', () => {
    const r = split(setup('8b', 80), 1, fast);
    expect(r.fits).toBe(true);
    expect(r.commMs).toBe(0);
    expect(r.stepMs).toBeCloseTo(r.readMs!, 12);
    expect(fewestGpus(setup('8b', 80))).toBe(1);
  });
  it('some set-ups need more than 8 GPUs: 405B at 16-bit on 24 GB cards', () => {
    expect(fewestGpus(setup('405b', 24))).toBeNull();
    expect(fewestGpus(setup('405b', 141))).toBe(8);
  });
  it('8-bit weights halve the weight memory and can bring the model onto fewer GPUs', () => {
    expect(fewestGpus(setup('70b', 80, { weightBytes: 1 }))).toBe(2);
  });
  it('a longer context leaves less room: the longest context on 4 x 80 GB at batch 8 is about 56,000 tokens', () => {
    const s = setup('70b', 80);
    expect(maxContext(s, 4)).toBe(Math.floor(((72 * 4 - 140) * 1e9) / (8 * 327680)));
    expect(maxContext(s, 4)).toBeGreaterThan(50000);
    expect(maxContext(s, 1)).toBe(0);
    expect(maxContext(s, 8)).toBeGreaterThan(maxContext(s, 4));
    expect(example.usableShare).toBe(0.9);
  });
});
