import { describe, expect, it } from 'vitest';
import { CAREFUL, MAX_PRICE, NAIVE, SQFT_PER_M2, cleanRows, evaluate, makeHouses, problems, tidyArea, valuationOf, type Options } from './data-prep';

const houses = makeHouses();
const mae = (o: Partial<Options>) => evaluate(houses, { ...NAIVE, ...o }).mae as number;

describe('the example table', () => {
  it('is the same every time', () => {
    expect(makeHouses()).toEqual(makeHouses());
  });
  it('has 200 rows split 120 / 40 / 40', () => {
    const n = (s: string) => houses.filter((h) => h.split === s).length;
    expect(houses).toHaveLength(200);
    expect([n('train'), n('valid'), n('test')]).toEqual([120, 40, 40]);
  });
  it('contains the planted problems', () => {
    const p = problems(houses);
    expect(p.blankSize).toBe(16);
    expect(p.squareFeet).toBe(14);
    expect(p.placeholderAge).toBe(5);
    expect(p.impossible).toBe(2);
    expect(p.blankAge).toBeGreaterThan(10);
    expect(p.spellings).toBeGreaterThan(4);
  });
});

describe('cleaning that needs no learning', () => {
  it('turns square feet into square metres and marks the cell as changed', () => {
    const idx = houses.findIndex((h) => h.unit === 'ft2');
    const out = cleanRows(houses, { fixUnits: true, tidyText: false, fixImpossible: false })[idx];
    expect(out.size).toBe(Math.round((houses[idx].size as number) / SQFT_PER_M2));
    expect(out.changed.size).toBe(true);
  });
  it('makes spellings agree', () => {
    expect(tidyArea('  brook ')).toBe('Brook');
    expect(tidyArea('ABBEY')).toBe('Abbey');
    const areas = new Set(cleanRows(houses, { fixUnits: false, tidyText: true, fixImpossible: false }).map((r) => r.area));
    expect([...areas].sort()).toEqual(['Abbey', 'Brook', 'Castle', 'Dale']);
  });
  it('turns the 999 placeholder into a blank and drops the two impossible rows', () => {
    const rows = cleanRows(houses, { fixUnits: false, tidyText: false, fixImpossible: true });
    expect(rows.filter((r) => r.age === 999)).toHaveLength(0);
    expect(rows.filter((r) => r.removed)).toHaveLength(2);
    expect(rows.filter((r) => r.removed).every((r) => r.price > MAX_PRICE || (r.size ?? 0) > 600)).toBe(true);
  });
});

describe('scores', () => {
  it('improve a lot from the naive choices to the careful ones', () => {
    expect(evaluate(houses, CAREFUL).mae as number).toBeLessThan(mae({}) * 0.5);
  });
  it('are better than guessing the average once the data is cleaned', () => {
    const r = evaluate(houses, CAREFUL);
    expect(r.mae as number).toBeLessThan(r.baseline as number);
  });
  it('are hurt badly by outliers and wrong units, and fixing them helps', () => {
    expect(mae({ fixImpossible: true })).toBeLessThan(mae({}));
    expect(mae({ fixImpossible: true, fixUnits: true })).toBeLessThan(mae({ fixImpossible: true }));
  });
  it('are better when blanks are filled with a typical value than with zero', () => {
    const base = { fixImpossible: true, fixUnits: true };
    expect(mae({ ...base, gap: 'median' })).toBeLessThan(mae({ ...base, gap: 'zero' }));
  });
  it('drop fewer rows when blanks are filled than when rows are dropped', () => {
    const drop = evaluate(houses, { ...NAIVE, gap: 'drop' });
    const fill = evaluate(houses, { ...NAIVE, gap: 'median' });
    expect(drop.nTrain).toBeLessThan(fill.nTrain);
    expect(drop.nValid).toBeLessThan(fill.nValid);
  });
  it('gain from one-hot area columns, more than from number codes', () => {
    const base = { ...CAREFUL, area: 'skip' as const };
    expect(mae({ ...base, area: 'onehot' })).toBeLessThan(mae({ ...base, area: 'skip' }));
    expect(mae({ ...base, area: 'onehot' })).toBeLessThan(mae({ ...base, area: 'codes' }));
  });
  it('are unchanged by scaling for a straight-line model but not for nearest neighbours', () => {
    const base = { ...CAREFUL };
    expect(mae({ ...base, scaling: 'none' })).toBeCloseTo(mae({ ...base, scaling: 'standard' }), 4);
    const knn = { ...base, model: 'knn' as const };
    expect(mae({ ...knn, scaling: 'minmax' })).toBeLessThan(mae({ ...knn, scaling: 'none' }) * 0.8);
  });
  it('list the feature names it used', () => {
    expect(evaluate(houses, CAREFUL).features).toEqual(['size', 'rooms', 'age', 'station', 'size missing', 'age missing', 'area = Abbey', 'area = Brook', 'area = Castle', 'area = Dale']);
  });
});

describe('leakage', () => {
  it('a column made from the answer gives a falsely good score', () => {
    const honest = mae({ ...CAREFUL });
    expect(mae({ ...CAREFUL, leak: 'target' })).toBeLessThan(honest / 3);
    expect(valuationOf(houses[0])).toBeCloseTo(houses[0].price, -1);
  });
  it('validation rows inside the training set help a flexible model remember them', () => {
    const knn = { ...CAREFUL, model: 'knn' as const };
    expect(mae({ ...knn, leak: 'copy' })).toBeLessThan(mae(knn) * 0.8);
  });
  it('learns nothing from validation or test rows when there is no leak', () => {
    const a = evaluate(houses, CAREFUL);
    // the validation rows are scored, so change the test rows only
    const onlyTest = houses.map((h) => (h.split === 'test' ? { ...h, size: 5000, age: 3, price: 99 } : h));
    expect(evaluate(onlyTest, CAREFUL).mae).toBe(a.mae);
    expect(evaluate(onlyTest, { ...CAREFUL, scaling: 'minmax', leak: 'prep' }).mae).not.toBe(evaluate(houses, { ...CAREFUL, scaling: 'minmax', leak: 'prep' }).mae);
  });
  it('the quiet leak (statistics from all rows) can be tiny', () => {
    const a = mae({ ...CAREFUL });
    const b = mae({ ...CAREFUL, leak: 'prep' });
    expect(Math.abs(a - b) / a).toBeLessThan(0.1);
  });
});
