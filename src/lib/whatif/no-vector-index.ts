/**
 * What if there is no vector index? Exact search compares the question with every stored vector (a "brute-force scan").
 * An approximate-nearest-neighbour (ANN) index, such as a graph index, jumps through a few thousand of them instead.
 * All rates below are EXAMPLE figures for one CPU core, stated on the page. Real speeds depend on the hardware,
 * the index settings and the data, so use the shape (straight line against nearly flat) and not the exact milliseconds.
 */

/** Numbers per vector (example: a 768-number embedding). */
export const DIM = 768;
/** Bytes per number (32-bit floats). */
export const BYTES = 4;
/** Example memory bandwidth for a sequential scan on one core, bytes per second (20 GB/s). */
export const SCAN_BYTES_PER_S = 20e9;
/** Example cost of one random vector fetch plus its distance check inside an index, seconds (0.5 microseconds). */
export const RANDOM_CHECK_S = 0.5e-6;
/** Example search effort of the index: distance checks are about this many times log2 of the collection size. */
export const ANN_EFFORT = 400;
/** Example links stored per vector in a graph index, and bytes per link. */
export const LINKS = 16;
export const LINK_BYTES = 4;
/** Example time budget for the search step of one request, in milliseconds. */
export const BUDGET_MS = 100;

/** Distance checks made by an exact scan: every vector. */
export function bruteChecks(n: number): number {
  return n;
}

/** Distance checks made by the index (it never does more than a full scan would). */
export function annChecks(n: number): number {
  return Math.min(n, Math.round(ANN_EFFORT * Math.log2(Math.max(2, n))));
}

/** Multiply-adds for a number of distance checks (one per number in the vector). */
export function multiplyAdds(checks: number): number {
  return checks * DIM;
}

/** Milliseconds for an exact scan: it reads every stored byte once, so it is limited by memory bandwidth. */
export function bruteMs(n: number): number {
  return ((n * DIM * BYTES) / SCAN_BYTES_PER_S) * 1000;
}

/** Milliseconds for the index: each check is a random fetch, which costs more per vector than a scan. */
export function annMs(n: number): number {
  return annChecks(n) * RANDOM_CHECK_S * 1000;
}

/** How many times faster the index is (below 1 means the scan is faster). */
export function speedup(n: number): number {
  return bruteMs(n) / annMs(n);
}

/** Extra memory the index needs for its links, in bytes. */
export function indexBytes(n: number): number {
  return n * LINKS * LINK_BYTES;
}

/** Memory the vectors themselves take, in bytes. */
export function vectorBytes(n: number): number {
  return n * DIM * BYTES;
}

/** Smallest collection size where the index beats the scan (found by bisection, rounded up). */
export function crossover(): number {
  let lo = 2;
  let hi = 1e9;
  for (let i = 0; i < 80; i++) {
    const mid = Math.sqrt(lo * hi);
    if (annMs(mid) < bruteMs(mid)) hi = mid;
    else lo = mid;
  }
  return Math.ceil(hi);
}

/** Collection size where an exact scan first goes over the time budget. */
export function brutePastBudget(): number {
  return Math.ceil((BUDGET_MS / 1000) * (SCAN_BYTES_PER_S / (DIM * BYTES)));
}

/** The slider works in powers of ten: exponent 2 to 9 in quarter steps. */
export const EXP_MIN = 2;
export const EXP_MAX = 9;
export const EXP_STEP = 0.25;
export function sizeFromExp(e: number): number {
  return Math.round(10 ** e);
}

/** Share of the collection that one search looks at. */
export function shareChecked(n: number, indexed: boolean): number {
  return (indexed ? annChecks(n) : bruteChecks(n)) / n;
}

/** How many of `cells` squares to light to show that share (at least one, so a tiny share stays visible). */
export function litCells(n: number, indexed: boolean, cells: number): number {
  return Math.min(cells, Math.max(1, Math.ceil(shareChecked(n, indexed) * cells)));
}

/** A short readable count: 1,200 / 4.5 thousand / 2 million / 1 billion. */
export function fmtCount(n: number): string {
  if (n >= 1e9) return trim(n / 1e9) + ' billion';
  if (n >= 1e6) return trim(n / 1e6) + ' million';
  if (n >= 1e4) return trim(n / 1e3) + ' thousand';
  return Math.round(n).toLocaleString('en-US');
}
function trim(x: number): string {
  return x >= 100 ? String(Math.round(x)) : String(Math.round(x * 10) / 10);
}

/** A time in plain units: microseconds, milliseconds, seconds or minutes. */
export function fmtTime(ms: number): string {
  if (ms < 1) return Math.round(ms * 1000) + ' microseconds';
  if (ms < 1000) return (ms < 10 ? ms.toFixed(1) : String(Math.round(ms))) + ' ms';
  if (ms < 60000) return (ms / 1000).toFixed(1) + ' s';
  return (ms / 60000).toFixed(1) + ' min';
}

/** Bytes as MB or GB (decimal), for the memory notes. */
export function fmtBytes(b: number): string {
  if (b >= 1e9) return (b / 1e9).toFixed(1) + ' GB';
  if (b >= 1e6) return (b / 1e6).toFixed(1) + ' MB';
  return Math.round(b / 1e3) + ' KB';
}
