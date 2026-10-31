/*
 * Logic for the "Bias Detective" activity in the lesson "When the examples are unfair".
 *
 * The toy job: sort drawn cards into "star" or "heart". Each card was drawn in one of two
 * pen styles, "marker" (thick, dark lines) or "pencil" (thin, pale lines). The sorter reads
 * two made-up numbers from every card:
 *   pointy : how spiky the outline is, from 0 (round) to 1 (very spiky);
 *   dark   : how dark the pen lines are, from 0 (very pale) to 1 (very dark).
 * Pale pencil lines make the spikiness reading weaker, so a pencil star scores lower on
 * "pointy" than a marker star does. All numbers are invented for the toy. Nothing here
 * describes real people.
 *
 * The sorter is the simplest learner there is, "nearest average": it works out the average
 * star card and the average heart card from the training pile, and puts a new card with
 * whichever average it is closer to. Everything is deterministic, so it is easy to test.
 */

export type Shape = 'star' | 'heart';
export type Style = 'marker' | 'pencil';

export type Card = {
  id: string;
  shape: Shape;
  style: Style;
  pointy: number;
  dark: number;
};

export type Point = { pointy: number; dark: number };
export type Model = Record<Shape, Point | null>;

export type Score = { right: number; total: number };
export type Report = { overall: Score; byStyle: Record<Style, Score> };

export const SHAPES: Shape[] = ['star', 'heart'];
export const STYLES: Style[] = ['marker', 'pencil'];

/** How many cards of each shape the learner starts with, per style. */
export const START = { marker: 6, pencil: 1 } as const;
/** The most the learner can add of each shape, per style. */
export const LIMIT = { marker: 12, pencil: 8 } as const;
/** Cards added per press of an "add" button, per shape. */
export const STEP = 2;

const c = (id: string, shape: Shape, style: Style, pointy: number, dark: number): Card => ({ id, shape, style, pointy, dark });

/*
 * Pools of training cards, in the order they are added. The first ones are the start pile.
 * Marker cards sit in a tight group; pencil cards are paler and read as less pointy.
 */
export const MARKER_STARS: Card[] = [
  c('ms1', 'star', 'marker', 0.82, 0.86),
  c('ms2', 'star', 'marker', 0.74, 0.8),
  c('ms3', 'star', 'marker', 0.9, 0.9),
  c('ms4', 'star', 'marker', 0.68, 0.84),
  c('ms5', 'star', 'marker', 0.86, 0.78),
  c('ms6', 'star', 'marker', 0.78, 0.92),
  c('ms7', 'star', 'marker', 0.72, 0.88),
  c('ms8', 'star', 'marker', 0.84, 0.82),
  c('ms9', 'star', 'marker', 0.76, 0.86),
  c('ms10', 'star', 'marker', 0.88, 0.84),
  c('ms11', 'star', 'marker', 0.7, 0.8),
  c('ms12', 'star', 'marker', 0.8, 0.9),
];
export const MARKER_HEARTS: Card[] = [
  c('mh1', 'heart', 'marker', 0.18, 0.84),
  c('mh2', 'heart', 'marker', 0.26, 0.8),
  c('mh3', 'heart', 'marker', 0.1, 0.9),
  c('mh4', 'heart', 'marker', 0.3, 0.86),
  c('mh5', 'heart', 'marker', 0.14, 0.78),
  c('mh6', 'heart', 'marker', 0.22, 0.92),
  c('mh7', 'heart', 'marker', 0.28, 0.88),
  c('mh8', 'heart', 'marker', 0.16, 0.82),
  c('mh9', 'heart', 'marker', 0.2, 0.86),
  c('mh10', 'heart', 'marker', 0.12, 0.84),
  c('mh11', 'heart', 'marker', 0.32, 0.8),
  c('mh12', 'heart', 'marker', 0.24, 0.9),
];
export const PENCIL_STARS: Card[] = [
  c('ps1', 'star', 'pencil', 0.3, 0.24),
  c('ps2', 'star', 'pencil', 0.24, 0.3),
  c('ps3', 'star', 'pencil', 0.28, 0.2),
  c('ps4', 'star', 'pencil', 0.22, 0.18),
  c('ps5', 'star', 'pencil', 0.26, 0.26),
  c('ps6', 'star', 'pencil', 0.31, 0.32),
  c('ps7', 'star', 'pencil', 0.25, 0.22),
  c('ps8', 'star', 'pencil', 0.27, 0.28),
];
export const PENCIL_HEARTS: Card[] = [
  c('ph1', 'heart', 'pencil', 0.1, 0.22),
  c('ph2', 'heart', 'pencil', 0.18, 0.28),
  c('ph3', 'heart', 'pencil', 0.06, 0.2),
  c('ph4', 'heart', 'pencil', 0.14, 0.3),
  c('ph5', 'heart', 'pencil', 0.2, 0.24),
  c('ph6', 'heart', 'pencil', 0.08, 0.26),
  c('ph7', 'heart', 'pencil', 0.16, 0.18),
  c('ph8', 'heart', 'pencil', 0.12, 0.32),
];

/*
 * The test pile: new cards the sorter has never seen. Like a real pile of cards it is mostly
 * marker (20 marker, 10 pencil), so the overall score hides how it does on pencil cards.
 */
export const TEST_CARDS: Card[] = [
  ...[
    [0.78, 0.84], [0.7, 0.9], [0.88, 0.8], [0.74, 0.82], [0.84, 0.88],
    [0.66, 0.86], [0.8, 0.78], [0.92, 0.86], [0.72, 0.8], [0.86, 0.9],
  ].map(([p, d], i) => c(`tms${i + 1}`, 'star', 'marker', p, d)),
  ...[
    [0.2, 0.86], [0.12, 0.8], [0.28, 0.9], [0.16, 0.84], [0.24, 0.78],
    [0.1, 0.88], [0.3, 0.82], [0.18, 0.9], [0.26, 0.86], [0.14, 0.8],
  ].map(([p, d], i) => c(`tmh${i + 1}`, 'heart', 'marker', p, d)),
  ...[
    [0.36, 0.26], [0.4, 0.22], [0.38, 0.3], [0.42, 0.18], [0.39, 0.28],
  ].map(([p, d], i) => c(`tps${i + 1}`, 'star', 'pencil', p, d)),
  ...[
    [0.12, 0.24], [0.2, 0.3], [0.08, 0.2], [0.16, 0.26], [0.22, 0.22],
  ].map(([p, d], i) => c(`tph${i + 1}`, 'heart', 'pencil', p, d)),
];

/** The training pile for a given number of cards per shape in each style. */
export function buildPile(markerPerShape: number, pencilPerShape: number): Card[] {
  const m = Math.max(0, Math.min(LIMIT.marker, markerPerShape));
  const p = Math.max(0, Math.min(LIMIT.pencil, pencilPerShape));
  return [...MARKER_STARS.slice(0, m), ...MARKER_HEARTS.slice(0, m), ...PENCIL_STARS.slice(0, p), ...PENCIL_HEARTS.slice(0, p)];
}

/** Count cards by style and shape. */
export function countPile(pile: Card[]): Record<Style, Record<Shape, number>> {
  const out: Record<Style, Record<Shape, number>> = { marker: { star: 0, heart: 0 }, pencil: { star: 0, heart: 0 } };
  for (const card of pile) out[card.style][card.shape]++;
  return out;
}

/** Learn: the average star card and the average heart card (null when a shape has no cards). */
export function train(pile: Card[]): Model {
  const model: Model = { star: null, heart: null };
  for (const shape of SHAPES) {
    const cards = pile.filter((x) => x.shape === shape);
    if (!cards.length) continue;
    model[shape] = {
      pointy: cards.reduce((s, x) => s + x.pointy, 0) / cards.length,
      dark: cards.reduce((s, x) => s + x.dark, 0) / cards.length,
    };
  }
  return model;
}

const dist2 = (a: Point, b: Point) => (a.pointy - b.pointy) ** 2 + (a.dark - b.dark) ** 2;

/** Guess a card's shape: whichever average card it sits closer to. Ties go to heart. */
export function predict(model: Model, card: Point): Shape {
  if (!model.star && !model.heart) return 'heart';
  if (!model.star) return 'heart';
  if (!model.heart) return 'star';
  return dist2(card, model.star) < dist2(card, model.heart) ? 'star' : 'heart';
}

const empty = (): Score => ({ right: 0, total: 0 });

/** Test the sorter on a pile of cards: the overall score and one score per pen style. */
export function evaluate(model: Model, cards: Card[]): Report {
  const report: Report = { overall: empty(), byStyle: { marker: empty(), pencil: empty() } };
  for (const card of cards) {
    const ok = predict(model, card) === card.shape ? 1 : 0;
    report.overall.total++;
    report.overall.right += ok;
    report.byStyle[card.style].total++;
    report.byStyle[card.style].right += ok;
  }
  return report;
}

export const percent = (s: Score) => (s.total ? Math.round((100 * s.right) / s.total) : 0);

/** Points between the best and the worst style. */
export function gap(report: Report): number {
  const p = STYLES.map((s) => percent(report.byStyle[s]));
  return Math.max(...p) - Math.min(...p);
}

/**
 * The line where the sorter changes its mind: every point equally close to both averages.
 * Returned as two end points inside the unit square, or null when it cannot be drawn.
 */
export function boundary(model: Model): [Point, Point] | null {
  const { star, heart } = model;
  if (!star || !heart) return null;
  const mx = (star.pointy + heart.pointy) / 2;
  const my = (star.dark + heart.dark) / 2;
  // direction from heart to star is the normal of the line
  const nx = star.pointy - heart.pointy;
  const ny = star.dark - heart.dark;
  if (Math.abs(nx) < 1e-9 && Math.abs(ny) < 1e-9) return null;
  const hits: Point[] = [];
  // intersect n . (p - m) = 0 with each edge of the unit square
  if (Math.abs(ny) > 1e-9) {
    for (const x of [0, 1]) {
      const y = my - (nx * (x - mx)) / ny;
      if (y >= 0 && y <= 1) hits.push({ pointy: x, dark: y });
    }
  }
  if (Math.abs(nx) > 1e-9) {
    for (const y of [0, 1]) {
      const x = mx - (ny * (y - my)) / nx;
      if (x >= 0 && x <= 1) hits.push({ pointy: x, dark: y });
    }
  }
  return hits.length >= 2 ? [hits[0], hits[1]] : null;
}

/**
 * The part of the unit square where the sorter says "star": every point closer to the average
 * star than to the average heart. A list of corners, or an empty list when it cannot be drawn
 * (or when the whole square says star).
 */
export function starSide(model: Model): Point[] {
  const { star, heart } = model;
  if (!star || !heart) return [];
  const nx = star.pointy - heart.pointy;
  const ny = star.dark - heart.dark;
  const mx = (star.pointy + heart.pointy) / 2;
  const my = (star.dark + heart.dark) / 2;
  const side = (p: Point) => nx * (p.pointy - mx) + ny * (p.dark - my); // > 0 means star
  const square: Point[] = [
    { pointy: 0, dark: 0 },
    { pointy: 1, dark: 0 },
    { pointy: 1, dark: 1 },
    { pointy: 0, dark: 1 },
  ];
  const out: Point[] = [];
  for (let i = 0; i < square.length; i++) {
    const a = square[i];
    const b = square[(i + 1) % square.length];
    const sa = side(a);
    const sb = side(b);
    if (sa >= 0) out.push(a);
    if ((sa >= 0) !== (sb >= 0)) {
      const t = sa / (sa - sb);
      out.push({ pointy: a.pointy + t * (b.pointy - a.pointy), dark: a.dark + t * (b.dark - a.dark) });
    }
  }
  return out.length >= 3 ? out : [];
}
