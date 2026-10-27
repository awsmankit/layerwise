import { describe, expect, it } from 'vitest';
import { cardColors, cardStyle, contrast, MIN_CONTRAST, SOFTEST } from './color';
import { tracks } from '../data/tracks';
import { paths, pathIds } from '../data/paths';

const colours = [
  ...tracks.map((t) => t.color),
  ...pathIds.map((id) => paths[id].color),
  '#C93531', '#C92A63', '#3B54E0', '#FF9F1C', '#00B8D9', '#12C2A4', '#7B3FE4', '#FFC233',
  '#F25F5C', '#FF4F8B', '#5BC0FF', '#9C8CFF', '#B6E43A',
];

describe('card colours', () => {
  it('keeps text readable on every colour used for a card', () => {
    for (const c of colours) {
      const { fill, on } = cardColors(c);
      expect(contrast(fill, on), c).toBeGreaterThanOrEqual(MIN_CONTRAST);
    }
  });

  it('softens colours as far as the start page does, and only deepens one when the text needs it', () => {
    // a light yellow keeps the soft look; a deep red needs more of its colour for white text
    expect(cardColors('#FFC233').fill).toBe('#FDCB58');
    const red = cardColors('#C93531').fill;
    expect(red).not.toBe(cardColors('#FFC233').fill);
    expect(SOFTEST).toBeLessThan(1);
  });

  it('writes the custom properties a card needs', () => {
    expect(cardStyle('#7B3FE4')).toMatch(/^--c:#7B3FE4;--fill:#[0-9A-F]{6};--on:#(FFFFFF|15123D)$/);
  });
});
