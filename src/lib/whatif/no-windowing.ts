/**
 * What if we cut audio into blocks without a window function?
 * A block of N samples holds a pure tone. A discrete Fourier transform (DFT) assumes the block repeats forever.
 * If the tone does not fit a whole number of waves in the block, the repeat has a jump at the seam and the energy
 * smears across many bins (spectral leakage). A Hann window fades the block to zero at both ends, so there is no jump.
 * Every figure on the page comes from these functions. The block is a toy: 64 samples.
 */

/** Samples per block. */
export const N = 64;
/** The one-sided spectrum has bins 0 to N/2. Bin k is the tone that fits exactly k waves into the block. */
export const LAST_BIN = N / 2;
/** Levels below this are shown as this (decibels). */
export const FLOOR_DB = -100;
/** The optional quiet second tone: sits exactly on bin 20, 40 dB below the main tone (amplitude 0.01). */
export const QUIET_BIN = 20;
export const QUIET_AMP = 0.01;
const QUIET_PHASE = 0.7;
/** Bins this close to the main tone, or closer, count as "the tone itself". */
export const NEAR = 3;

export type WindowKind = 'rect' | 'hann';

/** Window values: all ones (a plain cut) or the periodic Hann window 0.5 (1 - cos(2 pi n / N)). */
export function windowValues(kind: WindowKind): number[] {
  return Array.from({ length: N }, (_, n) => (kind === 'rect' ? 1 : 0.5 * (1 - Math.cos((2 * Math.PI * n) / N))));
}

/** The test block: a unit tone at `toneBin` waves per block, plus the quiet tone when asked. */
export function makeBlock(toneBin: number, quiet: boolean): number[] {
  return Array.from({ length: N }, (_, n) => {
    const main = Math.cos((2 * Math.PI * toneBin * n) / N);
    const small = quiet ? QUIET_AMP * Math.cos((2 * Math.PI * QUIET_BIN * n) / N + QUIET_PHASE) : 0;
    return main + small;
  });
}

/** The block after the window is applied. */
export function applyWindow(block: number[], kind: WindowKind): number[] {
  const w = windowValues(kind);
  return block.map((v, n) => v * w[n]);
}

/**
 * Size of each DFT bin, 0 to N/2, scaled so a whole-number tone of height 1 reads exactly 1 (0 dB) with either window.
 * This is the direct sum, N x (N/2 + 1) terms: small enough to run on every slider move.
 */
export function magnitudes(block: number[], kind: WindowKind): number[] {
  const w = windowValues(kind);
  const gain = w.reduce((a, b) => a + b, 0) / 2;
  return Array.from({ length: LAST_BIN + 1 }, (_, k) => {
    let re = 0;
    let im = 0;
    for (let n = 0; n < N; n++) {
      const v = block[n] * w[n];
      const a = (2 * Math.PI * k * n) / N;
      re += v * Math.cos(a);
      im -= v * Math.sin(a);
    }
    return Math.hypot(re, im) / gain;
  });
}

/** Magnitude to decibels, floored so empty bins do not run to minus infinity. */
export function toDb(m: number): number {
  return Math.max(FLOOR_DB, 20 * Math.log10(Math.max(m, 1e-12)));
}

export function spectrumDb(toneBin: number, quiet: boolean, kind: WindowKind): number[] {
  return magnitudes(makeBlock(toneBin, quiet), kind).map(toDb);
}

/** True when the tone fits a whole number of waves in the block, so the repeat has no seam. */
export function fitsBlock(toneBin: number): boolean {
  return Math.abs(toneBin - Math.round(toneBin)) < 1e-9;
}

export type Stats = {
  /** the tallest bin, 0-based */
  peakBin: number;
  /** its level in dB (0 dB would be the true height; the shortfall is "scalloping") */
  peakDb: number;
  /** the highest bin more than NEAR bins away from the tone, in dB */
  leakDb: number;
  /** peak minus that leakage, in dB: how far the tone stands above the smear. Capped at 100. */
  peakToLeakDb: number;
  /** share of the tone's energy (0 to 1) that landed more than 2 bins away from it */
  farEnergy: number;
  /** can the quiet second tone be told apart from the main tone's leakage? */
  quietSeen: boolean;
  /** level of the quiet tone's bin with it present, and with only the main tone (its leakage), in dB */
  quietBinDb: number;
  leakAtQuietDb: number;
};

export function stats(toneBin: number, kind: WindowKind): Stats {
  const main = magnitudes(makeBlock(toneBin, false), kind);
  const mainDb = main.map(toDb);
  let peakBin = 0;
  main.forEach((v, k) => {
    if (v > main[peakBin]) peakBin = k;
  });
  let leakDb = FLOOR_DB;
  let total = 0;
  let far = 0;
  main.forEach((v, k) => {
    const d = Math.abs(k - toneBin);
    if (d > NEAR) leakDb = Math.max(leakDb, mainDb[k]);
    total += v * v;
    if (d > 2) far += v * v;
  });
  const withQuiet = magnitudes(makeBlock(toneBin, true), kind).map(toDb);
  const quietBinDb = withQuiet[QUIET_BIN];
  const leakAtQuietDb = mainDb[QUIET_BIN];
  return {
    peakBin,
    peakDb: mainDb[peakBin],
    leakDb,
    peakToLeakDb: Math.min(100, mainDb[peakBin] - leakDb),
    farEnergy: far / total,
    quietSeen: quietBinDb - leakAtQuietDb >= 6,
    quietBinDb,
    leakAtQuietDb,
  };
}
