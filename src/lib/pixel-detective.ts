/*
 * Logic for the "Pixel detective" toy in the lesson "How AI finds things in a picture".
 *
 * The learner shades squares on a 7 by 7 grid. The detective works in two steps, like a real detector in
 * spirit (small patterns first, then whole things), but with hand-made rules instead of learned ones:
 *
 *  1. Small patterns: every straight run of 3 shaded squares is a "part". Four directions count:
 *     across, down, slanting up to the right (/) and slanting down to the right (\).
 *  2. Whole shapes: the detective knows four shapes (plus, cross, square, letter L), each made of a fixed
 *     list of parts. It slides each shape over the grid, anywhere it fits, and counts the parts it finds.
 *     Confidence = parts found / (parts the shape needs + extra parts in that window that do not belong).
 *
 * Everything is deterministic. A lone shaded square forms no part, so the detective ignores it.
 */

export const SIZE = 7;

/** A grid of 0 (blank) and 1 (shaded), row by row. */
export type Cells = number[][];

export type Direction = 'across' | 'down' | 'slash' | 'backslash';

/** Row and column steps for each direction. "slash" runs up to the right: down one row, left one column. */
export const STEPS: Record<Direction, [number, number]> = {
  across: [0, 1],
  down: [1, 0],
  slash: [1, -1],
  backslash: [1, 1],
};

export const DIRECTIONS: Direction[] = ['across', 'down', 'slash', 'backslash'];

export const RUN = 3;

/** A part: three squares in a line. Identified by its first square (top-most, then as scanned) and direction. */
export interface Part {
  r: number;
  c: number;
  dir: Direction;
}

export const emptyGrid = (): Cells => Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(0));

export const cloneGrid = (g: Cells): Cells => g.map((r) => r.slice());

const inside = (r: number, c: number, rows = SIZE, cols = SIZE) => r >= 0 && c >= 0 && r < rows && c < cols;

/** The squares a part covers. */
export function partCells(p: Part): [number, number][] {
  const [dr, dc] = STEPS[p.dir];
  return Array.from({ length: RUN }, (_, k) => [p.r + dr * k, p.c + dc * k] as [number, number]);
}

const key = (p: Part) => `${p.r},${p.c},${p.dir}`;

/** Every run of 3 shaded squares in a grid, in scan order. */
export function findParts(g: Cells): Part[] {
  const out: Part[] = [];
  const rows = g.length;
  const cols = g[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      for (const dir of DIRECTIONS) {
        const p = { r, c, dir };
        const cells = partCells(p);
        if (cells.every(([rr, cc]) => inside(rr, cc, rows, cols) && g[rr][cc] === 1)) out.push(p);
      }
    }
  }
  return out;
}

export function countByDirection(parts: Part[]): Record<Direction, number> {
  const n: Record<Direction, number> = { across: 0, down: 0, slash: 0, backslash: 0 };
  for (const p of parts) n[p.dir] += 1;
  return n;
}

/* ---------- the shapes the detective knows ---------- */

export interface Shape {
  id: 'plus' | 'cross' | 'square' | 'ell';
  name: string;
  /** Article and name for sentences, such as "a plus". */
  phrase: string;
  rows: string[];
}

export const SHAPES: Shape[] = [
  { id: 'plus', name: 'plus', phrase: 'a plus', rows: ['..#..', '..#..', '#####', '..#..', '..#..'] },
  { id: 'cross', name: 'cross (X)', phrase: 'a cross', rows: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'] },
  { id: 'square', name: 'square', phrase: 'a square', rows: ['#####', '#...#', '#...#', '#...#', '#####'] },
  { id: 'ell', name: 'letter L', phrase: 'a letter L', rows: ['#....', '#....', '#....', '#....', '#####'] },
];

export function shapeCells(s: Shape): Cells {
  return s.rows.map((r) => r.split('').map((ch) => (ch === '#' ? 1 : 0)));
}

/** The parts a shape is made of: every run of 3 that lies completely inside the shape. */
export function shapeParts(s: Shape): Part[] {
  return findParts(shapeCells(s));
}

export interface Match {
  shape: Shape;
  /** Top-left square of the best window, and its size. */
  top: number;
  left: number;
  height: number;
  width: number;
  /** Parts of the shape that were found, and how many it needs. */
  found: number;
  needed: number;
  /** Parts inside the window that do not belong to the shape. */
  extra: number;
  /** Which needed parts are missing, as the squares of each (for a kind explanation). */
  missing: Part[];
  confidence: number;
}

/** Score one shape at one position. */
export function scoreAt(g: Cells, s: Shape, top: number, left: number, partsInGrid?: Part[]): Match {
  const need = shapeParts(s);
  const height = s.rows.length;
  const width = s.rows[0].length;
  const have = new Set((partsInGrid ?? findParts(g)).map(key));
  const shifted = (p: Part): Part => ({ r: p.r + top, c: p.c + left, dir: p.dir });
  const needKeys = new Set(need.map((p) => key(shifted(p))));
  const missing = need.filter((p) => !have.has(key(shifted(p))));
  const found = need.length - missing.length;
  let extra = 0;
  for (const p of partsInGrid ?? findParts(g)) {
    const cells = partCells(p);
    const fully = cells.every(([r, c]) => r >= top && r < top + height && c >= left && c < left + width);
    if (fully && !needKeys.has(key(p))) extra += 1;
  }
  const confidence = need.length + extra > 0 ? found / (need.length + extra) : 0;
  return { shape: s, top, left, height, width, found, needed: need.length, extra, missing: missing.map(shifted), confidence };
}

/** Slide a shape over every position where it fits and keep the best. Ties keep the first (top-left most). */
export function bestMatch(g: Cells, s: Shape): Match {
  const parts = findParts(g);
  const height = s.rows.length;
  const width = s.rows[0].length;
  let best: Match | null = null;
  for (let top = 0; top + height <= g.length; top++) {
    for (let left = 0; left + width <= g[0].length; left++) {
      const m = scoreAt(g, s, top, left, parts);
      if (best === null || m.confidence > best.confidence + 1e-12) best = m;
    }
  }
  return best as Match;
}

/* ---------- the detective's report ---------- */

export type Verdict = 'blank' | 'nothing' | 'sure' | 'maybe' | 'torn' | 'unsure';

export const SURE = 0.75;
export const MAYBE = 0.4;

export interface Report {
  verdict: Verdict;
  shaded: number;
  parts: Part[];
  counts: Record<Direction, number>;
  /** Shaded squares that belong to no part at all (lone dots and short bits). */
  stray: number;
  matches: Match[];
  best: Match | null;
  /** The second-best match when it is within 5 points of the best. */
  rival: Match | null;
  headline: string;
  detail: string;
}

export function shadedCount(g: Cells): number {
  return g.reduce((s, r) => s + r.reduce((a, v) => a + v, 0), 0);
}

export const pct = (x: number) => `${Math.round(x * 100)}%`;

/** The numbers and a kind explanation, for any grid. */
export function detect(g: Cells): Report {
  const shaded = shadedCount(g);
  const parts = findParts(g);
  const counts = countByDirection(parts);
  const covered = new Set<string>();
  for (const p of parts) for (const [r, c] of partCells(p)) covered.add(`${r},${c}`);
  const stray = shaded - covered.size;
  const matches = SHAPES.map((s) => bestMatch(g, s));
  const ranked = matches.slice().sort((a, b) => b.confidence - a.confidence);
  const best = ranked[0];
  const base = { shaded, parts, counts, stray, matches };

  if (shaded === 0) {
    return { ...base, verdict: 'blank', best: null, rival: null, headline: 'The grid is blank.', detail: 'Tap squares to shade them, or pick a picture to start from.' };
  }
  if (parts.length === 0 || best.found === 0) {
    return {
      ...base,
      verdict: 'nothing',
      best: null,
      rival: null,
      headline: 'I cannot find anything I know.',
      detail:
        parts.length === 0
          ? shaded >= 4
            ? 'I found no straight line of 3 shaded squares in a row. The lines here are broken into short bits, and I cannot fill in gaps the way a person can. Try closing the gaps.'
            : 'I look for straight lines of 3 shaded squares, and there are none here. Single dots and short bits are too small for me to count. Try a longer line.'
          : 'I found some small lines, but none that fit a shape I know. A person might still see something here. I only know four shapes, and I need whole parts of them.',
    };
  }

  const rival = ranked[1] && best.confidence - ranked[1].confidence <= 0.05 && ranked[1].found > 0 ? ranked[1] : null;
  const where = `rows ${best.top + 1} to ${best.top + best.height}, columns ${best.left + 1} to ${best.left + best.width}`;
  const partsText = `${best.found} of the ${best.needed} parts of ${best.shape.phrase}`;
  const extraText =
    best.extra > 0 ? ` There ${best.extra === 1 ? 'is 1 extra part' : `are ${best.extra} extra parts`} in the box that ${best.extra === 1 ? 'does' : 'do'} not belong, which lowers my score.` : '';
  const missingText =
    best.missing.length > 0 ? ` ${best.missing.length === 1 ? '1 part is' : `${best.missing.length} parts are`} missing.` : '';
  const strayText = stray > 0 ? ` I ignored ${stray} shaded ${stray === 1 ? 'square' : 'squares'} that ${stray === 1 ? 'is' : 'are'} too lonely to make a part.` : '';

  if (rival) {
    return {
      ...base,
      verdict: 'torn',
      best,
      rival,
      headline: `I am torn between ${best.shape.phrase} and ${rival.shape.phrase}, about ${pct(best.confidence)} each.`,
      detail: `Both fit equally well. I found ${partsText}, and the same number for ${rival.shape.phrase}, but each also sees extra parts that belong to the other. A mixed-up drawing gives a mixed-up answer.${strayText}`,
    };
  }
  if (best.confidence >= SURE) {
    return {
      ...base,
      verdict: 'sure',
      best,
      rival: null,
      headline: `I think this is ${best.shape.phrase}. I am ${pct(best.confidence)} sure.`,
      detail: `I found ${partsText}, in ${where}.${missingText}${missingText ? ' A person would not mind, but I need the whole part.' : ''}${extraText}${strayText}`,
    };
  }
  if (best.confidence >= MAYBE) {
    return {
      ...base,
      verdict: 'maybe',
      best,
      rival: null,
      headline: `Maybe ${best.shape.phrase}, but I am only ${pct(best.confidence)} sure.`,
      detail: `I found ${partsText}, in ${where}.${missingText}${extraText}${strayText} A score this low is a good moment for a person to take a look.`,
    };
  }
  return {
    ...base,
    verdict: 'unsure',
    best,
    rival: null,
    headline: `I am not sure. My best guess is ${best.shape.phrase} at ${pct(best.confidence)}.`,
    detail: `I found ${partsText}.${missingText}${best.extra > 0 ? ` There ${best.extra === 1 ? 'is 1 extra part' : `are ${best.extra} extra parts`} that ${best.extra === 1 ? 'does' : 'do'} not fit.` : ''} Too much is wrong for me to say.${strayText}`,
  };
}

/* ---------- ready-made pictures ---------- */

/** Place a shape's squares on an empty grid at a position. */
export function place(s: Shape, top: number, left: number, g: Cells = emptyGrid()): Cells {
  const out = cloneGrid(g);
  s.rows.forEach((row, r) => row.split('').forEach((ch, c) => { if (ch === '#') out[top + r][left + c] = 1; }));
  return out;
}

const shape = (id: Shape['id']) => SHAPES.find((s) => s.id === id)!;

function without(g: Cells, cells: [number, number][]): Cells {
  const out = cloneGrid(g);
  for (const [r, c] of cells) out[r][c] = 0;
  return out;
}

export interface Example {
  id: string;
  label: string;
  grid: Cells;
}

export const EXAMPLES: Example[] = [
  { id: 'plus', label: 'A plus', grid: place(shape('plus'), 1, 1) },
  { id: 'cross', label: 'A cross', grid: place(shape('cross'), 2, 0) },
  { id: 'square', label: 'A square', grid: place(shape('square'), 0, 2) },
  { id: 'ell', label: 'A letter L', grid: place(shape('ell'), 2, 2) },
  { id: 'dent', label: 'A plus with one square missing', grid: without(place(shape('plus'), 1, 1), [[1, 3]]) },
  { id: 'gap', label: 'A plus with a gap in the middle', grid: without(place(shape('plus'), 1, 1), [[3, 3]]) },
  { id: 'dots', label: 'A plus and two stray dots', grid: (() => { const g = place(shape('plus'), 1, 1); g[0][6] = 1; g[6][0] = 1; return g; })() },
  { id: 'mixed', label: 'A plus and a cross on top of each other', grid: place(shape('cross'), 1, 1, place(shape('plus'), 1, 1)) },
];

export function gridToText(g: Cells): string {
  return g.map((r) => r.map((v) => (v ? '#' : '.')).join('')).join('\n');
}
