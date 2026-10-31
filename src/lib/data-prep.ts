/**
 * A small messy table of invented house listings, a set of cleaning choices, and a nearest-neighbours
 * model that scores them. Everything is example data made up for the lesson "Getting data ready".
 * The point is the order of operations: split first, then learn every number (fill value, scale)
 * from the training rows only.
 */

import { ridgeFit } from './linalg';

export const SQFT_PER_M2 = 10.7639;

export type Split = 'train' | 'valid' | 'test';
export type Gap = 'zero' | 'drop' | 'mean' | 'median' | 'flag';
export type AreaEncoding = 'skip' | 'codes' | 'onehot';
export type Scaling = 'none' | 'minmax' | 'standard';
export type LeakKind = 'prep' | 'copy' | 'target';
export type Model = 'line' | 'knn';

export interface House {
  id: number;
  /** As typed: square metres or square feet depending on `unit`. Null means left blank. */
  size: number | null;
  unit: 'm2' | 'ft2';
  rooms: number;
  /** Years old. Null means left blank; 999 is a placeholder someone typed. */
  age: number | null;
  /** As typed, so spelling and spaces vary. */
  area: string;
  /** Metres to the nearest station. */
  station: number;
  /** Asking price in thousands of pounds. */
  price: number;
  split: Split;
}

export interface Options {
  fixUnits: boolean;
  tidyText: boolean;
  fixImpossible: boolean;
  gap: Gap;
  area: AreaEncoding;
  scaling: Scaling;
  leak: LeakKind | null;
  model: Model;
}

/** What a beginner does first: nothing, fill blanks with 0, ignore the text column, no scaling. */
export const NAIVE: Options = { fixUnits: false, tidyText: false, fixImpossible: false, gap: 'zero', area: 'skip', scaling: 'none', leak: null, model: 'line' };
/** The sensible pipeline for this table. */
export const CAREFUL: Options = { fixUnits: true, tidyText: true, fixImpossible: true, gap: 'flag', area: 'onehot', scaling: 'standard', leak: null, model: 'line' };

export const K = 5;

/* ---------- a seeded random generator, so the table is the same for everyone ---------- */

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rand: () => number) {
  const u = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/** How much each neighbourhood adds to the price, in thousands of pounds. Invented. */
export const AREAS: Record<string, number> = { Abbey: 15, Brook: 75, Castle: -25, Dale: 45 };
const AREA_NAMES = Object.keys(AREAS);

export const N_HOUSES = 200;

/** Build the example table. The same call always returns the same rows. */
export function makeHouses(seed = 7): House[] {
  const rand = mulberry32(seed);
  const rows: House[] = [];
  for (let id = 1; id <= N_HOUSES; id++) {
    const size = Math.round(45 + rand() * 135); // 45 to 180 square metres
    const rooms = Math.max(1, Math.min(7, Math.round(size / 28 + normal(rand) * 0.6)));
    const age = Math.round(rand() * rand() * 110 + rand() * 10);
    const area = AREA_NAMES[Math.floor(rand() * AREA_NAMES.length)];
    const station = Math.round((100 + rand() * rand() * 2900) / 10) * 10;
    const price = Math.round(40 + 2.4 * size + 10 * rooms - 1.1 * age - 0.012 * station + AREAS[area] + normal(rand) * 18);
    rows.push({ id, size, unit: 'm2', rooms, age, station, area, price, split: 'train' });
  }

  // split: 120 train, 40 validation, 40 test, shuffled once
  const order = rows.map((r) => r.id);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  order.forEach((id, k) => {
    rows[id - 1].split = k < 120 ? 'train' : k < 160 ? 'valid' : 'test';
  });

  // mess, applied after the true values were made
  const pick = (count: number, taken: Set<number>) => {
    const out: number[] = [];
    while (out.length < count) {
      const i = Math.floor(rand() * rows.length);
      if (!taken.has(i)) {
        taken.add(i);
        out.push(i);
      }
    }
    return out;
  };
  const used = new Set<number>();
  for (const i of pick(16, used)) rows[i].size = null; // blank sizes
  for (const i of pick(14, used)) {
    // typed in square feet
    rows[i].size = Math.round((rows[i].size as number) * SQFT_PER_M2);
    rows[i].unit = 'ft2';
  }
  // the old houses are the ones whose age is usually left blank
  rows.forEach((r, i) => {
    if (r.age !== null && r.age > 70 && rand() < 0.6) r.age = null;
    if (r.age !== null && r.age <= 70 && rand() < 0.04) r.age = null;
    void i;
  });
  for (const i of pick(5, used)) rows[i].age = 999; // a placeholder that looks like a number
  const typo = pick(2, used);
  rows[typo[0]].price *= 10; // an extra zero on the price
  rows[typo[1]].size = (rows[typo[1]].size ?? 100) * 10; // an extra zero on the size
  rows[typo[1]].unit = 'm2';
  // spelling and spaces
  rows.forEach((r, i) => {
    const roll = (i * 37 + 11) % 10;
    if (roll < 2) r.area = r.area.toLowerCase();
    else if (roll === 2) r.area = r.area + ' ';
    else if (roll === 3) r.area = r.area.toUpperCase();
  });
  return rows;
}

/* ---------- cleaning ---------- */

export interface CleanRow {
  id: number;
  split: Split;
  /** After the chosen cleaning, still possibly null. */
  size: number | null;
  age: number | null;
  rooms: number;
  station: number;
  area: string;
  price: number;
  /** Removed from the data by the cleaning rules. */
  removed: boolean;
  /** Which cells were changed, for the on-screen table. */
  changed: { size?: boolean; age?: boolean; area?: boolean };
}

export const MAX_PRICE = 1500; // thousands: nothing in this example town costs that much
export const MAX_SIZE_M2 = 600;

export function tidyArea(a: string) {
  const t = a.trim().toLowerCase();
  return t ? t[0].toUpperCase() + t.slice(1) : t;
}

/** Row-level cleaning. None of these steps learn a number from the data, so they are safe before the split. */
export function cleanRows(houses: House[], opts: Pick<Options, 'fixUnits' | 'tidyText' | 'fixImpossible'>): CleanRow[] {
  return houses.map((h) => {
    const changed: CleanRow['changed'] = {};
    let size = h.size;
    let age = h.age;
    let area = h.area;
    let removed = false;
    if (opts.fixUnits && size !== null && h.unit === 'ft2') {
      size = Math.round(size / SQFT_PER_M2);
      changed.size = true;
    }
    if (opts.tidyText) {
      const t = tidyArea(area);
      if (t !== area) changed.area = true;
      area = t;
    }
    if (opts.fixImpossible) {
      if (age === 999) {
        age = null;
        changed.age = true;
      }
      if (h.price > MAX_PRICE) removed = true;
      if (size !== null && h.unit === 'm2' && size > MAX_SIZE_M2) removed = true;
    }
    return { id: h.id, split: h.split, size, age, rooms: h.rooms, station: h.station, area, price: h.price, removed, changed };
  });
}

/* ---------- simple statistics, always learned from the rows we are given ---------- */

function mean(xs: number[]) {
  return xs.reduce((s, x) => s + x, 0) / (xs.length || 1);
}
function median(xs: number[]) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function sd(xs: number[]) {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

export interface Learned {
  fill: { size: number; age: number };
  areas: string[];
  scale: { lo: number; hi: number; mean: number; sd: number }[];
}

/** Feature column names for the current options, in order. */
export function featureNames(opts: Pick<Options, 'gap' | 'area' | 'leak'>, areas: string[]) {
  const names = ['size', 'rooms', 'age', 'station'];
  if (opts.gap === 'flag') names.push('size missing', 'age missing');
  if (opts.area === 'codes') names.push('area code');
  if (opts.area === 'onehot') for (const a of areas) names.push('area = ' + a);
  if (opts.leak === 'target') names.push('valuation');
  return names;
}

function fillValue(rows: CleanRow[], key: 'size' | 'age', gap: Gap) {
  const have = rows.map((r) => r[key]).filter((v): v is number => v !== null);
  if (gap === 'zero') return 0;
  if (gap === 'mean') return mean(have);
  return median(have); // median and flag
}

function vectorise(r: CleanRow, opts: Options, learned: Learned, valuation: number): number[] {
  const v = [r.size ?? learned.fill.size, r.rooms, r.age ?? learned.fill.age, r.station];
  if (opts.gap === 'flag') v.push(r.size === null ? 1 : 0, r.age === null ? 1 : 0);
  if (opts.area === 'codes') {
    const i = learned.areas.indexOf(r.area);
    v.push(i < 0 ? 0 : i + 1);
  }
  if (opts.area === 'onehot') for (const a of learned.areas) v.push(r.area === a ? 1 : 0);
  if (opts.leak === 'target') v.push(valuation);
  return v;
}

/** A made-up "valuation after the sale": the real price plus a little noise. Exists only to show a leak. */
export function valuationOf(h: { id: number; price: number }) {
  const r = mulberry32(h.id * 7919)();
  return Math.round(h.price + (r - 0.5) * 16);
}

export interface ScoreResult {
  /** Mean absolute error on the validation rows, in thousands of pounds. Null when nothing could be scored. */
  mae: number | null;
  /** The same score if you simply guessed the training average for every house. */
  baseline: number | null;
  nTrain: number;
  nValid: number;
  nRemoved: number;
  /** Rows that had at least one blank value after cleaning. */
  nGaps: number;
  features: string[];
  /** The value used to fill a blank size or age (0 when blanks are filled with zero). */
  fill: { size: number; age: number };
}

/**
 * Score one set of choices. The model is either a straight-line fit or a nearest-neighbours lookup (price a house like the K most similar training houses).
 * Fill values, category lists and scaling are learned from the training rows only,
 * unless the chosen leak says otherwise.
 */
export function evaluate(houses: House[], opts: Options): ScoreResult {
  const rows = cleanRows(houses, opts);
  const alive = rows.filter((r) => !r.removed);
  const hasGap = (r: CleanRow) => r.size === null || r.age === null;
  const nGaps = alive.filter(hasGap).length;

  let train = alive.filter((r) => r.split === 'train');
  let valid = alive.filter((r) => r.split === 'valid');
  const test = alive.filter((r) => r.split === 'test');
  if (opts.gap === 'drop') {
    train = train.filter((r) => !hasGap(r));
    valid = valid.filter((r) => !hasGap(r));
  }
  const nRemoved = rows.length - alive.length;
  const byId = new Map(houses.map((h) => [h.id, h]));

  // leaks that change what the model is trained on
  const fitRows = opts.leak === 'prep' ? [...train, ...valid, ...test].filter((r) => opts.gap !== 'drop' || !hasGap(r)) : train;
  const trainRows = opts.leak === 'copy' ? [...train, ...valid] : train;

  const learned: Learned = {
    fill: { size: fillValue(fitRows, 'size', opts.gap), age: fillValue(fitRows, 'age', opts.gap) },
    areas: [...new Set(fitRows.map((r) => r.area))].sort(),
    scale: [],
  };
  const val = (r: CleanRow) => valuationOf(byId.get(r.id)!);
  const fitX = fitRows.map((r) => vectorise(r, opts, learned, val(r)));
  const width = fitX[0]?.length ?? 0;
  for (let j = 0; j < width; j++) {
    const col = fitX.map((x) => x[j]);
    learned.scale.push({ lo: Math.min(...col), hi: Math.max(...col), mean: mean(col), sd: sd(col) });
  }
  const scaleVec = (x: number[]) =>
    x.map((v, j) => {
      const s = learned.scale[j];
      if (opts.scaling === 'minmax') return s.hi > s.lo ? (v - s.lo) / (s.hi - s.lo) : 0;
      if (opts.scaling === 'standard') return s.sd > 0 ? (v - s.mean) / s.sd : 0;
      return v;
    });

  const X = trainRows.map((r) => scaleVec(vectorise(r, opts, learned, val(r))));
  const y = trainRows.map((r) => r.price);
  const Xv = valid.map((r) => scaleVec(vectorise(r, opts, learned, val(r))));
  const features = featureNames(opts, learned.areas);

  if (!X.length || !Xv.length) return { mae: null, baseline: null, nTrain: X.length, nValid: Xv.length, nRemoved, nGaps, features, fill: learned.fill };

  let err = 0;
  if (opts.model === 'line') {
    const w = ridgeFit(X.map((x) => [1, ...x]), y, [0, ...X[0].map(() => 1e-6)]);
    if (!w) return { mae: null, baseline: null, nTrain: X.length, nValid: Xv.length, nRemoved, nGaps, features, fill: learned.fill };
    valid.forEach((r, i) => {
      const pred = w[0] + Xv[i].reduce((s, v, j) => s + v * w[j + 1], 0);
      err += Math.abs(pred - r.price);
    });
  } else {
    valid.forEach((r, i) => {
      const d = X.map((x, t) => ({ t, d: x.reduce((s, xv, j) => s + (xv - Xv[i][j]) ** 2, 0) }));
      d.sort((a, b) => a.d - b.d || a.t - b.t);
      const k = Math.min(K, d.length);
      const pred = mean(d.slice(0, k).map((e) => y[e.t]));
      err += Math.abs(pred - r.price);
    });
  }
  const avg = mean(y);
  const baseline = mean(valid.map((r) => Math.abs(avg - r.price)));
  return { mae: err / valid.length, baseline, nTrain: X.length, nValid: Xv.length, nRemoved, nGaps, features, fill: learned.fill };
}

/** Count of problems in the raw table, for the quality checklist and the screen reader. */
export function problems(houses: House[]) {
  return {
    blankSize: houses.filter((h) => h.size === null).length,
    blankAge: houses.filter((h) => h.age === null).length,
    placeholderAge: houses.filter((h) => h.age === 999).length,
    squareFeet: houses.filter((h) => h.unit === 'ft2').length,
    impossible: houses.filter((h) => h.price > MAX_PRICE || (h.unit === 'm2' && (h.size ?? 0) > MAX_SIZE_M2)).length,
    spellings: new Set(houses.map((h) => h.area)).size,
  };
}
