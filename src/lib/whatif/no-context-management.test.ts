import { describe, expect, it } from 'vitest';
import {
  INSTRUCTIONS,
  KEEP_RESULTS,
  MODEL_TOKENS,
  RESULT_CYCLE,
  STEPS,
  STUB,
  SUMMARY,
  TRIGGER,
  WINDOW,
  firstClearStep,
  firstFullStep,
  firstInstructionLoss,
  fmtTokens,
  instructionsGoneAt,
  peakUsed,
  resultSize,
  simulate,
} from './no-context-management';

describe('no-context-management', () => {
  it('cycles the example result sizes', () => {
    expect(resultSize(1)).toBe(1200);
    expect(resultSize(2)).toBe(3000);
    expect(resultSize(5)).toBe(1600);
    expect(resultSize(6)).toBe(1200);
    expect(RESULT_CYCLE.reduce((a, b) => a + b, 0)).toBe(8800);
  });

  it('without management the tokens add up by hand', () => {
    const s = simulate(false);
    expect(s).toHaveLength(STEPS);
    expect(s[0].demanded).toBe(1200 + 150 + 1200); // 2,550
    expect(s[4].demanded).toBe(1200 + 5 * 150 + 8800); // 10,750
    expect(s[14].demanded).toBe(1200 + 15 * 150 + 3 * 8800); // 29,850
    expect(s[16].demanded).toBe(34_350);
  });

  it('the window overflows at step 17 and that cuts the instructions, which are the oldest text', () => {
    expect(firstFullStep()).toBe(17);
    expect(firstInstructionLoss()).toBe(17);
    expect(instructionsGoneAt()).toBe(17);
    const s = simulate(false);
    expect(s[15].used).toBe(31_200);
    expect(s[15].instructions).toBe(INSTRUCTIONS);
    expect(s[16].used).toBe(WINDOW);
    expect(s[16].cut).toBe(34_350 - WINDOW);
    expect(s[16].instructions).toBe(0);
    expect(s[29].cut).toBe(s[29].demanded - WINDOW);
  });

  it('what stays in the window always adds up to what is used', () => {
    for (const managed of [false, true]) {
      for (const x of simulate(managed)) {
        expect(x.instructions + x.summary + x.results + x.stubs + x.model).toBe(x.used);
        expect(x.used).toBeLessThanOrEqual(WINDOW);
      }
    }
  });

  it('with management the instructions are never lost and the peak stays under the trigger plus one step', () => {
    const s = simulate(true);
    expect(s.every((x) => x.instructions === INSTRUCTIONS)).toBe(true);
    expect(firstInstructionLoss(true)).toBeNull();
    expect(peakUsed(true)).toBeLessThan(WINDOW);
    expect(peakUsed(true)).toBeLessThan(TRIGGER * WINDOW + 3200 + MODEL_TOKENS); // one step can add at most the biggest result
    expect(peakUsed(true)).toBe(23_775);
    expect(peakUsed(false)).toBe(WINDOW);
  });

  it('clearing starts at step 12 and keeps only the newest results in full', () => {
    expect(firstClearStep()).toBe(12);
    const s = simulate(true);
    expect(s[10].cleared).toBe(false); // step 11
    expect(s[11].cleared).toBe(true); // step 12
    expect(s[11].summary).toBe(SUMMARY);
    // at step 12: 9 results turned into stubs, the newest 3 (steps 10, 11, 12) kept in full
    expect(s[11].stubs).toBe((12 - KEEP_RESULTS) * STUB);
    expect(s[11].results).toBe(resultSize(10) + resultSize(11) + resultSize(12));
    // clearing frees a lot of room
    expect(s[11].used).toBeLessThan(s[10].used);
  });

  it('is deterministic and monotone for the unmanaged run', () => {
    const a = simulate(false);
    const b = simulate(false);
    expect(a).toEqual(b);
    for (let i = 1; i < a.length; i++) {
      expect(a[i].demanded).toBeGreaterThan(a[i - 1].demanded);
      expect(a[i].cut).toBeGreaterThanOrEqual(a[i - 1].cut);
    }
  });

  it('formats token counts', () => {
    expect(fmtTokens(32000)).toBe('32,000');
  });
});
