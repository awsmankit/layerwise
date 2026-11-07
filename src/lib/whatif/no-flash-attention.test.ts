import { describe, expect, it } from 'vitest';
import { fitsIn, formatBytes, gpuChoices, headChoices, maxFittingN, overshoot, sameAnswerCheck, scoreTableBytes, seqChoices, tileAt, tiledExtraBytes } from './no-flash-attention';

const GIB = 1024 ** 3;

describe('no flash attention what-if', () => {
  it('the table size, checked by hand: n x n x heads x 2 bytes', () => {
    expect(scoreTableBytes(8192, 32)).toBe(4 * GIB);
    expect(scoreTableBytes(16384, 32)).toBe(16 * GIB);
    expect(scoreTableBytes(32768, 32)).toBe(64 * GIB);
    expect(scoreTableBytes(131072, 32)).toBe(1024 * GIB); // 1 TiB
  });
  it('doubling the length quadruples the table, doubling the heads doubles it', () => {
    for (let i = 1; i < seqChoices.length; i++) expect(scoreTableBytes(seqChoices[i], 32)).toBe(4 * scoreTableBytes(seqChoices[i - 1], 32));
    expect(scoreTableBytes(4096, 64)).toBe(2 * scoreTableBytes(4096, 32));
  });
  it('the tiled extra memory grows in a straight line with n', () => {
    for (let i = 1; i < seqChoices.length; i++) expect(tiledExtraBytes(seqChoices[i], 32)).toBe(2 * tiledExtraBytes(seqChoices[i - 1], 32));
    expect(tiledExtraBytes(32768, 32)).toBe(8 * 1024 ** 2); // 8 MiB
  });
  it('the longest sequence that fits, for 32 heads in 64 GiB, is exactly 32768', () => {
    expect(maxFittingN(32, 64)).toBe(32768);
    expect(fitsIn(scoreTableBytes(maxFittingN(32, 24), 32), 24)).toBe(true);
    expect(fitsIn(scoreTableBytes(maxFittingN(32, 24) + 1, 32), 24)).toBe(false);
    expect(maxFittingN(32, 24)).toBe(20066);
  });
  it('more memory and fewer heads both allow a longer sequence', () => {
    for (const h of headChoices) for (let i = 1; i < gpuChoices.length; i++) expect(maxFittingN(h, gpuChoices[i])).toBeGreaterThan(maxFittingN(h, gpuChoices[i - 1]));
    expect(maxFittingN(8, 24)).toBeGreaterThan(maxFittingN(64, 24));
  });
  it('overshoot is a ratio', () => {
    expect(overshoot(scoreTableBytes(32768, 32), 24)).toBeCloseTo(64 / 24, 12);
  });
  it('formats bytes', () => {
    expect(formatBytes(4 * GIB)).toBe('4 GiB');
    expect(formatBytes(1024 * GIB)).toBe('1 TiB');
    expect(formatBytes(8 * 1024 ** 2)).toBe('8 MiB');
    expect(formatBytes(512)).toBe('512 B');
  });
  it('tile order is row by row', () => {
    expect(tileAt(0, 6)).toEqual({ row: 0, col: 0 });
    expect(tileAt(13, 6)).toEqual({ row: 2, col: 1 });
  });
  it('tiles give the same answer as the whole table while holding only tile-sized pieces', () => {
    const r = sameAnswerCheck();
    expect(r.diff).toBeLessThan(1e-9);
    expect(r.fullHeld).toBe(144);
    expect(r.tiledHeld).toBe(3);
  });
});
