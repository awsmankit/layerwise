import { cardColors, contrast } from './color';

/**
 * The site's colours, chosen so that no two are alike. Twelve colours that differ
 * in lightness as well as hue (a pale pink next to a deep red, a lime next to a
 * navy) read as twelve different things where twelve bright hues blur together.
 * Every colour keeps readable text on it, softened or not; see palette.test.ts.
 */
export const swatch = {
  yellow: '#FFC233',
  tangerine: '#F26A1B',
  red: '#B8232B',
  pink: '#FF8FB8',
  magenta: '#C026A6',
  purple: '#7747EC',
  navy: '#1E3A8A',
  sky: '#5BC8F0',
  turquoise: '#2ED3C0',
  forest: '#2F6B2F',
  lime: '#C5E84A',
  cocoa: '#7A4A2B',
} as const;

export type Swatch = keyof typeof swatch;

const light = '#FFFFFF';
const dark = '#15123D';

/** Text colour for a solid block of this colour: the one that reads best on the colour and on its softened card fill. */
export function textOn(hex: string): string {
  const fill = cardColors(hex).fill;
  const score = (c: string) => Math.min(contrast(hex, c), contrast(fill, c));
  return score(light) >= score(dark) ? light : dark;
}

/** A colour and the text colour for it, as the tracks and paths store them. */
export const pair = (name: Swatch) => ({ color: swatch[name], on: textOn(swatch[name]) });

/**
 * Colour for each set of cards. Each set was ordered so that cards next to each
 * other, in a row or a column, are as different as the palette allows.
 */
export const trackSwatch: Record<string, Swatch> = {
  start: 'yellow',
  foundations: 'turquoise',
  llm: 'pink',
  'rag-agents': 'lime',
  evals: 'red',
  serving: 'navy',
  infra: 'forest',
  local: 'purple',
  cloud: 'sky',
  systems: 'tangerine',
  cost: 'magenta',
  edge: 'cocoa',
};

export const gameSwatch: Record<string, Swatch> = {
  blueprint: 'navy',
  'cost-crunch': 'yellow',
  'fit-the-model': 'magenta',
  'rack-and-stack': 'lime',
  'incident-room': 'purple',
};

/**
 * For long lists of cards: an order of all twelve colours in which any card and the
 * three after it (the next in a row, and the next row in a two or three column grid)
 * are as different as the palette allows. Use cycleSwatch(index).
 */
export const cardCycle: Swatch[] = ['red', 'turquoise', 'purple', 'navy', 'cocoa', 'lime', 'tangerine', 'sky', 'pink', 'forest', 'magenta', 'yellow'];
export const cycleSwatch = (index: number): string => swatch[cardCycle[index % cardCycle.length]];

/** The eight layers of an AI product, top to bottom. */
export const layerSwatch: Swatch[] = ['lime', 'navy', 'tangerine', 'purple', 'forest', 'magenta', 'turquoise', 'red'];
