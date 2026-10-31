/*
 * Logic for the "How computers see" lesson: a small convolution you can step through by hand,
 * pooling, and the parameter counts that explain why images use convolutions instead of plain layers.
 *
 * Pictures here are tiny greyscale grids with brightness 0 (black) to 9 (white). Real images use
 * 0 to 255 and three colour channels, but the arithmetic is identical.
 */

export type Grid = number[][];

export interface Kernel {
  /** The nine weights, row by row. */
  w: Grid;
  /** The total is divided by this at the end (used to keep a blur as bright as the original). */
  divide: number;
}

/* ---------- the built-in pictures ---------- */

function parse(rows: string[]): Grid {
  return rows.map((r) => r.split('').map(Number));
}

/** A house with a sun and a lawn: vertical walls, a horizontal ground line and diagonal roof edges. */
export const HOUSE: Grid = parse([
  '888888888998',
  '888822888998',
  '888222288888',
  '882222228888',
  '822222222888',
  '855555555888',
  '859955995888',
  '859955995888',
  '855551155888',
  '855551155888',
  '333333333333',
  '333333333333',
]);

/** A smiley face, which has curves instead of straight lines. */
export const FACE: Grid = parse([
  '222888888222',
  '228888888822',
  '288888888882',
  '888118811888',
  '888118811888',
  '888888888888',
  '888888888888',
  '818888888818',
  '881888888188',
  '288111111882',
  '228888888822',
  '222888888222',
]);

export interface Picture {
  id: string;
  label: string;
  alt: string;
  pixels: Grid;
}

export const PICTURES: Picture[] = [
  { id: 'house', label: 'House', alt: 'a pixel-art house with a dark triangular roof, two windows and a door, a sun in the corner and a lawn', pixels: HOUSE },
  { id: 'face', label: 'Face', alt: 'a pixel-art smiley face on a dark background', pixels: FACE },
];

/* ---------- the filters ---------- */

export interface Preset {
  id: string;
  label: string;
  blurb: string;
  kernel: Kernel;
}

export const PRESETS: Preset[] = [
  {
    id: 'vertical',
    label: 'Vertical edges',
    blurb: 'Negative on the left, positive on the right: it lights up where dark meets bright going left to right.',
    kernel: { w: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], divide: 1 },
  },
  {
    id: 'horizontal',
    label: 'Horizontal edges',
    blurb: 'Negative on top, positive below: it lights up where dark meets bright going top to bottom.',
    kernel: { w: [[-1, -2, -1], [0, 0, 0], [1, 2, 1]], divide: 1 },
  },
  {
    id: 'outline',
    label: 'Outline',
    blurb: 'Eight negatives around one big positive: flat areas cancel to zero, so only edges in any direction survive.',
    kernel: { w: [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]], divide: 1 },
  },
  {
    id: 'blur',
    label: 'Blur',
    blurb: 'Nine ones, divided by nine: each pixel becomes the average of its neighbourhood.',
    kernel: { w: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], divide: 9 },
  },
  {
    id: 'sharpen',
    label: 'Sharpen',
    blurb: 'The pixel itself counts five times and its four neighbours subtract: differences get exaggerated.',
    kernel: { w: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]], divide: 1 },
  },
];

/** The starting weights for the custom filter: a slightly lopsided one to play with. */
export const CUSTOM_START: Grid = [[0, 0, 0], [0, 1, 0], [0, 0, 0]];

export const sumOf = (w: Grid): number => w.flat().reduce((a, b) => a + b, 0);

/** For a custom filter whose weights add to more than 1, divide by the total so the picture stays as bright. */
export function autoDivide(w: Grid): number {
  const s = sumOf(w);
  return s > 1 ? s : 1;
}

/** Filters whose weights add to zero give 0 on flat areas; they report change, not brightness. */
export const isDetector = (k: Kernel): boolean => sumOf(k.w) === 0;

/* ---------- sliding the filter ---------- */

export interface Options {
  /** Rows and columns of zeros added around the edge (0 or 1 for a 3x3 filter). */
  pad: number;
  /** How many pixels the filter jumps each time. */
  stride: number;
}

/** Output size along one side: floor((n + 2 * pad - k) / stride) + 1. */
export function outSize(n: number, k: number, pad: number, stride: number): number {
  if (n + 2 * pad < k) return 0;
  return Math.floor((n + 2 * pad - k) / stride) + 1;
}

/** The size-by-size patch whose top-left corner is at (top, left). Anything outside the picture counts as 0. */
export function patchAt(img: Grid, top: number, left: number, size = 3): Grid {
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => img[top + r]?.[left + c] ?? 0),
  );
}

/** Top-left corner of the patch used for output cell (row, col). */
export function origin(row: number, col: number, opts: Options): [number, number] {
  return [row * opts.stride - opts.pad, col * opts.stride - opts.pad];
}

/** Multiply each pixel in the patch by the weight above it. */
export function products(patch: Grid, w: Grid): Grid {
  return patch.map((row, r) => row.map((v, c) => v * w[r][c]));
}

/** The one number the filter reports for a patch: the products added up, then divided. */
export function respond(patch: Grid, k: Kernel): number {
  return sumOf(products(patch, k.w)) / k.divide;
}

/** The feature map: the filter's response at every position. (Deep-learning libraries call this "convolution" although it is cross-correlation: the filter is not flipped.) */
export function convolve(img: Grid, k: Kernel, opts: Options): Grid {
  const h = outSize(img.length, 3, opts.pad, opts.stride);
  const w = outSize(img[0].length, 3, opts.pad, opts.stride);
  return Array.from({ length: h }, (_, i) =>
    Array.from({ length: w }, (_, j) => {
      const [t, l] = origin(i, j, opts);
      return respond(patchAt(img, t, l), k);
    }),
  );
}

/** Keep the biggest number in each size-by-size block (stride = size by default). Blocks that do not fit are dropped. */
export function maxPool(map: Grid, size = 2, stride = size): Grid {
  const h = outSize(map.length, size, 0, stride);
  const w = outSize(map[0]?.length ?? 0, size, 0, stride);
  return Array.from({ length: h }, (_, i) =>
    Array.from({ length: w }, (_, j) => {
      let best = -Infinity;
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) best = Math.max(best, map[i * stride + r][j * stride + c]);
      return best;
    }),
  );
}

/* ---------- counting weights ---------- */

/** Weights in a fully connected layer: every input connects to every output, plus one bias per output. */
export function denseParams(inputs: number, outputs: number, bias = true): number {
  return inputs * outputs + (bias ? outputs : 0);
}

/** Weights in a convolution layer: one k-by-k-by-channels filter per output channel, plus one bias each. The picture size does not appear. */
export function convParams(k: number, inChannels: number, outChannels: number, bias = true): number {
  return k * k * inChannels * outChannels + (bias ? outChannels : 0);
}

export interface Layer {
  /** Filter or pooling window size. */
  k: number;
  stride: number;
}

/** How many input pixels (along one side) can influence one output cell after a stack of layers. */
export function receptiveField(layers: Layer[]): number {
  let size = 1;
  let jump = 1;
  for (const l of layers) {
    size += (l.k - 1) * jump;
    jump *= l.stride;
  }
  return size;
}

/* ---------- drawing the numbers ---------- */

/** Grey level 0..255 for a brightness 0..9 (values outside the range are clipped, as in a real image). */
export function greyFor(v: number): number {
  return Math.round((Math.max(0, Math.min(9, v)) / 9) * 255);
}

/** Round to at most one decimal place for display, with a real minus sign. */
export function show(v: number): string {
  const r = Math.round(v * 10) / 10;
  const s = Number.isInteger(r) ? String(r) : r.toFixed(1);
  return s.replace('-', '−');
}
