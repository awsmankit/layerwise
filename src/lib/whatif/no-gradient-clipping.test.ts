import { describe, expect, it } from 'vitest';
import { CLIPS, DEFAULT_CLIP, LONG, RATE, SHORT, W0, batchLength, clipBy, firstJump, gradFor, lossFor, outcome, simulate } from './no-gradient-clipping';

describe('no gradient clipping what-if', () => {
  it('every 8th batch is a long sequence', () => {
    expect([0, 6, 7, 8, 15].map(batchLength)).toEqual([SHORT, SHORT, LONG, SHORT, LONG]);
  });
  it('loss and gradient by hand: w = 1 has zero loss and the gradient is zero', () => {
    expect(lossFor(1, 40)).toBe(0);
    expect(gradFor(1, 40)).toBe(0);
    expect(lossFor(2, 3)).toBe(0.5 * 3 * 3);
    // T = 3: gradient = (w^2 - 1) * 2 * w, at w = 2 that is 3 * 2 * 2
    expect(gradFor(2, 3)).toBe(12);
  });
  it('clip by norm keeps the sign and caps the size', () => {
    expect(clipBy(5, 2)).toBe(2);
    expect(clipBy(-5, 2)).toBe(-2);
    expect(clipBy(1.5, 2)).toBe(1.5);
    expect(clipBy(1e9, null)).toBe(1e9);
  });
  it('first step by hand: w = 0.7, T = 8: g = (0.7^7 - 1) * 7 * 0.7^6 and w moves by RATE * g', () => {
    const g = (Math.pow(0.7, 7) - 1) * 7 * Math.pow(0.7, 6);
    const r = simulate(null);
    expect(r.steps[0].w).toBe(W0);
    expect(r.steps[0].norm).toBeCloseTo(Math.abs(g), 10);
    expect(r.steps[0].next).toBeCloseTo(0.7 - RATE * g, 10);
    expect(r.steps[0].norm).toBeCloseTo(0.7557, 3);
  });
  it('without clipping, one long sequence throws w over the cliff and the run blows up two steps later', () => {
    const r = simulate(null);
    expect(outcome(r)).toBe('blown-up');
    const j = firstJump(r)!;
    expect(j.step).toBe(7);
    expect(j.from).toBeCloseTo(0.981, 3);
    expect(j.to).toBeCloseTo(1.278, 3);
    expect(j.norm).toBeCloseTo(9.91, 2);
    expect(j.norm / j.typical).toBeGreaterThan(5);
    expect(r.steps[8].norm).toBeCloseTo(140.09, 1);
    expect(r.steps[8].next).toBeCloseTo(-2.924, 3);
    expect(r.blownUpAt).toBe(9);
    expect(r.clippedCount).toBe(0);
  });
  it('with clip 1 the same setup trains, no weight step is bigger than rate * clip, and some steps were clipped', () => {
    const r = simulate(DEFAULT_CLIP);
    expect(outcome(r)).toBe('trained');
    expect(r.trainedAt).toBe(13);
    expect(r.biggestJump).toBeLessThanOrEqual(RATE * DEFAULT_CLIP + 1e-12);
    expect(r.clippedCount).toBe(7);
    expect(r.maxNorm).toBeLessThan(2);
  });
  it('a clip at or above the largest raw gradient changes nothing', () => {
    const a = simulate(null);
    const b = simulate(1e9);
    expect(b.steps.map((s) => s.next)).toEqual(a.steps.map((s) => s.next));
  });
  it('the biggest weight step never exceeds rate * clip, for every clip on the slider', () => {
    for (const c of CLIPS) expect(simulate(c).biggestJump).toBeLessThanOrEqual(RATE * c + 1e-12);
  });
  it('a clip that is too loose does not protect, and a clip that is very tight is too slow', () => {
    expect(outcome(simulate(50))).toBe('stuck');
    expect(outcome(simulate(0.1))).toBe('stuck');
    expect(simulate(0.1).trainedAt).toBeNull();
    for (const c of [0.5, 1, 2, 5, 10]) expect(outcome(simulate(c))).toBe('trained');
  });
  it('is deterministic', () => {
    expect(simulate(1)).toEqual(simulate(1));
  });
});
