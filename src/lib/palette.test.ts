import { describe, expect, it } from 'vitest';
import { swatch, textOn, trackSwatch, gameSwatch, layerSwatch, cardCycle } from './palette';
import { cardColors, contrast, MIN_CONTRAST } from './color';
import { tracks } from '../data/tracks';

/* CIE Lab distance between two colours: about 2.3 is the smallest difference an eye can see,
   and below roughly 25 two colours still read as "about the same". */
function lab(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
const distance = (a: string, b: string) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]) as [number, number, number]);
const fillOf = (name: keyof typeof swatch) => cardColors(swatch[name]).fill;

describe('palette', () => {
  const names = Object.keys(swatch) as (keyof typeof swatch)[];

  it('has no two colours that look alike, as cards', () => {
    for (let i = 0; i < names.length; i++)
      for (let j = i + 1; j < names.length; j++) expect(distance(fillOf(names[i]), fillOf(names[j])), `${names[i]} and ${names[j]}`).toBeGreaterThan(28);
  });

  it('keeps text readable on every colour, solid and softened', () => {
    for (const n of names) {
      const on = textOn(swatch[n]);
      expect(contrast(swatch[n], on), `${n} solid`).toBeGreaterThanOrEqual(MIN_CONTRAST);
      expect(contrast(cardColors(swatch[n]).fill, on), `${n} card`).toBeGreaterThanOrEqual(MIN_CONTRAST);
    }
  });

  it('gives every track its own colour, and neighbours in the list a very different one', () => {
    const colours = tracks.map((t) => t.color);
    expect(new Set(colours).size).toBe(colours.length);
    for (let i = 1; i < tracks.length; i++) expect(distance(cardColors(tracks[i - 1].color).fill, cardColors(tracks[i].color).fill), `${tracks[i - 1].id} then ${tracks[i].id}`).toBeGreaterThan(50);
    for (const t of tracks) expect(t.color).toBe(swatch[trackSwatch[t.id]]);
  });

  it('uses a different colour for each game and each layer', () => {
    for (const set of [Object.values(gameSwatch), layerSwatch]) expect(new Set(set).size).toBe(set.length);
  });

  it('cycles through every colour once, and a card differs a lot from the three after it', () => {
    expect(new Set(cardCycle).size).toBe(Object.keys(swatch).length);
    const n = cardCycle.length;
    for (let i = 0; i < n; i++)
      for (const d of [1, 2, 3]) expect(distance(fillOf(cardCycle[i]), fillOf(cardCycle[(i + d) % n])), `${cardCycle[i]} and ${cardCycle[(i + d) % n]}`).toBeGreaterThan(40);
  });
});
