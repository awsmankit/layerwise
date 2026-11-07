import { describe, expect, it } from 'vitest';
import { THRESHOLD, activeRows, capturedCount, captured, facts, heads, rowSum, singleHead, strength, words, QUERY } from './no-multi-head-attention';

describe('no multi-head attention what-if', () => {
  it('every head is a set of weights that adds up to 1, and "ate" never listens to itself', () => {
    for (const h of heads) {
      expect(h.weights.length).toBe(words.length);
      expect(rowSum(h.weights)).toBeCloseTo(1, 12);
      expect(h.weights[QUERY]).toBe(0);
    }
    expect(rowSum(singleHead('blend'))).toBeCloseTo(1, 12);
  });
  it('the blended head is the plain average of the four, checked by hand', () => {
    const b = singleHead('blend');
    expect(b[2]).toBeCloseTo((0.55 + 0.1 + 0.25 + 0) / 4, 12); // cat
    expect(b[6]).toBeCloseTo((0.4 + 0 + 0.65 + 0) / 4, 12); // fish
    expect(b[3]).toBeCloseTo(0.25, 12); // quickly
  });
  it('four heads capture all four facts', () => {
    const rows = activeRows(true, 'syntax');
    expect(rows.length).toBe(4);
    expect(capturedCount(rows)).toBe(4);
  });
  it('each single pattern captures fewer facts, by hand', () => {
    const count = (id: 'syntax' | 'nearby' | 'meaning' | 'describing') => capturedCount(activeRows(false, id));
    expect(count('syntax')).toBe(2); // who (0.55), what (0.4)
    expect(count('nearby')).toBe(1); // how (0.5)
    expect(count('meaning')).toBe(1); // what (0.65); cat only 0.25
    expect(count('describing')).toBe(2); // state (0.5), how (0.5)
  });
  it('one head that tries to do everything blurs: nothing reaches the threshold', () => {
    const rows = activeRows(false, 'blend');
    expect(capturedCount(rows)).toBe(0);
    for (const f of facts) expect(strength(f, rows)).toBeLessThan(THRESHOLD);
  });
  it('more heads never capture fewer facts than any one of them', () => {
    const all = capturedCount(activeRows(true, 'syntax'));
    for (const h of heads) expect(all).toBeGreaterThanOrEqual(capturedCount(activeRows(false, h.id)));
    expect(captured(facts[0], activeRows(true, 'syntax'))).toBe(true);
  });
});
