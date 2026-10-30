/*
 * Nearest-neighbour doodle sorting for the DoodleTrainer activity.
 *
 * A drawing is a list of strokes, each a list of points. To compare two
 * drawings we turn each one into a small grid of numbers:
 *   1. crop to the box around the ink, so position on the canvas does not matter;
 *   2. scale the longer side to fit the grid, so size does not matter
 *      (the aspect ratio is kept, so a line stays a line);
 *   3. draw the strokes with a fixed pen width in grid units, so a thick or
 *      thin pen gives the same picture;
 *   4. blur lightly, so a stroke a little to one side still overlaps;
 *   5. scale the numbers to length 1, so the amount of ink does not dominate.
 * Then two drawings are as alike as their grids are close. Everything here is
 * pure and deterministic, so it is easy to test.
 */

export type Point = { x: number; y: number };
export type Stroke = Point[];
export type Drawing = Stroke[];

/** Width and height of the grid a drawing is shrunk to. */
export const GRID = 16;

/** Empty cells kept around the drawing inside the grid. */
const MARGIN = 1.5;

/** Box around every point of a drawing, or null when there is no ink. */
export function bounds(drawing: Drawing) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const stroke of drawing) {
    for (const p of stroke) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  if (minX === Infinity) return null;
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

/** True when a drawing has enough ink to be worth keeping (not just a tap). */
export function hasInk(drawing: Drawing, minSize = 0.03): boolean {
  const b = bounds(drawing);
  return !!b && Math.max(b.w, b.h) >= minSize;
}

/** Distance from point (px, py) to the segment a-b. */
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = ax + t * dx - px;
  const cy = ay + t * dy - py;
  return Math.sqrt(cx * cx + cy * cy);
}

/** Draws the drawing into a size x size grid of ink amounts from 0 to 1, before blurring. */
export function rasterise(drawing: Drawing, size = GRID): number[] {
  const out = new Array<number>(size * size).fill(0);
  const b = bounds(drawing);
  if (!b) return out;
  const span = Math.max(b.w, b.h) || 1;
  const inner = size - 2 * MARGIN;
  const midX = (b.minX + b.maxX) / 2;
  const midY = (b.minY + b.maxY) / 2;
  const toGrid = (p: Point) => ({ x: size / 2 + ((p.x - midX) / span) * inner, y: size / 2 + ((p.y - midY) / span) * inner });

  // every stroke as grid-space segments; a single tap becomes a zero-length segment
  const segs: number[][] = [];
  for (const stroke of drawing) {
    if (!stroke.length) continue;
    const pts = stroke.map(toGrid);
    if (pts.length === 1) segs.push([pts[0].x, pts[0].y, pts[0].x, pts[0].y]);
    for (let i = 1; i < pts.length; i++) segs.push([pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y]);
  }

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const cx = col + 0.5;
      const cy = row + 0.5;
      let d = Infinity;
      for (const s of segs) {
        const sd = segDist(cx, cy, s[0], s[1], s[2], s[3]);
        if (sd < d) d = sd;
      }
      // full ink within half a cell of the line, fading to none at one and a half cells
      const v = 1.5 - d;
      out[row * size + col] = v <= 0 ? 0 : v >= 1 ? 1 : v;
    }
  }
  return out;
}

/** A light 3x3 blur, weights 1-2-1 in each direction. */
export function blur(grid: number[], size = GRID): number[] {
  const w = [1, 2, 1];
  const out = new Array<number>(size * size).fill(0);
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      let sum = 0;
      let weight = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const r = row + dy;
        if (r < 0 || r >= size) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const c = col + dx;
          if (c < 0 || c >= size) continue;
          const k = w[dy + 1] * w[dx + 1];
          sum += grid[r * size + c] * k;
          weight += k;
        }
      }
      out[row * size + col] = sum / weight;
    }
  }
  return out;
}

/** The grid a drawing is compared by: cropped, scaled, drawn, blurred and scaled to length 1. */
export function normalise(drawing: Drawing, size = GRID): number[] {
  const g = blur(rasterise(drawing, size), size);
  let len = 0;
  for (const v of g) len += v * v;
  len = Math.sqrt(len);
  return len === 0 ? g : g.map((v) => v / len);
}

/** Straight-line distance between two grids. 0 means identical. */
export function distance(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

export type Example<L> = { label: L; vec: number[] };
export type Neighbour<L> = { index: number; label: L; distance: number };
export type Guess<L> = {
  label: L;
  /** how many of the k nearest examples share the guessed label */
  votes: number;
  k: number;
  /** the k nearest examples, closest first */
  neighbours: Neighbour<L>[];
};

/**
 * k-nearest-neighbour vote: find the k examples closest to the new drawing
 * and pick the label most of them share. Ties in distance go to the earlier
 * example; tied votes go to the label whose examples are closer in total.
 */
export function classify<L>(vec: number[], examples: Example<L>[], k = 3): Guess<L> | null {
  if (!examples.length) return null;
  const ranked = examples
    .map((e, index) => ({ index, label: e.label, distance: distance(vec, e.vec) }))
    .sort((a, b) => a.distance - b.distance || a.index - b.index);
  const neighbours = ranked.slice(0, Math.min(k, ranked.length));

  const tally = new Map<L, { votes: number; total: number; first: number }>();
  neighbours.forEach((n, i) => {
    const t = tally.get(n.label) ?? { votes: 0, total: 0, first: i };
    t.votes += 1;
    t.total += n.distance;
    tally.set(n.label, t);
  });
  let best: L = neighbours[0].label;
  let bestT = tally.get(best)!;
  for (const [label, t] of tally) {
    if (t.votes > bestT.votes || (t.votes === bestT.votes && (t.total < bestT.total || (t.total === bestT.total && t.first < bestT.first)))) {
      best = label;
      bestT = t;
    }
  }
  return { label: best, votes: bestT.votes, k: neighbours.length, neighbours };
}

/** True when one side has clearly more examples than the other. */
export function unbalanced(a: number, b: number): boolean {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return hi - lo >= 3 && hi >= lo * 1.5;
}
