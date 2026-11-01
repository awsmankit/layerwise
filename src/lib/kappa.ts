/**
 * Cohen's kappa for two labellers who each put every item into one of k categories.
 * The input is the agreement table: table[i][j] is how many items labeller A put in
 * category i and labeller B put in category j.
 *
 *   p_o   = share of items on which they agree (the diagonal, divided by n)
 *   p_e   = agreement expected if each labelled at random with their own category rates
 *           = sum over categories of (A's share in it) * (B's share in it)
 *   kappa = (p_o - p_e) / (1 - p_e)
 */

export type Kappa = {
  n: number;
  /** observed agreement, 0 to 1 */
  po: number;
  /** agreement expected by chance, 0 to 1 */
  pe: number;
  /** NaN when every item falls in one category for both labellers (nothing to measure) */
  kappa: number;
  rowTotals: number[];
  colTotals: number[];
};

export function cohenKappa(table: number[][]): Kappa {
  const k = table.length;
  const rowTotals = table.map((row) => row.reduce((a, b) => a + b, 0));
  const colTotals = Array.from({ length: k }, (_, j) => table.reduce((a, row) => a + (row[j] ?? 0), 0));
  const n = rowTotals.reduce((a, b) => a + b, 0);
  if (n === 0) return { n: 0, po: NaN, pe: NaN, kappa: NaN, rowTotals, colTotals };
  let agree = 0;
  let expected = 0;
  for (let i = 0; i < k; i++) {
    agree += table[i][i] ?? 0;
    expected += (rowTotals[i] / n) * (colTotals[i] / n);
  }
  const po = agree / n;
  const pe = expected;
  const kappa = pe === 1 ? NaN : (po - pe) / (1 - pe);
  return { n, po, pe, kappa, rowTotals, colTotals };
}

/** Build the agreement table from two parallel label lists. Labels not in `categories` are ignored. */
export function tableFromLabels<T extends string>(a: readonly T[], b: readonly T[], categories: readonly T[]): number[][] {
  const index = new Map(categories.map((c, i) => [c, i] as const));
  const table = categories.map(() => categories.map(() => 0));
  const n = Math.min(a.length, b.length);
  for (let t = 0; t < n; t++) {
    const i = index.get(a[t]);
    const j = index.get(b[t]);
    if (i === undefined || j === undefined) continue;
    table[i][j] += 1;
  }
  return table;
}

/** A rough verbal reading. These bands are a convention (Landis and Koch, 1977), not a rule. */
export function readKappa(kappa: number): string {
  if (!Number.isFinite(kappa)) return 'Not defined: both labellers used one category for everything.';
  if (kappa < 0) return 'Worse than chance: they disagree more than random labelling would.';
  if (kappa <= 0.2) return 'Slight: barely better than chance.';
  if (kappa <= 0.4) return 'Fair.';
  if (kappa <= 0.6) return 'Moderate.';
  if (kappa <= 0.8) return 'Substantial.';
  return 'Almost perfect.';
}

/** The 2x2 case, in the order both-pass, A-pass-B-fail, A-fail-B-pass, both-fail. */
export function kappa2x2(bothPass: number, aOnly: number, bOnly: number, bothFail: number): Kappa {
  return cohenKappa([
    [bothPass, aOnly],
    [bOnly, bothFail],
  ]);
}
