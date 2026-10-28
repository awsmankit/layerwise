import { describe, expect, it } from 'vitest';
import { gpus, gpuById } from '../data/gpus';
import { rackGpus, examplePrice } from '../games/rackstack';
import { estimate, usableGB, PARALLEL_EFFICIENCY } from './gpu';

const h100 = gpuById('h100');
const l4 = gpuById('l4');
const t4 = gpuById('t4');

describe('gpu data', () => {
  it('has unique ids and sane values', () => {
    expect(new Set(gpus.map((g) => g.id)).size).toBe(gpus.length);
    for (const g of gpus) {
      expect(g.memGB, g.id).toBeGreaterThan(8);
      expect(g.bwGBs, g.id).toBeGreaterThan(100);
      expect(g.clouds.length, g.id).toBeGreaterThan(3);
    }
  });

  it('keeps the verified headline figures from the vendor and cloud docs', () => {
    expect(gpuById('h100')).toMatchObject({ memGB: 80, bwGBs: 3350 });
    expect(gpuById('h200')).toMatchObject({ memGB: 141, bwGBs: 4800 });
    expect(gpuById('l40s').bwGBs).toBe(864);
    expect(gpuById('a100-80').bwGBs).toBe(2039);
    expect(gpuById('ironwood')).toMatchObject({ memGB: 192, bwGBs: 7370 });
  });

  it('keeps the figures read from AMD, Google and AWS pages in October 2026', () => {
    expect(gpuById('mi325x')).toMatchObject({ memGB: 256, bwGBs: 6000, memType: 'HBM3E' });
    expect(gpuById('mi355x')).toMatchObject({ memGB: 288, bwGBs: 8000, memType: 'HBM3E' });
    expect(gpuById('tpu-v6e')).toMatchObject({ memGB: 32, bwGBs: 1638 });
    expect(gpuById('trainium2')).toMatchObject({ vendor: 'AWS', memGB: 96, bwGBs: 2900 });
    // the Trn2 instance page lists 1.5 TB and 46 TB/s across 16 chips
    expect(gpuById('trainium2').memGB * 16).toBeCloseTo(1536, -1);
    expect(gpuById('trainium2').bwGBs * 16).toBeCloseTo(46400, -3);
  });

  it('keeps the Blackwell figures NVIDIA states, or that follow from its totals by division', () => {
    // GB200: a superchip has 2 GPUs and 372 GB at 16 TB/s; the NVL72 rack has 72 GPUs, 13.4 TB and 576 TB/s
    expect(gpuById('gb200')).toMatchObject({ memGB: 186, bwGBs: 8000 });
    expect(gpuById('gb200').memGB * 2).toBe(372);
    expect(gpuById('gb200').memGB * 72).toBeCloseTo(13400, -2);
    expect(gpuById('gb200').bwGBs * 72).toBe(576000);
    // B300: NVIDIA's technical blog gives 288 GB and 8 TB/s per GPU
    expect(gpuById('b300')).toMatchObject({ memGB: 288, bwGBs: 8000, approx: true });
    expect(gpuById('b300').memGB).toBeGreaterThan(gpuById('b200').memGB);
  });

  it('leaves parts flagged game: false out of Rack and Stack, so they need no example price', () => {
    for (const id of ['b300', 'gb200']) {
      expect(gpuById(id).game, id).toBe(false);
      expect(rackGpus.some((g) => g.id === id), id).toBe(false);
      expect(examplePrice[id], id).toBeUndefined();
    }
    expect(rackGpus.some((g) => g.id === 'b200')).toBe(true);
  });

  it('MI355X has more memory and bandwidth than MI325X, which beats MI300X', () => {
    expect(gpuById('mi355x').memGB).toBeGreaterThan(gpuById('mi325x').memGB);
    expect(gpuById('mi325x').memGB).toBeGreaterThan(gpuById('mi300x').memGB);
    expect(gpuById('mi325x').bwGBs).toBeGreaterThan(gpuById('mi300x').bwGBs);
  });

  it('every vendor part is one of the four the explorer groups', () => {
    for (const g of gpus) expect(['NVIDIA', 'AMD', 'Google', 'AWS']).toContain(g.vendor);
  });

  it('HBM parts have several times the bandwidth of the GDDR cards', () => {
    const hbm = gpus.filter((g) => g.memType.startsWith('HBM')).map((g) => g.bwGBs);
    const gddr = gpus.filter((g) => g.memType.startsWith('GDDR')).map((g) => g.bwGBs);
    expect(Math.min(...hbm)).toBeGreaterThan(Math.max(...gddr));
  });
});

describe('estimate', () => {
  it('matches the hand calculation for an 8B FP16 model on one H100', () => {
    const e = estimate(h100, 1, '8B', 'fp16', 'fp16', 8192, 1);
    expect(e.weightsGB).toBeCloseTo(16, 6);
    expect(e.kvPerUserGB).toBeCloseTo((131072 * 8192) / 1e9, 6);
    const expected = (3350 * 0.65) / (16 + (131072 * 8192) / 1e9);
    expect(e.perUserTokS).toBeCloseTo(expected, 6);
    expect(e.fits).toBe(true);
  });

  it('a bigger model does not fit a small card, and reports zero speed', () => {
    const e = estimate(t4, 1, '70B', 'fp16', 'fp16', 4096, 1);
    expect(e.fits).toBe(false);
    expect(e.perUserTokS).toBe(0);
    expect(e.maxUsers).toBe(0);
    expect(e.devicesNeeded).toBeGreaterThan(8);
  });

  it('quantizing weights makes decode faster, because there is less to read', () => {
    const fp16 = estimate(h100, 1, '8B', 'fp16', 'fp16', 4096, 1);
    const int8 = estimate(h100, 1, '8B', 'int8', 'fp16', 4096, 1);
    const int4 = estimate(h100, 1, '8B', 'int4', 'fp16', 4096, 1);
    expect(int8.perUserTokS).toBeGreaterThan(fp16.perUserTokS);
    expect(int4.perUserTokS).toBeGreaterThan(int8.perUserTokS);
  });

  it('more bandwidth means faster decode on the same model', () => {
    const a = estimate(l4, 1, '8B', 'int8', 'fp16', 4096, 1);
    const b = estimate(h100, 1, '8B', 'int8', 'fp16', 4096, 1);
    expect(b.perUserTokS).toBeGreaterThan(a.perUserTokS * 5);
  });

  it('more users slow each user down but raise total throughput', () => {
    const one = estimate(h100, 1, '8B', 'fp16', 'fp16', 4096, 1);
    const many = estimate(h100, 1, '8B', 'fp16', 'fp16', 4096, 16);
    expect(many.perUserTokS).toBeLessThan(one.perUserTokS);
    expect(many.totalTokS).toBeGreaterThan(one.totalTokS);
  });

  it('maxUsers is the largest count that still fits', () => {
    const e = estimate(h100, 1, '8B', 'fp16', 'fp16', 8192, 1);
    expect(e.maxUsers).toBeGreaterThan(0);
    const atMax = estimate(h100, 1, '8B', 'fp16', 'fp16', 8192, e.maxUsers);
    const over = estimate(h100, 1, '8B', 'fp16', 'fp16', 8192, e.maxUsers + 1);
    expect(atMax.fits).toBe(true);
    expect(over.fits).toBe(false);
  });

  it('splitting across devices adds memory and bandwidth, with a communication penalty', () => {
    const one = estimate(h100, 1, '70B', 'int4', 'fp8', 8192, 4);
    const two = estimate(h100, 2, '70B', 'int4', 'fp8', 8192, 4);
    expect(two.capacityGB).toBeGreaterThan(one.capacityGB * 1.9);
    expect(PARALLEL_EFFICIENCY[2]).toBeLessThan(1);
    expect(usableGB(h100, 2)).toBeCloseTo(2 * (80 * 0.9 - 1.5), 6);

    // a model that fits on one device: two devices are faster, but less than twice as fast
    const solo = estimate(h100, 1, '8B', 'fp16', 'fp16', 4096, 1);
    const duo = estimate(h100, 2, '8B', 'fp16', 'fp16', 4096, 1);
    expect(duo.perUserTokS).toBeGreaterThan(solo.perUserTokS);
    expect(duo.perUserTokS).toBeLessThan(solo.perUserTokS * 2);
  });

  it('devicesNeeded is consistent with fits', () => {
    for (const g of gpus) {
      const e = estimate(g, 1, '70B', 'int4', 'fp8', 4096, 2);
      const needed = estimate(g, e.devicesNeeded, '70B', 'int4', 'fp8', 4096, 2);
      expect(needed.fits).toBe(true);
    }
  });
});
