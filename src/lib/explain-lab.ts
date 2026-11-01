/*
 * Logic for the "Why did it say that?" lesson: Shapley values worked by hand for a three-feature
 * model, and permutation importance on a small invented data set. Everything here is invented
 * teaching data. Nothing is fitted to real people.
 */

import { gauss, mulberry32, r4 } from './clustering';

/* ---------- Shapley values for a three-feature loan-score model ---------- */

export type FeatureId = 'income' | 'debt' | 'years';
export const FEATURE_IDS: FeatureId[] = ['income', 'debt', 'years'];

export interface FeatureInfo {
  id: FeatureId;
  label: string;
  unit: string;
}
export const FEATURES: FeatureInfo[] = [
  { id: 'income', label: 'Income', unit: 'thousand pounds a year' },
  { id: 'debt', label: 'Debt', unit: 'thousand pounds' },
  { id: 'years', label: 'Years in current job', unit: 'years' },
];

export type Values = Record<FeatureId, number>;

/** The "typical applicant": what a feature is set to when it is treated as unknown. */
export const BASELINE: Values = { income: 30, debt: 10, years: 2 };

export interface Person {
  id: string;
  name: string;
  values: Values;
}
export const PEOPLE: Person[] = [
  { id: 'asha', name: 'Asha', values: { income: 50, debt: 25, years: 6 } },
  { id: 'ben', name: 'Ben', values: { income: 20, debt: 5, years: 10 } },
  { id: 'cara', name: 'Cara', values: { income: 40, debt: 10, years: 2 } },
];

/**
 * The invented model. Score out of 100:
 *   50 + 0.5 (income - 30) - 1.0 (debt - 10) [+ 0.1 (income - 30)(years - 2)]
 * The last term is an interaction: years in a job only matter in proportion to how far income is
 * from the typical applicant. Years has no effect of its own.
 */
export function modelScore(v: Values, interaction: boolean): number {
  const main = 50 + 0.5 * (v.income - 30) - 1.0 * (v.debt - 10);
  return interaction ? main + 0.1 * (v.income - 30) * (v.years - 2) : main;
}

/** Score when only the features in `known` take the person's values and the rest sit at the baseline. */
export function coalitionValue(person: Person, known: FeatureId[], interaction: boolean): number {
  const v: Values = { ...BASELINE };
  for (const f of known) v[f] = person.values[f];
  return modelScore(v, interaction);
}

const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));

/** Weight of a coalition of size s among n players: s! (n - s - 1)! / n! */
export function coalitionWeight(s: number, n: number): number {
  return (factorial(s) * factorial(n - s - 1)) / factorial(n);
}

/** All subsets of the three features, smallest first, in a fixed order. */
export function allCoalitions(): FeatureId[][] {
  const out: FeatureId[][] = [];
  for (let mask = 0; mask < 8; mask++) {
    out.push(FEATURE_IDS.filter((_, i) => mask & (1 << i)));
  }
  return out.sort((a, b) => a.length - b.length || FEATURE_IDS.indexOf(a[0] ?? 'income') - FEATURE_IDS.indexOf(b[0] ?? 'income'));
}

export interface ShapleyTerm {
  /** the features already known before this feature is added */
  without: FeatureId[];
  vWithout: number;
  vWith: number;
  marginal: number;
  weight: number;
  contribution: number;
}
export interface ShapleyResult {
  feature: FeatureId;
  terms: ShapleyTerm[];
  phi: number;
}

const round6 = (x: number) => Math.round(x * 1e6) / 1e6;

/** The exact Shapley value of one feature, with every step kept so the lab can show them. */
export function shapleyFor(person: Person, feature: FeatureId, interaction: boolean): ShapleyResult {
  const others = FEATURE_IDS.filter((f) => f !== feature);
  const n = FEATURE_IDS.length;
  const terms: ShapleyTerm[] = [];
  for (let mask = 0; mask < 1 << others.length; mask++) {
    const without = others.filter((_, i) => mask & (1 << i));
    const vWithout = coalitionValue(person, without, interaction);
    const vWith = coalitionValue(person, [...without, feature], interaction);
    const weight = coalitionWeight(without.length, n);
    const marginal = round6(vWith - vWithout);
    terms.push({ without, vWithout: round6(vWithout), vWith: round6(vWith), marginal, weight, contribution: round6(marginal * weight) });
  }
  terms.sort((a, b) => a.without.length - b.without.length);
  const phi = round6(terms.reduce((s, t) => s + t.contribution, 0));
  return { feature, terms, phi };
}

export function allShapley(person: Person, interaction: boolean): ShapleyResult[] {
  return FEATURE_IDS.map((f) => shapleyFor(person, f, interaction));
}

/** All 3! = 6 orders in which the features can be revealed. */
export function orderings(): FeatureId[][] {
  const out: FeatureId[][] = [];
  const [a, b, c] = FEATURE_IDS;
  const perms: FeatureId[][] = [
    [a, b, c], [a, c, b], [b, a, c], [b, c, a], [c, a, b], [c, b, a],
  ];
  for (const p of perms) out.push(p);
  return out;
}

/** The same Shapley value computed the other way: average the feature's marginal gain over all six orders. */
export function shapleyByOrderings(person: Person, feature: FeatureId, interaction: boolean): { order: FeatureId[]; before: FeatureId[]; gain: number }[] {
  return orderings().map((order) => {
    const before = order.slice(0, order.indexOf(feature));
    const gain = coalitionValue(person, [...before, feature], interaction) - coalitionValue(person, before, interaction);
    return { order, before, gain: round6(gain) };
  });
}

/** The total that the three Shapley values must add up to: this person's score minus the baseline score. */
export function totalToExplain(person: Person, interaction: boolean): { score: number; base: number; diff: number } {
  const score = coalitionValue(person, FEATURE_IDS, interaction);
  const base = coalitionValue(person, [], interaction);
  return { score: round6(score), base: round6(base), diff: round6(score - base) };
}

/* ---------- Permutation importance on an invented data set ---------- */

export type ColumnId = 'income' | 'incomeCopy' | 'debt' | 'years' | 'shoe';
export const COLUMNS: { id: ColumnId; label: string; note: string }[] = [
  { id: 'income', label: 'Income', note: 'thousand pounds' },
  { id: 'incomeCopy', label: 'Income, second column', note: 'a near-copy of income, as if two systems recorded it' },
  { id: 'debt', label: 'Debt', note: 'thousand pounds' },
  { id: 'years', label: 'Years in job', note: 'years' },
  { id: 'shoe', label: 'Shoe size', note: 'unrelated to the outcome' },
];

export interface Row {
  income: number;
  incomeCopy: number;
  debt: number;
  years: number;
  shoe: number;
  /** the invented "true" credit score */
  y: number;
}

/** 80 invented applicants, generated from a fixed seed (rounded so the server and browser agree). */
export const N_ROWS = 80;
export function makeData(seed = 7): Row[] {
  const rng = mulberry32(seed);
  const rows: Row[] = [];
  for (let i = 0; i < N_ROWS; i++) {
    const income = r4(Math.max(12, 35 + 9 * gauss(rng)));
    const incomeCopy = r4(income + 1.5 * gauss(rng));
    const debt = r4(Math.max(0, 10 + 5 * gauss(rng)));
    const years = r4(10 * rng());
    const shoe = r4(Math.round(38 + 4 * rng()));
    const y = r4(50 + 0.5 * (income - 30) - 1.0 * (debt - 10) + 0.5 * (years - 2) + 3 * gauss(rng));
    rows.push({ income, incomeCopy, debt, years, shoe, y });
  }
  return rows;
}

export type ModelKind = 'both' | 'one';
export const MODELS: { id: ModelKind; label: string }[] = [
  { id: 'both', label: 'Model reads both income columns' },
  { id: 'one', label: 'Model reads only the first income column' },
];

/** Fixed, pretend-trained models. Weights per column. Shoe size has weight 0 in both. */
export function weights(kind: ModelKind): Record<ColumnId, number> {
  return kind === 'both'
    ? { income: 0.25, incomeCopy: 0.25, debt: -1.0, years: 0.5, shoe: 0 }
    : { income: 0.5, incomeCopy: 0, debt: -1.0, years: 0.5, shoe: 0 };
}

export function predict(row: Row, kind: ModelKind): number {
  const w = weights(kind);
  return (
    50 +
    w.income * (row.income - 30) +
    w.incomeCopy * (row.incomeCopy - 30) +
    w.debt * (row.debt - 10) +
    w.years * (row.years - 2) +
    w.shoe * (row.shoe - 40)
  );
}

export function mae(rows: Row[], kind: ModelKind): number {
  return rows.reduce((s, r) => s + Math.abs(predict(r, kind) - r.y), 0) / rows.length;
}

/** A shuffled copy of one column, using a seeded Fisher-Yates shuffle. */
export function permutedColumn(rows: Row[], col: ColumnId, seed: number): number[] {
  const rng = mulberry32(seed);
  const vals = rows.map((r) => r[col]);
  for (let i = vals.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [vals[i], vals[j]] = [vals[j], vals[i]];
  }
  return vals;
}

/** Error after shuffling one column, minus the error before: how much the model leaned on it. */
export function permutationImportance(rows: Row[], kind: ModelKind, col: ColumnId, seed: number): number {
  const before = mae(rows, kind);
  const shuffled = permutedColumn(rows, col, seed);
  const after = rows.reduce((s, r, i) => s + Math.abs(predict({ ...r, [col]: shuffled[i] }, kind) - r.y), 0) / rows.length;
  return after - before;
}

export interface ImportanceSummary {
  col: ColumnId;
  mean: number;
  min: number;
  max: number;
  runs: number[];
}

/** Repeat the shuffle with `repeats` different seeds, starting from `seed0`. */
export function importanceRepeated(rows: Row[], kind: ModelKind, repeats: number, seed0 = 100): ImportanceSummary[] {
  return COLUMNS.map(({ id }) => {
    const runs: number[] = [];
    for (let k = 0; k < repeats; k++) runs.push(permutationImportance(rows, kind, id, seed0 + k * 31 + COLUMNS.findIndex((c) => c.id === id)));
    return { col: id, mean: runs.reduce((s, v) => s + v, 0) / runs.length, min: Math.min(...runs), max: Math.max(...runs), runs };
  });
}
