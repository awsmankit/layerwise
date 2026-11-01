/*
 * Integer-only inference for one dot product, following the scheme in Jacob et al. (2017, arXiv:1712.05877)
 * and the LiteRT 8-bit quantization specification: real = (q - zero_point) * scale, int8 weights with zero point 0,
 * int8 activations with a zero point, an int32 accumulator and bias, and a final rescale by M = S_w * S_x / S_y
 * done as a fixed-point multiply and a rounding shift. Used for the worked example in the edge quantization
 * lesson. BigInt stands in for the 64-bit intermediate a chip would use.
 */

export type Affine = { scale: number; zeroPoint: number };

const clampInt = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Scale and zero point that map [min, max] onto the signed 8-bit range [-128, 127]. The range is widened to include 0 so that 0.0 is exact. */
export function affineParams(min: number, max: number, qmin = -128, qmax = 127): Affine {
  const lo = Math.min(min, 0);
  const hi = Math.max(max, 0);
  const scale = (hi - lo) / (qmax - qmin) || 1;
  const zeroPoint = clampInt(Math.round(qmin - lo / scale), qmin, qmax);
  return { scale, zeroPoint };
}

/** Symmetric weight quantization: zero point 0 and the range [-127, 127] (never -128), as the LiteRT specification requires for weights. */
export const symmetricParams = (maxAbs: number): Affine => ({ scale: maxAbs / 127 || 1, zeroPoint: 0 });

export function quantise(x: number, p: Affine, qmin = -128, qmax = 127): number {
  return clampInt(Math.round(x / p.scale) + p.zeroPoint, qmin, qmax);
}

export const dequantise = (q: number, p: Affine): number => (q - p.zeroPoint) * p.scale;

/** Split a multiplier in (0, 1) into M0 * 2^-shift with M0 in [0.5, 1), and the int32 that holds M0 (nearest to M0 * 2^31). */
export function normaliseMultiplier(m: number): { m0: number; shift: number; fixed: number } {
  if (!(m > 0 && m < 1)) throw new RangeError('the multiplier must be in (0, 1)');
  let shift = 0;
  let m0 = m;
  while (m0 < 0.5) {
    m0 *= 2;
    shift++;
  }
  return { m0, shift, fixed: Math.round(m0 * 2 ** 31) };
}

/** gemmlowp's SaturatingRoundingDoublingHighMul: round(a * b / 2^31) in 64-bit arithmetic (an exact tie rounds up, toward positive infinity). */
export function roundingDoublingHighMul(a: number, b: number): number {
  const A = BigInt(a);
  const B = BigInt(b);
  const ab = A * B;
  const nudge = ab >= 0n ? 1n << 30n : 1n - (1n << 30n);
  const r = Number((ab + nudge) / (1n << 31n)); // BigInt division truncates toward zero
  return r;
}

/** Divide by 2^exponent, rounding to nearest with ties away from zero (gemmlowp's RoundingDivideByPOT). */
export function roundingShiftRight(x: number, exponent: number): number {
  if (exponent === 0) return x;
  const unit = 2 ** exponent;
  const floor = Math.floor(x / unit);
  const remainder = x - floor * unit; // 0 .. unit - 1
  const threshold = unit / 2 - 1 + (x < 0 ? 1 : 0);
  return floor + (remainder > threshold ? 1 : 0);
}

export type DotResult = {
  qWeights: number[];
  qInputs: number[];
  qBias: number;
  /** The int32 accumulator before rescaling: bias + sum((qx - zx) * qw). */
  accumulator: number;
  multiplier: number;
  fixed: number;
  shift: number;
  /** The 8-bit output. */
  qOutput: number;
  /** The output turned back into a real number. */
  output: number;
  /** The same dot product in floating point, for comparison. */
  reference: number;
};

/**
 * One output neuron computed with integers only: int32 accumulation of (activation - activation zero point) times
 * the weight, the int32 bias (scale S_w * S_x, zero point 0), then rescale to the output's scale and zero point.
 */
export function integerDot(weights: number[], inputs: number[], bias: number, wP: Affine, xP: Affine, yP: Affine): DotResult {
  const qWeights = weights.map((w) => quantise(w, wP, -127, 127));
  const qInputs = inputs.map((x) => quantise(x, xP));
  const accScale = wP.scale * xP.scale;
  const qBias = Math.round(bias / accScale);
  let acc = qBias;
  for (let i = 0; i < qWeights.length; i++) acc += (qInputs[i] - xP.zeroPoint) * qWeights[i];
  const multiplier = accScale / yP.scale;
  const { fixed, shift } = normaliseMultiplier(multiplier);
  const scaled = roundingShiftRight(roundingDoublingHighMul(acc, fixed), shift);
  const qOutput = clampInt(scaled + yP.zeroPoint, -128, 127);
  let reference = bias;
  for (let i = 0; i < weights.length; i++) reference += weights[i] * inputs[i];
  return { qWeights, qInputs, qBias, accumulator: acc, multiplier, fixed, shift, qOutput, output: dequantise(qOutput, yP), reference };
}
