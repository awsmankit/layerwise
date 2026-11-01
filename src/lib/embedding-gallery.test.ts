import { describe, expect, it } from 'vitest';
import { GALLERY, groupRatios, layoutPoints, trueRatios, type LayoutKey } from './embedding-gallery';

/* Reference ratios were computed in Python (NumPy) from the same unrounded layouts the data file was made from. Layouts are stored to 0.01, so allow 2%. */
const REF = {"pca": {"ac_over_ab": 4.9664, "b_over_a": 3.8197}, "tsne2": {"ac_over_ab": 1.1103, "b_over_a": 1.0226}, "tsne5": {"ac_over_ab": 1.2561, "b_over_a": 1.286}, "tsne30": {"ac_over_ab": 3.1734, "b_over_a": 1.3374}, "tsne100": {"ac_over_ab": 3.3359, "b_over_a": 2.575}, "umap3": {"ac_over_ab": 2.2449, "b_over_a": 1.1696}, "umap15": {"ac_over_ab": 1.7774, "b_over_a": 3.7925}, "umap60": {"ac_over_ab": 4.6266, "b_over_a": 1.3859}, "truth": {"ac_over_ab": 4.9606, "b_over_a": 3.6769}} as Record<string, { ac_over_ab: number; b_over_a: number }>;

describe('embedding gallery data', () => {
  it('has 180 points in every layout, three groups of 60', () => {
    for (const set of [GALLERY.groups, GALLERY.noise]) {
      expect(set.groups.length).toBe(180);
      for (const k of Object.keys(set.layouts) as LayoutKey[]) expect(layoutPoints(set, k).length).toBe(180);
    }
    expect([0, 1, 2].map((g) => GALLERY.groups.groups.filter((x) => x === g).length)).toEqual([60, 60, 60]);
  });
  it('group ratios from the stored layouts match the offline Python values', () => {
    for (const k of Object.keys(GALLERY.groups.layouts) as LayoutKey[]) {
      const r = groupRatios(layoutPoints(GALLERY.groups, k), GALLERY.groups.groups);
      expect(Math.abs(r.acOverAb / REF[k].ac_over_ab - 1)).toBeLessThan(0.02);
      expect(Math.abs(r.bOverA / REF[k].b_over_a - 1)).toBeLessThan(0.02);
    }
  });
  it('the true 10D ratios are about 5 and 3.7', () => {
    const t = trueRatios();
    expect(t.acOverAb).toBeCloseTo(REF.truth.ac_over_ab, 2);
    expect(t.bOverA).toBeCloseTo(REF.truth.b_over_a, 2);
  });
  it('PCA keeps the distance ratio but t-SNE at perplexity 2 does not (the lesson claim)', () => {
    const g = GALLERY.groups.groups;
    expect(groupRatios(layoutPoints(GALLERY.groups, 'pca'), g).acOverAb).toBeGreaterThan(4.5);
    expect(groupRatios(layoutPoints(GALLERY.groups, 'tsne2'), g).acOverAb).toBeLessThan(1.5);
  });
});
