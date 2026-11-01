import { describe, expect, it } from 'vitest';
import {
  BASELINE,
  COLUMNS,
  FEATURE_IDS,
  N_ROWS,
  PEOPLE,
  allCoalitions,
  allShapley,
  coalitionValue,
  coalitionWeight,
  importanceRepeated,
  makeData,
  mae,
  modelScore,
  permutationImportance,
  permutedColumn,
  shapleyByOrderings,
  shapleyFor,
  totalToExplain,
} from './explain-lab';

const asha = PEOPLE[0];
const ben = PEOPLE[1];
const cara = PEOPLE[2];

describe('model and coalitions (hand-computed)', () => {
  it('the baseline applicant scores 50', () => {
    expect(modelScore(BASELINE, true)).toBe(50);
  });
  it("Asha's eight coalition values", () => {
    const v = (k: ('income' | 'debt' | 'years')[]) => coalitionValue(asha, k, true);
    expect(v([])).toBeCloseTo(50, 9);
    expect(v(['income'])).toBeCloseTo(60, 9);
    expect(v(['debt'])).toBeCloseTo(35, 9);
    expect(v(['years'])).toBeCloseTo(50, 9);
    expect(v(['income', 'debt'])).toBeCloseTo(45, 9);
    expect(v(['income', 'years'])).toBeCloseTo(68, 9); // 60 + 0.1 * 20 * 4
    expect(v(['debt', 'years'])).toBeCloseTo(35, 9);
    expect(v(['income', 'debt', 'years'])).toBeCloseTo(53, 9);
  });
  it('there are eight coalitions, smallest first', () => {
    const c = allCoalitions();
    expect(c).toHaveLength(8);
    expect(c[0]).toEqual([]);
    expect(c[7]).toHaveLength(3);
  });
  it('weights for three players are 1/3, 1/6, 1/6, 1/3 and sum to one over the four terms', () => {
    expect(coalitionWeight(0, 3)).toBeCloseTo(1 / 3, 12);
    expect(coalitionWeight(1, 3)).toBeCloseTo(1 / 6, 12);
    expect(coalitionWeight(2, 3)).toBeCloseTo(1 / 3, 12);
    expect(coalitionWeight(0, 3) + 2 * coalitionWeight(1, 3) + coalitionWeight(2, 3)).toBeCloseTo(1, 12);
  });
});

describe('Shapley values', () => {
  it("Asha: income +14, debt -15, years +4, with the interaction", () => {
    const [i, d, y] = allShapley(asha, true).map((r) => r.phi);
    expect(i).toBeCloseTo(14, 6);
    expect(d).toBeCloseTo(-15, 6);
    expect(y).toBeCloseTo(4, 6);
  });
  it("Asha's income terms are 10/3, 10/6, 18/6 and 18/3", () => {
    const r = shapleyFor(asha, 'income', true);
    expect(r.terms.map((t) => t.marginal)).toEqual([10, 10, 18, 18]);
    expect(r.terms.map((t) => t.contribution).reduce((a, b) => a + b, 0)).toBeCloseTo(14, 6);
  });
  it('without the interaction, years does nothing and the others are their plain effects', () => {
    const [i, d, y] = allShapley(asha, false).map((r) => r.phi);
    expect(i).toBeCloseTo(10, 6);
    expect(d).toBeCloseTo(-15, 6);
    expect(y).toBeCloseTo(0, 6);
  });
  it('efficiency: the three values add up to score minus baseline, for every person and setting', () => {
    for (const p of PEOPLE) {
      for (const inter of [true, false]) {
        const sum = allShapley(p, inter).reduce((s, r) => s + r.phi, 0);
        expect(sum).toBeCloseTo(totalToExplain(p, inter).diff, 6);
      }
    }
    expect(totalToExplain(asha, true)).toEqual({ score: 53, base: 50, diff: 3 });
  });
  it('dummy: a feature at its baseline value gets zero (Cara: debt and years)', () => {
    const r = allShapley(cara, true);
    expect(r[1].phi).toBeCloseTo(0, 9);
    expect(r[2].phi).toBeCloseTo(0, 9);
    expect(r[0].phi).toBeCloseTo(5, 9);
  });
  it("Ben: the interaction splits equally between income and years (-4 each)", () => {
    const [i, d, y] = allShapley(ben, true).map((r) => r.phi);
    expect(i).toBeCloseTo(-5 - 4, 6);
    expect(d).toBeCloseTo(5, 6);
    expect(y).toBeCloseTo(-4, 6);
  });
  it('the average over the six orderings gives the same number as the weighted coalitions', () => {
    for (const p of PEOPLE) {
      for (const f of FEATURE_IDS) {
        const o = shapleyByOrderings(p, f, true);
        expect(o).toHaveLength(6);
        const avg = o.reduce((s, x) => s + x.gain, 0) / 6;
        expect(avg).toBeCloseTo(shapleyFor(p, f, true).phi, 6);
      }
    }
  });
});

describe('permutation importance', () => {
  const rows = makeData();

  it('the data are deterministic and have the stated size', () => {
    expect(rows).toHaveLength(N_ROWS);
    expect(makeData()).toEqual(rows);
    expect(makeData(8)).not.toEqual(rows);
  });
  it('a permuted column holds exactly the same values in a different order', () => {
    const p = permutedColumn(rows, 'debt', 5);
    expect([...p].sort((a, b) => a - b)).toEqual(rows.map((r) => r.debt).sort((a, b) => a - b));
    expect(p).not.toEqual(rows.map((r) => r.debt));
    expect(permutedColumn(rows, 'debt', 5)).toEqual(p);
  });
  it('a column the model does not read has importance exactly zero', () => {
    for (const kind of ['both', 'one'] as const) {
      expect(permutationImportance(rows, kind, 'shoe', 3)).toBe(0);
    }
    expect(permutationImportance(rows, 'one', 'incomeCopy', 3)).toBe(0);
  });
  it('shuffling a column the model relies on makes errors worse, on average', () => {
    for (const kind of ['both', 'one'] as const) {
      const s = importanceRepeated(rows, kind, 20);
      for (const col of ['income', 'debt', 'years'] as const) {
        expect(s.find((x) => x.col === col)!.mean).toBeGreaterThan(0);
      }
    }
  });
  it('debt matters most, because its weight is largest and its spread is wide', () => {
    const s = importanceRepeated(rows, 'both', 20);
    const get = (c: string) => s.find((x) => x.col === c)!.mean;
    expect(get('debt')).toBeGreaterThan(get('income'));
    expect(get('debt')).toBeGreaterThan(get('years'));
  });
  it('correlated columns split the credit: income looks less important when a near-copy is also read', () => {
    const both = importanceRepeated(rows, 'both', 20).find((x) => x.col === 'income')!.mean;
    const one = importanceRepeated(rows, 'one', 20).find((x) => x.col === 'income')!.mean;
    expect(both).toBeLessThan(one);
    expect(one / both).toBeGreaterThan(1.5);
  });
  it('baseline error is smallish and the same pretend model is used in both settings', () => {
    expect(mae(rows, 'both')).toBeGreaterThan(1);
    expect(mae(rows, 'both')).toBeLessThan(6);
    expect(COLUMNS).toHaveLength(5);
  });
});
