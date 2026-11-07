/**
 * What if attention stores the whole n-by-n score table?
 * The size of the score table is arithmetic. A tiny seeded check also shows that computing attention in tiles
 * (with a running softmax) gives the same answer as building the whole table.
 */

export const seqChoices = [1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072] as const;
export const headChoices = [8, 32, 64] as const;
/** Example GPU memory sizes in GiB. */
export const gpuChoices = [24, 40, 80] as const;
/** Example: 16-bit scores. */
export const BYTES_PER_SCORE = 2;
/** Example: a running maximum and a running sum per row, 4 bytes each. */
export const STAT_BYTES = 8;

const GIB = 1024 ** 3;

/** Bytes of ONE n-by-n table of scores for every head, in one layer, for one conversation. */
export function scoreTableBytes(n: number, heads: number, bytesPerScore = BYTES_PER_SCORE): number {
  return n * n * heads * bytesPerScore;
}

/** In tiles, the n-by-n table is never stored. What grows with n is a pair of running numbers per row, per head. */
export function tiledExtraBytes(n: number, heads: number, statBytes = STAT_BYTES): number {
  return n * heads * statBytes;
}

export const fitsIn = (bytes: number, gpuGiB: number) => bytes <= gpuGiB * GIB;

/** The longest sequence whose whole table would fit in this much memory (if nothing else used any). */
export function maxFittingN(heads: number, gpuGiB: number, bytesPerScore = BYTES_PER_SCORE): number {
  return Math.floor(Math.sqrt((gpuGiB * GIB) / (heads * bytesPerScore)));
}

/** How many times the GPU memory the table would need. */
export const overshoot = (bytes: number, gpuGiB: number) => bytes / (gpuGiB * GIB);

export function formatBytes(b: number): string {
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  let v = b;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u += 1;
  }
  const s = v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1).replace(/\.0$/, '') : v.toFixed(2).replace(/0$/, '').replace(/\.0$/, '');
  return `${s} ${units[u]}`;
}

/** The order an illustration visits tiles of a rows-by-cols grid, row by row. */
export function tileAt(index: number, cols: number): { row: number; col: number } {
  return { row: Math.floor(index / cols), col: index % cols };
}

// ---- a tiny exact check: tiles give the same answer as the whole table ----

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Mat = number[][];
export function randomMatrix(rows: number, cols: number, seed: number): Mat {
  const rnd = mulberry32(seed);
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => rnd() * 2 - 1));
}

const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);

/** Standard attention for one head: build the whole n-by-n table of scores, softmax every row, mix the values. */
export function fullAttention(Q: Mat, K: Mat, V: Mat): { out: Mat; heldScores: number } {
  const d = Q[0].length;
  const scores = Q.map((q) => K.map((k) => dot(q, k) / Math.sqrt(d)));
  const out = scores.map((row) => {
    const m = Math.max(...row);
    const e = row.map((s) => Math.exp(s - m));
    const sum = e.reduce((a, b) => a + b, 0);
    return V[0].map((_, c) => e.reduce((acc, w, j) => acc + (w / sum) * V[j][c], 0));
  });
  return { out, heldScores: Q.length * K.length };
}

/** The same answer in tiles of keys: keep a running maximum and sum per row, never the whole row of scores. */
export function tiledAttention(Q: Mat, K: Mat, V: Mat, tile: number): { out: Mat; heldScores: number } {
  const d = Q[0].length;
  let held = 0;
  const out = Q.map((q) => {
    let m = -Infinity;
    let l = 0;
    let acc = V[0].map(() => 0);
    for (let t0 = 0; t0 < K.length; t0 += tile) {
      const idx = Array.from({ length: Math.min(tile, K.length - t0) }, (_, i) => t0 + i);
      const s = idx.map((j) => dot(q, K[j]) / Math.sqrt(d)); // only this tile of scores exists
      held = Math.max(held, s.length);
      const mNew = Math.max(m, ...s);
      const scale = m === -Infinity ? 0 : Math.exp(m - mNew);
      const e = s.map((x) => Math.exp(x - mNew));
      l = l * scale + e.reduce((a, b) => a + b, 0);
      acc = acc.map((a, c) => a * scale + e.reduce((sum, w, i) => sum + w * V[idx[i]][c], 0));
      m = mNew;
    }
    return acc.map((a) => a / l);
  });
  return { out, heldScores: held };
}

export const maxAbsDiff = (A: Mat, B: Mat) => Math.max(...A.flatMap((row, i) => row.map((x, j) => Math.abs(x - B[i][j]))));

/** Run the tiny check: 12 tokens, 4 numbers per head, tiles of 3. */
export function sameAnswerCheck(n = 12, d = 4, tile = 3) {
  const Q = randomMatrix(n, d, 1);
  const K = randomMatrix(n, d, 2);
  const V = randomMatrix(n, d, 3);
  const full = fullAttention(Q, K, V);
  const tiled = tiledAttention(Q, K, V, tile);
  return { diff: maxAbsDiff(full.out, tiled.out), fullHeld: full.heldScores, tiledHeld: tiled.heldScores, n, tile };
}
