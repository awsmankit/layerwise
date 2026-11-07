import { describe, expect, it } from 'vitest';
import { MIDDLE, PASSAGES, QUOTES, band, bandAt, centre, curvePoints, schematicUse, side, strengthAt } from './lost-in-the-middle';

describe('lost in the middle what-if (schematic only)', () => {
  it('there is one true middle passage: number 11 of 21', () => {
    expect(PASSAGES).toBe(21);
    expect(MIDDLE).toBe(10);
    expect(centre(MIDDLE)).toBe(0.5);
  });
  it('the schematic U is 1 at the ends and 0.2 at the middle, checked by hand', () => {
    expect(schematicUse(0)).toBe(1);
    expect(schematicUse(1)).toBe(1);
    expect(schematicUse(0.5)).toBe(0.2);
    expect(schematicUse(0.25)).toBeCloseTo(0.2 + 0.8 * 0.25, 12); // (2p-1)^2 = 0.25
  });
  it('is symmetric, lowest in the middle, and falls then rises', () => {
    for (let i = 0; i < PASSAGES; i++) expect(strengthAt(i)).toBe(strengthAt(PASSAGES - 1 - i));
    const min = Math.min(...Array.from({ length: PASSAGES }, (_, i) => strengthAt(i)));
    expect(strengthAt(MIDDLE)).toBe(min);
    for (let i = 1; i <= MIDDLE; i++) expect(strengthAt(i)).toBeLessThan(strengthAt(i - 1));
    for (let i = MIDDLE + 1; i < PASSAGES; i++) expect(strengthAt(i)).toBeGreaterThan(strengthAt(i - 1));
  });
  it('the ends beat the middle (the U shape the abstract describes) and values stay in range', () => {
    expect(strengthAt(0)).toBeGreaterThan(strengthAt(MIDDLE));
    expect(strengthAt(PASSAGES - 1)).toBeGreaterThan(strengthAt(MIDDLE));
    for (const { s } of curvePoints()) {
      expect(s).toBeGreaterThanOrEqual(0.2);
      expect(s).toBeLessThanOrEqual(1);
    }
  });
  it('bands: favoured at passages 1 to 4 and 18 to 21, weakest in the middle third', () => {
    const favoured = Array.from({ length: PASSAGES }, (_, i) => i).filter((i) => bandAt(i) === 'favoured');
    expect(favoured).toEqual([0, 1, 2, 3, 17, 18, 19, 20]);
    const weakest = Array.from({ length: PASSAGES }, (_, i) => i).filter((i) => bandAt(i) === 'weakest');
    expect(weakest).toEqual([7, 8, 9, 10, 11, 12, 13]);
    expect(band(0.5)).toBe('favoured');
    expect(band(0.3)).toBe('weaker');
  });
  it('sides', () => {
    expect([side(0), side(10), side(20)]).toEqual(['start', 'middle', 'end']);
  });
  it('quotes are short, from the abstract, and have no dashes', () => {
    for (const q of QUOTES) {
      expect(q.length).toBeLessThanOrEqual(125);
      expect(q).not.toMatch(/[—–]/);
    }
  });
});
