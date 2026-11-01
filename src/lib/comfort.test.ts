import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ATTRS, DEFAULT_COMFORT, clampRate, comfortAttributes, isDefaultComfort, normaliseComfort } from './comfort';

describe('normaliseComfort', () => {
  it('returns the defaults for missing or broken data', () => {
    expect(normaliseComfort(null)).toEqual(DEFAULT_COMFORT);
    expect(normaliseComfort('large')).toEqual(DEFAULT_COMFORT);
    expect(normaliseComfort([1, 2])).toEqual(DEFAULT_COMFORT);
    expect(normaliseComfort({ text: 'huge', space: 3, width: {}, calm: 'yes', rate: 'fast', voice: 7 })).toEqual(DEFAULT_COMFORT);
  });

  it('keeps valid values', () => {
    const c = normaliseComfort({ text: 130, space: 'roomy', width: 'narrow', calm: true, rate: 1.25, voice: 'urn:x' });
    expect(c).toEqual({ text: 130, space: 'roomy', width: 'narrow', calm: true, rate: 1.25, voice: 'urn:x' });
  });

  it('only accepts the three text sizes', () => {
    expect(normaliseComfort({ text: 115 }).text).toBe(115);
    expect(normaliseComfort({ text: 120 }).text).toBe(100);
  });
});

describe('clampRate', () => {
  it('stays between 0.8 and 1.5', () => {
    expect(clampRate(0.1)).toBe(0.8);
    expect(clampRate(9)).toBe(1.5);
    expect(clampRate(1.1)).toBe(1.1);
    expect(clampRate(NaN)).toBe(1);
    expect(clampRate(undefined)).toBe(1);
  });
});

describe('comfortAttributes', () => {
  it('leaves the page untouched at the defaults', () => {
    expect(Object.values(comfortAttributes(DEFAULT_COMFORT)).every((v) => v === null)).toBe(true);
    expect(isDefaultComfort(DEFAULT_COMFORT)).toBe(true);
  });

  it('maps each setting to its attribute', () => {
    const a = comfortAttributes({ ...DEFAULT_COMFORT, text: 115, space: 'roomy', width: 'narrow', calm: true });
    expect(a).toEqual({ 'data-cm-text': '115', 'data-cm-space': 'roomy', 'data-cm-width': 'narrow', 'data-cm-calm': '1' });
  });

  it('does not treat a speed or voice change as a page change', () => {
    expect(isDefaultComfort({ ...DEFAULT_COMFORT, rate: 1.5, voice: 'x' })).toBe(true);
  });
});

describe('pre-paint script', () => {
  const base = readFileSync(new URL('../layouts/Base.astro', import.meta.url), 'utf8');

  it('reads the same key and sets the same attributes as this module', () => {
    expect(base).toContain("'layerwise:comfort'");
    for (const name of Object.values(ATTRS)) expect(base).toContain(name);
    for (const v of ['115', '130', 'roomy', 'narrow']) expect(base).toContain(v);
  });
});
