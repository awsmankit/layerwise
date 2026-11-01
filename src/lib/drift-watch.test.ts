import { describe, expect, it } from 'vitest';
import {
  ACC_DROP,
  BASE_ACC,
  DAYS,
  REF_DAYS,
  SCENARIOS,
  THRESHOLDS,
  accuracyAlertDay,
  bestSettings,
  binIndex,
  binShares,
  chanceOfAnyFalseAlarm,
  dailyAccuracy,
  expectedKsForShift,
  expectedPsi,
  psiFromShares,
  harmDay,
  kolmogorovSf,
  ksPValue,
  ksStatistic,
  normalCdf,
  normals,
  psi,
  psiBand,
  quantileEdges,
  quantileSorted,
  runDetector,
  scenarioById,
  sliderStats,
  sortedCopy,
  statSeries,
  totalCost,
  visibleAccuracy,
} from './drift-watch';

/* Fixtures and reference values below were computed with numpy 2.5.4 and scipy 1.18.1 (see the comments on each test). */
const REF = [0.305, -1.04, 0.75, 0.941, -1.951, -1.302, 0.128, -0.316, -0.017, -0.853, 0.879, 0.778, 0.066, 1.127, 0.468, -0.859, 0.369, -0.959, 0.878, -0.05, -0.185, -0.681, 1.223, -0.155, -0.428, -0.352, 0.532, 0.365, 0.413, 0.431, 2.142, -0.406, -0.512, -0.814, 0.616, 1.129, -0.114, -0.84, -0.824, 0.651, 0.743, 0.543, -0.666, 0.232, 0.117, 0.219, 0.871, 0.224, 0.679, 0.068, 0.289, 0.631, -1.457, -0.32, -0.47, -0.639, -0.275, 1.495, -0.866, 0.968];
const CUR = [-1.588, 0.165, 0.812, 1.362, 1.525, 1.631, 0.147, -0.001, 1.715, 0.351, -1.058, -0.873, -0.595, 1.246, 0.785, 1.498, 0.045, 0.806, 1.413, 0.198, 1.194, -0.261, 0.128, 0.104, -0.955, 1.233, -0.01, 0.616, 1.225, 1.18, 1.465, 0.472, 0.05, 0.496, -1.594, -1.281, -1.12, -0.696, 1.12, -0.577, 0.108, 2.289, 0.137, 1.559, -0.614];

describe('statistics against numpy and scipy', () => {
  const refSorted = sortedCopy(REF);
  const curSorted = sortedCopy(CUR);

  it('PSI matches a numpy implementation with decile bins and a 1e-4 floor', () => {
    expect(psi(refSorted, CUR)).toBeCloseTo(0.7077312298947585, 10);
    expect(psi(refSorted, REF)).toBe(0);
  });

  it('PSI with an empty bin stays finite and matches numpy', () => {
    const ref = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(psi(sortedCopy(ref), new Array(10).fill(200))).toBeCloseTo(8.283089355027482, 9);
  });

  it('KS statistic matches scipy.stats.ks_2samp, and the p-value matches scipy.stats.kstwobign.sf (the limiting distribution; ks_2samp(method="asymp") uses a finite-size version that differs a little at small n)', () => {
    const d = ksStatistic(refSorted, curSorted);
    expect(d).toBeCloseTo(0.26111111111111107, 12);
    expect(ksPValue(d, REF.length, CUR.length)).toBeCloseTo(0.06001090141205244, 9);
    const half = sortedCopy(REF.slice(0, 30));
    const d2 = ksStatistic(refSorted, half);
    expect(d2).toBeCloseTo(0.06666666666666668, 12);
    expect(ksPValue(d2, REF.length, 30)).toBeCloseTo(0.9999921107429537, 9);
  });

  it('the Kolmogorov tail matches scipy.special.kolmogorov', () => {
    const table: [number, number][] = [
      [0.1, 1.0],
      [0.3, 0.9999906941986655],
      [0.5, 0.9639452436648751],
      [0.8, 0.5441424115741981],
      [1.0, 0.26999967167735456],
      [1.18, 0.1234538094297657],
      [1.2, 0.11224966667072497],
      [1.5, 0.022217962616525127],
      [2.0, 0.0006709252557796953],
      [3.0, 3.045995948942526e-8],
    ];
    for (const [z, want] of table) expect(kolmogorovSf(z), `z=${z}`).toBeCloseTo(want, 9);
    expect(kolmogorovSf(4.45) / 1.2612379787972805e-17).toBeCloseTo(1, 4);
  });

  it('the normal CDF is close to scipy and the expected KS for a shift matches', () => {
    expect(normalCdf(-2)).toBeCloseTo(0.022750131948179198, 6);
    expect(normalCdf(-0.5)).toBeCloseTo(0.3085375387259869, 6);
    expect(normalCdf(0)).toBeCloseTo(0.5, 7);
    expect(normalCdf(0.3)).toBeCloseTo(0.6179114221889526, 6);
    expect(normalCdf(1.5)).toBeCloseTo(0.9331927987311419, 6);
    expect(expectedKsForShift(0.05)).toBeCloseTo(0.019945036390476067, 6);
    expect(expectedKsForShift(0.5)).toBeCloseTo(0.1974126513658474, 6);
    expect(expectedKsForShift(1)).toBeCloseTo(0.38292492254802624, 6);
  });

  it('the same tiny shift is "not significant" with few samples and "significant" with many (worked example in the lesson)', () => {
    const d = expectedKsForShift(0.05);
    expect(ksPValue(d, 1000, 1000)).toBeCloseTo(0.9886227313459979, 5);
    expect(ksPValue(d, 10000, 10000)).toBeCloseTo(0.03744417401414986, 5);
    expect(ksPValue(d, 100000, 100000)).toBeLessThan(1e-16);
  });

  it('the PSI of a normal that has moved matches a scipy calculation (worked example in the lesson)', () => {
    expect(expectedPsi(0.1)).toBeCloseTo(0.009587276462951957, 4);
    expect(expectedPsi(0.3)).toBeCloseTo(0.08605504584148119, 4);
    expect(expectedPsi(0.5)).toBeCloseTo(0.2377492046862759, 4);
    expect(expectedPsi(1)).toBeCloseTo(0.9261424242616796, 4);
    expect(expectedPsi(0, 2)).toBeCloseTo(0.4907539343487508, 4);
    expect(expectedPsi(0, 1)).toBeCloseTo(0, 6);
  });

  it('PSI of the four-category worked example in the lesson is about 0.178', () => {
    expect(psiFromShares([0.5, 0.3, 0.15, 0.05], [0.35, 0.3, 0.2, 0.15])).toBeCloseTo(0.17774657408020988, 10);
  });

  it('the chance of at least one false alarm across 20 tests at 0.05 is about 64%', () => {
    expect(chanceOfAnyFalseAlarm(20, 0.05)).toBeCloseTo(0.6415140775914581, 12);
  });
});

describe('binning', () => {
  it('quantiles use linear interpolation like numpy', () => {
    expect(quantileSorted([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(quantileSorted([1, 2, 3, 4], 0)).toBe(1);
    expect(quantileSorted([1, 2, 3, 4], 1)).toBe(4);
  });

  it('a value on an edge falls in the lower bin, like searchsorted(side="left")', () => {
    const edges = [1, 2, 3];
    expect([0.5, 1, 1.5, 2, 3, 3.1].map((x) => binIndex(edges, x))).toEqual([0, 0, 1, 1, 2, 3]);
  });

  it('shares add up to one', () => {
    const edges = quantileEdges(sortedCopy(REF), 10);
    const s = binShares(edges, CUR);
    expect(s).toHaveLength(10);
    expect(s.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });
});

describe('random numbers', () => {
  it('are repeatable and roughly standard normal', () => {
    expect(normals(5, 10)).toEqual(normals(5, 10));
    const xs = normals(9, 20000);
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
    expect(Math.abs(mean)).toBeLessThan(0.03);
    expect(Math.abs(variance - 1)).toBeLessThan(0.05);
  });
});

describe('scenarios', () => {
  it('have the harm days the lesson describes', () => {
    expect(harmDay(scenarioById('sudden'))).toBe(60);
    expect(harmDay(scenarioById('gradual'))).toBe(70);
    expect(harmDay(scenarioById('weekly'))).toBeNull();
    expect(harmDay(scenarioById('bug'))).toBe(70);
  });

  it('give each scenario one right decision, with the bug the only "fix upstream"', () => {
    expect(SCENARIOS.map((s) => s.correct)).toEqual(['retrain', 'retrain', 'adjust-monitor', 'fix-upstream']);
  });

  it('streams are repeatable', () => {
    const a = statSeries(scenarioById('sudden'), 200, 7);
    const b = statSeries(scenarioById('sudden'), 200, 7);
    expect(a).toBe(b);
    expect(a[0].day).toBe(REF_DAYS + 6);
    expect(a[a.length - 1].day).toBe(DAYS - 1);
  });

  it('the statistics are small before the change and large after a big one', () => {
    const s = statSeries(scenarioById('bug'), 200, 7);
    const before = s.filter((x) => x.day < 70);
    const after = s.filter((x) => x.day >= 76);
    expect(Math.max(...before.map((x) => x.psi))).toBeLessThan(0.1);
    expect(Math.min(...after.map((x) => x.psi))).toBeGreaterThan(1);
    expect(Math.min(...after.map((x) => x.ks))).toBeGreaterThan(0.8);
  });
});

describe('detector and scoring', () => {
  const sensible = { method: 'ks', threshold: 0.15, window: 7, n: 200 } as const;

  it('a sensible detector catches the sudden shift and the bug without false alarms', () => {
    const sudden = runDetector(scenarioById('sudden'), sensible);
    expect(sudden.falseAlarmDays).toBe(0);
    expect(sudden.detectedOn).not.toBeNull();
    expect(sudden.detectedOn as number).toBeLessThan(75);
    const bug = runDetector(scenarioById('bug'), sensible);
    expect(bug.falseAlarmDays).toBe(0);
    expect(bug.detectedOn as number).toBeLessThanOrEqual(72);
    expect(bug.harmedDays).toBeLessThanOrEqual(2);
  });

  it('a hair-trigger daily KS p-value fires all the time when nothing is wrong', () => {
    const noisy = runDetector(scenarioById('weekly'), { method: 'ksp', threshold: 0.05, window: 1, n: 1000 });
    expect(noisy.alertDays.length).toBeGreaterThan(20);
    expect(noisy.needsDecision).toBe(true);
    expect(noisy.cost).toBe(noisy.falseAlarmDays);
  });

  it('a detector that never fires misses the harm and pays for every harmed day', () => {
    const deaf = runDetector(scenarioById('bug'), { method: 'psi', threshold: 1000, window: 7, n: 200 });
    expect(deaf.detectedOn).toBeNull();
    expect(deaf.harmedDays).toBe(DAYS - 70);
    expect(deaf.needsDecision).toBe(false);
  });

  it('the two settings compared in the lesson give the numbers it quotes', () => {
    const jumpy = totalCost({ method: 'ksp', threshold: 0.01, window: 1, n: 200 });
    expect(jumpy.runs.map((r) => [r.detectedOn, r.falseAlarmDays, r.alertDays.length])).toEqual([[60, 0, 60], [60, 0, 58], [null, 53, 53], [70, 1, 51]]);
    expect(jumpy.total).toBe(54);
    const steady = totalCost({ method: 'ks', threshold: 0.15, window: 7, n: 200 });
    expect(steady.runs.map((r) => [r.detectedOn, r.falseAlarmDays, r.alertDays.length])).toEqual([[65, 0, 55], [72, 0, 48], [null, 0, 0], [70, 0, 50]]);
    expect(steady.total).toBe(21);
  });

  it('the best setting on the grid is no worse than any single setting tried', () => {
    const best = bestSettings(200);
    for (const m of ['psi', 'ks', 'ksp'] as const) {
      for (const t of THRESHOLDS[m]) {
        for (const w of [1, 7]) expect(best.total).toBeLessThanOrEqual(totalCost({ method: m, threshold: t, window: w, n: 200 }).total);
      }
    }
    expect(totalCost(best.settings).total).toBe(best.total);
  });
});

describe('label delay', () => {
  it('a longer delay can only move the accuracy alert later', () => {
    const acc = dailyAccuracy(scenarioById('bug'));
    const days = [0, 7, 14, 30].map((d) => accuracyAlertDay(acc, d));
    for (const d of days) expect(d).not.toBeNull();
    for (let i = 1; i < days.length; i++) expect(days[i] as number).toBeGreaterThanOrEqual(days[i - 1] as number);
    expect((days[3] as number) - (days[0] as number)).toBeGreaterThanOrEqual(25);
  });

  it('the accuracy monitor never fires when nothing is wrong', () => {
    expect(accuracyAlertDay(dailyAccuracy(scenarioById('weekly')), 0)).toBeNull();
  });

  it('visible accuracy is hidden until a full window of labelled days exists', () => {
    const acc = dailyAccuracy(scenarioById('sudden'));
    const vis = visibleAccuracy(acc, 14);
    expect(vis[REF_DAYS + 6 + 13]).toBeNull();
    expect(vis[REF_DAYS + 6 + 14]).not.toBeNull();
    expect(Math.abs((vis[100] as number) - BASE_ACC)).toBeLessThan(0.3);
    expect(ACC_DROP).toBe(0.04);
  });
});

describe('slider demo', () => {
  it('identical data gives no drift', () => {
    const r = sliderStats(0, 1, 2000);
    expect(r.psi).toBeLessThan(0.05);
    expect(r.ks).toBeLessThan(0.1);
  });

  it('a small shift is flagged by the p-value only when there are many samples', () => {
    expect(sliderStats(0.1, 1, 200).p).toBeGreaterThan(0.05);
    const big = sliderStats(0.1, 1, 20000);
    expect(big.p).toBeLessThan(0.001);
    expect(psiBand(big.psi)).toBe('stable');
  });

  it('PSI bands follow the 0.1 and 0.25 rules of thumb', () => {
    expect([0.05, 0.1, 0.2, 0.25, 0.4].map(psiBand)).toEqual(['stable', 'moderate', 'moderate', 'large', 'large']);
  });
});
