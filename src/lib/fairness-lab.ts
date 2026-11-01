/*
 * Logic for the "threshold fairness lab" in responsible/fairness-for-builders.
 *
 * Everything here is invented example data. Two abstract groups, A and B, each have a score from a
 * made-up lending-style model (the model's estimate of the chance that an applicant repays) and a
 * known outcome (repaid or not). The scores are grouped into 20 bands of width 0.05. The counts are
 * built so the scores are exactly calibrated in both groups: in the band with midpoint m, a share m
 * of the applicants repay. The two groups have different score distributions, so their base rates
 * (the share who repay) differ. That is the situation in which the fairness criteria clash.
 *
 * A threshold is an integer k from 0 to 20: applicants in bands k and above are approved (predicted
 * positive), the rest are refused. k = 10 means "approve at a score of 0.50 or more".
 */

export type GroupId = 'A' | 'B';

export const BAND_COUNT = 20;
export const BAND_WIDTH = 1 / BAND_COUNT;
export const MAX_K = BAND_COUNT;

/** People per "unit" in each band; units are chosen so every band count is an exact integer. */
const UNIT = 40;

/** Units of applicants in each band, lowest score first. Group A: 60 units; group B: 40 units. */
const UNITS: Record<GroupId, number[]> = {
  A: [3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 4, 4, 5, 6, 5, 4, 3],
  B: [6, 5, 4, 3, 3, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
};

export interface Band {
  /** 0 to 19 */
  index: number;
  /** Lower edge of the score band */
  lo: number;
  /** Midpoint of the band: the score the model gives everyone in it */
  mid: number;
  /** Applicants in the band */
  total: number;
  /** Applicants in the band who repaid (calibrated: total x mid, exactly) */
  positives: number;
}

export interface GroupData {
  id: GroupId;
  name: string;
  bands: Band[];
  total: number;
  positives: number;
}

function makeGroup(id: GroupId): GroupData {
  const bands = UNITS[id].map((u, i): Band => ({
    index: i,
    lo: i * BAND_WIDTH,
    mid: (2 * i + 1) * (BAND_WIDTH / 2),
    total: u * UNIT,
    // mid x total = (2i+1)/40 x 40u = (2i+1) u, an exact integer
    positives: (2 * i + 1) * u,
  }));
  return {
    id,
    name: `Group ${id}`,
    bands,
    total: bands.reduce((s, b) => s + b.total, 0),
    positives: bands.reduce((s, b) => s + b.positives, 0),
  };
}

export const GROUPS: Record<GroupId, GroupData> = { A: makeGroup('A'), B: makeGroup('B') };

export interface Confusion {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
}

/** The confusion table for one group at threshold k (bands k and above are predicted positive). */
export function confusionAt(group: GroupData, k: number): Confusion {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  for (const b of group.bands) {
    const neg = b.total - b.positives;
    if (b.index >= k) {
      tp += b.positives;
      fp += neg;
    } else {
      fn += b.positives;
      tn += neg;
    }
  }
  return { tp, fp, fn, tn };
}

export interface Metrics {
  n: number;
  /** Share of the group who truly repay */
  baseRate: number;
  /** Share of the group approved */
  selectionRate: number;
  /** Of those who would repay, the share approved (true positive rate, "equal opportunity") */
  tpr: number;
  /** Of those who would not repay, the share approved (false positive rate) */
  fpr: number;
  /** Of those approved, the share who repay (positive predictive value, "predictive parity") */
  ppv: number | null;
  accuracy: number;
}

const ratio = (a: number, b: number) => (b === 0 ? 0 : a / b);

/** Rates from a confusion table. PPV is null when nobody is approved (it is undefined, not zero). */
export function metricsFromConfusion(c: Confusion): Metrics {
  const n = c.tp + c.fp + c.fn + c.tn;
  const pos = c.tp + c.fn;
  const neg = c.fp + c.tn;
  const approved = c.tp + c.fp;
  return {
    n,
    baseRate: ratio(pos, n),
    selectionRate: ratio(approved, n),
    tpr: ratio(c.tp, pos),
    fpr: ratio(c.fp, neg),
    ppv: approved === 0 ? null : c.tp / approved,
    accuracy: ratio(c.tp + c.tn, n),
  };
}

/** The largest gap between a band's observed repay rate and its score, over bands with enough people. */
export function calibrationGap(group: GroupData, minBandSize = 40): number {
  let worst = 0;
  for (const b of group.bands) {
    if (b.total < minBandSize) continue;
    worst = Math.max(worst, Math.abs(b.positives / b.total - b.mid));
  }
  return worst;
}

export type CriterionId = 'demographic' | 'opportunity' | 'odds' | 'predictive' | 'calibration';

export interface CriterionResult {
  id: CriterionId;
  name: string;
  /** The size of the disagreement between the groups (as a fraction, 0.05 = 5 percentage points); null if undefined. */
  gap: number | null;
  holds: boolean;
}

export const CRITERION_NAMES: Record<CriterionId, string> = {
  demographic: 'Demographic parity (same approval rate)',
  opportunity: 'Equal opportunity (same true positive rate)',
  odds: 'Equalised odds (same true and false positive rates)',
  predictive: 'Predictive parity (same precision)',
  calibration: 'Calibration within groups',
};

export interface LabState {
  kA: number;
  kB: number;
}

export interface LabReport {
  a: { confusion: Confusion; metrics: Metrics };
  b: { confusion: Confusion; metrics: Metrics };
  criteria: CriterionResult[];
  /** Correct decisions over everybody, 0 to 1 */
  accuracy: number;
  /** Wrong decisions in total */
  wrong: number;
  /** Accuracy of the best choice of two thresholds */
  bestAccuracy: number;
  /** Extra wrong decisions compared with the best choice of two thresholds (never negative) */
  extraWrong: number;
}

const absGap = (x: number | null, y: number | null) => (x === null || y === null ? null : Math.abs(x - y));

/** Overall correct decisions for a pair of thresholds. */
export function overallAccuracy(kA: number, kB: number): { correct: number; total: number } {
  const ca = confusionAt(GROUPS.A, kA);
  const cb = confusionAt(GROUPS.B, kB);
  return { correct: ca.tp + ca.tn + cb.tp + cb.tn, total: GROUPS.A.total + GROUPS.B.total };
}

/** The pair of thresholds with the highest overall accuracy. Ties go to the lowest thresholds. */
export function bestThresholds(): { kA: number; kB: number; correct: number } {
  let best = { kA: 0, kB: 0, correct: -1 };
  for (let kA = 0; kA <= MAX_K; kA++) {
    for (let kB = 0; kB <= MAX_K; kB++) {
      const { correct } = overallAccuracy(kA, kB);
      if (correct > best.correct) best = { kA, kB, correct };
    }
  }
  return best;
}

/** Evaluate a pair of thresholds. `tolerance` is how close two rates must be (a fraction) to count as equal. */
export function evaluate(state: LabState, tolerance: number): LabReport {
  const ca = confusionAt(GROUPS.A, state.kA);
  const cb = confusionAt(GROUPS.B, state.kB);
  const ma = metricsFromConfusion(ca);
  const mb = metricsFromConfusion(cb);
  const eps = 1e-9;
  const holds = (g: number | null) => g !== null && g <= tolerance + eps;

  const dp = absGap(ma.selectionRate, mb.selectionRate);
  const eo = absGap(ma.tpr, mb.tpr);
  const fprGap = absGap(ma.fpr, mb.fpr);
  const odds = eo === null || fprGap === null ? null : Math.max(eo, fprGap);
  const pp = absGap(ma.ppv, mb.ppv);
  const cal = Math.max(calibrationGap(GROUPS.A), calibrationGap(GROUPS.B));

  const { correct, total } = overallAccuracy(state.kA, state.kB);
  const best = bestThresholds();
  return {
    a: { confusion: ca, metrics: ma },
    b: { confusion: cb, metrics: mb },
    criteria: [
      { id: 'demographic', name: CRITERION_NAMES.demographic, gap: dp, holds: holds(dp) },
      { id: 'opportunity', name: CRITERION_NAMES.opportunity, gap: eo, holds: holds(eo) },
      { id: 'odds', name: CRITERION_NAMES.odds, gap: odds, holds: holds(odds) },
      { id: 'predictive', name: CRITERION_NAMES.predictive, gap: pp, holds: holds(pp) },
      { id: 'calibration', name: CRITERION_NAMES.calibration, gap: cal, holds: holds(cal) },
    ],
    accuracy: correct / total,
    wrong: total - correct,
    bestAccuracy: best.correct / total,
    extraWrong: best.correct - correct,
  };
}

export type MatchTarget = 'demographic' | 'opportunity' | 'predictive';

function valueFor(m: Metrics, target: MatchTarget): number | null {
  if (target === 'demographic') return m.selectionRate;
  if (target === 'opportunity') return m.tpr;
  return m.ppv;
}

/**
 * Keep group A at threshold kA and find the threshold for group B that brings the chosen rate
 * closest to A's. Ties go to the threshold nearest kA, so the answer changes as little as possible.
 */
export function matchThreshold(kA: number, target: MatchTarget): number {
  const goal = valueFor(metricsFromConfusion(confusionAt(GROUPS.A, kA)), target);
  let bestK = kA;
  let bestGap = Infinity;
  for (let k = 0; k <= MAX_K; k++) {
    const v = valueFor(metricsFromConfusion(confusionAt(GROUPS.B, k)), target);
    if (goal === null || v === null) continue;
    const gap = Math.abs(v - goal);
    if (gap < bestGap - 1e-12 || (Math.abs(gap - bestGap) <= 1e-12 && Math.abs(k - kA) < Math.abs(bestK - kA))) {
      bestGap = gap;
      bestK = k;
    }
  }
  return bestK;
}

/**
 * Chouldechova's identity: if two groups have the same precision (PPV), then their false positive
 * rates are tied to their true positive rates and base rates by
 *   FPR = base / (1 - base) x (1 - PPV) / PPV x TPR.
 * So when base rates differ, equal PPV forces unequal error rates unless the predictor is perfect.
 */
export function fprFromPpv(baseRate: number, ppv: number, tpr: number): number {
  return (baseRate / (1 - baseRate)) * ((1 - ppv) / ppv) * tpr;
}

/** Format a fraction as a percentage with one decimal place. */
export const pct = (x: number | null, digits = 1): string => (x === null ? 'n/a' : (x * 100).toFixed(digits) + '%');

/** The tolerances the learner can pick, in fractions. */
export const TOLERANCES = [0.01, 0.02, 0.05] as const;

/** The starting thresholds: one common threshold of 0.50 for both groups. */
export const START: LabState = { kA: 10, kB: 10 };
