/** Colour helpers for cards filled with a track colour. */

/** The softest a card colour gets: this much of the colour, the rest the page behind it. */
export const SOFTEST = 0.82;
/** WCAG AA for normal-size text. */
export const MIN_CONTRAST = 4.5;

const light = '#FFFFFF';
const dark = '#15123D';

function parse(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function hex(rgb: number[]): string {
  return '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(parse(a)), luminance(parse(b))].sort((x, y) => y - x);
  return (la + 0.05) / (lb + 0.05);
}

const best = (fill: string) => (contrast(fill, light) >= contrast(fill, dark) ? light : dark);

/**
 * The fill and text colour for a card of this track colour. The colour is
 * softened with the light page colour as far as SOFTEST, but only as far as
 * the text on it stays readable, so a deep purple keeps more of its colour
 * than a yellow does.
 */
export function cardColors(color: string, page = '#F6F3FF'): { fill: string; on: string } {
  const [c, p] = [parse(color), parse(page)];
  for (let s = SOFTEST; s < 1; s += 0.01) {
    const fill = hex(c.map((v, i) => v * s + p[i] * (1 - s)));
    const on = best(fill);
    if (contrast(fill, on) >= MIN_CONTRAST) return { fill, on };
  }
  return { fill: color.toUpperCase(), on: best(color) };
}

/** Inline custom properties for a card: --c, --fill and --on. */
export function cardStyle(color: string): string {
  const { fill, on } = cardColors(color);
  return `--c:${color};--fill:${fill};--on:${on}`;
}
