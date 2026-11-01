import { describe, expect, it } from 'vitest';
import { affineParams, dequantise, integerDot, normaliseMultiplier, quantise, roundingDoublingHighMul, roundingShiftRight, symmetricParams } from './int-quant';

describe('affine and symmetric parameters', () => {
  it('maps [-0.5, 2.0] onto int8 with a zero point of -77', () => {
    const p = affineParams(-0.5, 2.0);
    expect(p.scale).toBeCloseTo(2.5 / 255, 12);
    expect(p.zeroPoint).toBe(-77);
    expect(dequantise(quantise(0, p), p)).toBe(0); // real zero is exactly representable
  });
  it('widens a range that does not contain zero', () => {
    const p = affineParams(1, 3);
    expect(dequantise(quantise(0, p), p)).toBe(0);
  });
  it('uses zero point 0 and the range [-127, 127] for weights', () => {
    const p = symmetricParams(0.91);
    expect(p.zeroPoint).toBe(0);
    expect(quantise(0.91, p, -127, 127)).toBe(127);
    expect(quantise(-5, p, -127, 127)).toBe(-127);
  });
  it('rounds to the nearest level and clamps', () => {
    const p = { scale: 0.1, zeroPoint: 0 };
    expect(quantise(0.26, p)).toBe(3);
    expect(quantise(100, p)).toBe(127);
    expect(quantise(-100, p)).toBe(-128);
  });
});

describe('fixed-point rescaling', () => {
  it('splits a multiplier into a 31-bit fraction and a shift', () => {
    const { m0, shift, fixed } = normaliseMultiplier(0.005971128608923885);
    expect(shift).toBe(7);
    expect(m0).toBeGreaterThanOrEqual(0.5);
    expect(m0).toBeLessThan(1);
    expect(m0 * 2 ** -shift).toBeCloseTo(0.005971128608923885, 15);
    expect(fixed).toBeGreaterThanOrEqual(2 ** 30);
    expect(fixed).toBeLessThan(2 ** 31);
  });
  it('rejects multipliers outside (0, 1)', () => {
    expect(() => normaliseMultiplier(1.2)).toThrow();
    expect(() => normaliseMultiplier(0)).toThrow();
  });
  it('doubles then keeps the high half, rounding to nearest', () => {
    expect(roundingDoublingHighMul(2 ** 30, 2 ** 30)).toBe(2 ** 29); // 0.5 * 0.5 = 0.25 of 2^31 scaling
    expect(roundingDoublingHighMul(1000, 2 ** 30)).toBe(500); // times one half
    expect(roundingDoublingHighMul(-1000, 2 ** 30)).toBe(-500);
    expect(roundingDoublingHighMul(3, 2 ** 30)).toBe(2); // 1.5 ties round up
    expect(roundingDoublingHighMul(-3, 2 ** 30)).toBe(-1); // -1.5 ties round up too
    expect(roundingDoublingHighMul(-5, 2 ** 29)).toBe(-1); // -1.25 rounds to nearest
  });
  it('shifts right rounding to nearest, ties away from zero', () => {
    expect(roundingShiftRight(5, 1)).toBe(3); // 2.5
    expect(roundingShiftRight(-5, 1)).toBe(-3); // -2.5
    expect(roundingShiftRight(4, 1)).toBe(2);
    expect(roundingShiftRight(7, 2)).toBe(2); // 1.75
    expect(roundingShiftRight(-7, 2)).toBe(-2);
    expect(roundingShiftRight(5, 0)).toBe(5);
  });
});

describe('integer-only dot product: the worked example in the lesson', () => {
  const w = [0.42, -0.77, 0.15, 0.91];
  const x = [0.3, 1.2, -0.4, 0.9];
  const wP = symmetricParams(0.91);
  const xP = affineParams(-0.5, 2.0);
  const yP = affineParams(-1.0, 2.0);
  const r = integerDot(w, x, 0.1, wP, xP, yP);

  it('quantises weights and inputs to the listed integers', () => {
    expect(r.qWeights).toEqual([59, -107, 21, 127]);
    expect(r.qInputs).toEqual([-46, 45, -118, 15]);
    expect(xP.zeroPoint).toBe(-77);
    expect(yP.zeroPoint).toBe(-43);
  });
  it('accumulates in int32 with an int32 bias', () => {
    expect(r.qBias).toBe(1424);
    // (31 * 59) + (122 * -107) + (-41 * 21) + (92 * 127) + 1424
    expect(r.accumulator).toBe(1829 - 13054 - 861 + 11684 + 1424);
    expect(r.accumulator).toBe(1022);
  });
  it('rescales by M = S_w * S_x / S_y with a fixed-point multiply and a shift', () => {
    expect(r.multiplier).toBeCloseTo((wP.scale * xP.scale) / yP.scale, 15);
    expect(r.shift).toBe(7);
    expect(r.fixed).toBe(1641331334);
  });
  it('matches the floating-point rescale to within one output step', () => {
    const viaFloat = Math.round(r.accumulator * r.multiplier) + yP.zeroPoint;
    expect(r.qOutput).toBe(viaFloat);
    expect(r.qOutput).toBe(-37);
  });
  it('lands within one output step of the real-number answer', () => {
    expect(r.reference).toBeCloseTo(0.061, 9);
    expect(r.output).toBeCloseTo(0.0706, 4);
    expect(Math.abs(r.output - r.reference)).toBeLessThan(yP.scale);
  });
});
