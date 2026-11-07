/**
 * What if the answer sits in the middle of a long context?
 * IMPORTANT: nothing here is measured. The curve is a schematic U drawn to illustrate the finding reported in
 * the abstract of Liu et al. (2023). It is a simple parabola, so the numbers are shape only, not accuracy.
 */

/** Passages in the example prompt. An odd number so there is one true middle passage. */
export const PASSAGES = 21;
/** Zero-based index of the middle passage (passage 11 of 21). */
export const MIDDLE = (PASSAGES - 1) / 2;

/** Short quotes from the abstract of Lost in the Middle (Liu et al., 2023). Each is under 125 characters. */
export const QUOTES = [
  'performance is often highest when relevant information occurs at the beginning or end of the input context',
  'significantly degrades when models must access relevant information in the middle of long contexts',
] as const;

const r4 = (x: number) => Math.round(x * 10000) / 10000;

/** Schematic height of the U at a position p from 0 (start) to 1 (end). 1 at the ends, 0.2 in the middle. Unitless. */
export function schematicUse(p: number): number {
  const d = 2 * p - 1;
  return r4(0.2 + 0.8 * d * d);
}

/** Position (0 to 1) of the centre of passage i. */
export const centre = (i: number, n = PASSAGES) => (i + 0.5) / n;

/** Schematic height for passage i. */
export const strengthAt = (i: number, n = PASSAGES) => schematicUse(centre(i, n));

export type Band = 'favoured' | 'weaker' | 'weakest';

/** Which part of the schematic U a height falls in. */
export function band(s: number): Band {
  return s >= 0.5 ? 'favoured' : s >= 0.3 ? 'weaker' : 'weakest';
}
export const bandAt = (i: number, n = PASSAGES) => band(strengthAt(i, n));

export const bandWords: Record<Band, string> = {
  favoured: 'near the favoured start or end',
  weaker: 'on the way down into the dip',
  weakest: 'in the dip, the weakest region',
};

/** The points of the schematic curve, for drawing. */
export function curvePoints(steps = 40): { p: number; s: number }[] {
  return Array.from({ length: steps + 1 }, (_, k) => ({ p: r4(k / steps), s: schematicUse(k / steps) }));
}

/** "Start", "end" or "middle" for a passage, in plain words. */
export function side(i: number, n = PASSAGES): 'start' | 'end' | 'middle' {
  const mid = (n - 1) / 2;
  return i < mid ? 'start' : i > mid ? 'end' : 'middle';
}
