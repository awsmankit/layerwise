import { describe, expect, it } from 'vitest';
import { DEVICES, MODELS, dsCnnSmall, estimate, fmtBytes, fmtEnergy, fmtHours, fmtTime, mobileNetV1, modelStats, type Options } from './edge-budget';

const base: Options = { bytesPerValue: 1, rate: 1, efficiency: 0.25, reserve: 0.25, batteryMah: 100, batteryVolts: 3 };
const dev = (id: string) => DEVICES.find((d) => d.id === id)!;

describe('model arithmetic', () => {
  it('reproduces the Hello Edge small DS-CNN: 38.6 KB of 8-bit weights plus activations, about 5.4 M ops', () => {
    const s = modelStats(dsCnnSmall());
    expect(s.params).toBe(22604);
    expect(s.peakActivationElems).toBe(16000);
    // the paper adds weights and the larger of two consecutive activation tensors, in 8 bits
    expect(s.params + s.peakActivationElems).toBe(38604);
    // the paper counts multiplications and additions: two operations per MAC
    expect(s.macs).toBe(2_336_000 + 320_000 + 768);
    expect(2 * s.macs).toBeGreaterThan(5.2e6);
    expect(2 * s.macs).toBeLessThan(5.45e6);
  });

  it('reproduces MobileNetV1 1.0 at 224: about 569 M multiply-adds and 4.2 M parameters', () => {
    const m = MODELS.find((x) => x.id === 'mnet')!;
    const s = modelStats(m);
    expect(s.macs / 1e6).toBeGreaterThan(565);
    expect(s.macs / 1e6).toBeLessThan(573);
    expect(s.params / 1e6).toBeGreaterThan(4.1);
    expect(s.params / 1e6).toBeLessThan(4.3);
  });

  it('puts the activation peak in an early, high-resolution layer', () => {
    const m = MODELS.find((x) => x.id === 'mnet')!;
    const s = modelStats(m);
    // first pointwise conv: 112x112x32 in, 112x112x64 out
    expect(s.peakActivationElems).toBe(112 * 112 * 32 + 112 * 112 * 64);
    expect(m.layers[s.peakLayer].name).toBe('pw 1');
  });

  it('shrinks with the width multiplier and resolution', () => {
    const small = modelStats(mobileNetV1({ alpha: 0.25, size: 96, classes: 2, id: 'x', name: 'x', blurb: '' }));
    const big = modelStats(mobileNetV1({ alpha: 1, size: 224, classes: 1000, id: 'y', name: 'y', blurb: '' }));
    expect(small.macs).toBeLessThan(big.macs / 50);
    expect(small.params).toBeLessThan(big.params / 10);
  });
});

describe('device fit', () => {
  const kws = modelStats(dsCnnSmall());
  const photo = modelStats(MODELS.find((x) => x.id === 'mnet')!);

  it('fits the keyword spotter in int8 on every device', () => {
    for (const d of DEVICES) expect(estimate(kws, d, base).fits).toBe(true);
  });

  it('does not fit the photo classifier in int8 on the RP2040: weights and activations both too big', () => {
    const e = estimate(photo, dev('rp2040'), base);
    expect(e.fits).toBe(false);
    expect(e.nvm!.ok).toBe(false);
    expect(e.ram.ok).toBe(false);
  });

  it('fits the photo classifier weights but not its activations on the Apollo4 when the weights fit', () => {
    const e = estimate(photo, dev('apollo4'), base);
    // 4.2 MB of weights is more than 2 MB of MRAM
    expect(e.nvm!.ok).toBe(false);
  });

  it('float32 needs four times the memory of int8', () => {
    const a = estimate(kws, dev('rp2040'), base);
    const b = estimate(kws, dev('rp2040'), { ...base, bytesPerValue: 4 });
    expect(b.weightBytes).toBe(4 * a.weightBytes);
    expect(b.arenaBytes).toBe(4 * a.arenaBytes);
  });

  it('counts weights and activations together on devices without separate non-volatile memory', () => {
    const e = estimate(kws, dev('jetson'), base);
    expect(e.nvm).toBeNull();
    expect(e.ram.used).toBe(e.weightBytes + e.arenaBytes);
  });

  it('shrinks the usable capacity by the reserve', () => {
    const e0 = estimate(kws, dev('rp2040'), { ...base, reserve: 0 });
    const e5 = estimate(kws, dev('rp2040'), { ...base, reserve: 0.5 });
    expect(e5.ram.capacity).toBeCloseTo(e0.ram.capacity / 2, 6);
  });
});

describe('speed and energy', () => {
  const kws = modelStats(dsCnnSmall());

  it('divides MACs by the achieved MACs per second', () => {
    const d = dev('rp2040');
    const e = estimate(kws, d, { ...base, efficiency: 0.5, rate: 10 });
    expect(e.seconds).toBeCloseTo(kws.macs / (d.peakMacsPerS * 0.5), 9);
    expect(e.busy).toBeCloseTo(e.seconds * 10, 9);
  });

  it('flags a device that cannot keep up', () => {
    const e = estimate(kws, dev('rp2040'), { ...base, efficiency: 0.01, rate: 100 });
    expect(e.keepsUp).toBe(false);
  });

  it('has no energy figure when the device has no documented power and none is typed', () => {
    const e = estimate(kws, dev('rp2040'), base);
    expect(e.energyJ).toBeNull();
    expect(e.batteryHours).toBeNull();
  });

  it('uses a typed power figure', () => {
    const e = estimate(kws, dev('rp2040'), { ...base, powerOverrideW: 0.02, rate: 10 });
    expect(e.energyJ).toBeCloseTo(0.02 * e.seconds, 12);
    expect(e.averageW).toBeCloseTo(e.energyJ! * 10, 12);
    expect(e.batteryHours).toBeCloseTo(((100 / 1000) * 3) / e.averageW!, 6);
  });

  it('derives the Apollo4 figure from the datasheet headline: 4 uA/MHz x 192 MHz x 1.8 V', () => {
    expect(dev('apollo4').powerW).toBeCloseTo(0.768e-3 * 1.8, 9);
  });

  it('gives no battery life for a mains device', () => {
    const e = estimate(kws, dev('h100'), base);
    expect(e.energyJ).not.toBeNull();
    expect(e.batteryHours).toBeNull();
  });

  it('converts vendor operations to MACs: 204 GOPS is 102 G MAC/s; 33 TOPS is 16.5 T MAC/s; 3958 sparse TOPS is 989.5 T MAC/s dense', () => {
    expect(dev('alif').peakMacsPerS).toBe(102e9);
    expect(dev('jetson').peakMacsPerS).toBe(16.5e12);
    expect(dev('h100').peakMacsPerS).toBe(989.5e12);
  });
});

describe('the worked example in the lesson (Apollo4 Plus, keyword spotter)', () => {
  const kws = modelStats(dsCnnSmall());
  const e = estimate(kws, dev('apollo4'), { ...base, rate: 10, efficiency: 0.25, batteryMah: 200, batteryVolts: 3 });
  it('takes about 27.7 ms and about 38 microjoules per inference', () => {
    expect(e.seconds * 1e3).toBeCloseTo(27.7, 1);
    expect(e.energyJ! * 1e6).toBeCloseTo(38.3, 1);
  });
  it('is busy about 28 per cent of the time and averages about 0.38 mW', () => {
    expect(e.busy).toBeCloseTo(0.277, 3);
    expect(e.averageW! * 1e3).toBeCloseTo(0.383, 3);
  });
  it('would drain 200 mAh at 3 V in about 1,570 hours, roughly 65 days', () => {
    expect(e.batteryHours!).toBeGreaterThan(1560);
    expect(e.batteryHours!).toBeLessThan(1580);
    expect(e.batteryHours! / 24).toBeCloseTo(65.3, 0);
  });
});

describe('formatting', () => {
  it('formats bytes, time, energy and hours', () => {
    expect(fmtBytes(512)).toBe('512 B');
    expect(fmtBytes(22604)).toBe('22.1 kB');
    expect(fmtBytes(2 * 1024 * 1024)).toBe('2.00 MB');
    expect(fmtTime(0.0123)).toBe('12.3 ms');
    expect(fmtTime(2.5e-5)).toBe('25.0 us');
    expect(fmtEnergy(0.0021)).toBe('2.10 mJ');
    expect(fmtHours(0.5)).toBe('30 minutes');
    expect(fmtHours(100)).toBe('4.2 days');
  });
});
