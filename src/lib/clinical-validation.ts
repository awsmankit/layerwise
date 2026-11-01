/*
 * Logic for the validation lab in responsible/medical-and-regulated-ai.
 *
 * Everything is synthetic. A screening model gives each patient a score s. Patients without the
 * condition score like a standard normal, N(0, 1). Patients with it score like N(d, 1), where d
 * depends on the scanner type (a bigger d means the two groups are easier to tell apart). The model
 * was developed at a referral hospital (clinic A), where 20% of patients have the condition, and
 * turns a score into a risk by Bayes' rule at that prevalence. A second clinic (B) has the same
 * model, the same scanners and the same patient mix, but only 2% of its patients have the
 * condition. Sensitivity and specificity do not change between the clinics. Predictive values and
 * calibration do. All numbers are made up for teaching; none describe a real device.
 */

/** Standard normal cumulative distribution function, from the complementary error function below. */
export function Phi(x: number): number {
  if (x === Infinity) return 1;
  if (x === -Infinity) return 0;
  return 0.5 * erfc(-x / Math.SQRT2);
}

/** Complementary error function, Numerical Recipes erfcc with fractional error below 1.2e-7. */
function erfc(x: number): number {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const r =
    t *
    Math.exp(
      -z * z -
        1.26551223 +
        t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))
    );
  return x >= 0 ? r : 2 - r;
}

/** Standard normal density. */
export const phiDensity = (x: number) => Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI);

export type Group = { id: string; name: string; d: number; share: number };
export const GROUPS: Group[] = [
  { id: 't1', name: 'Scanner type 1', d: 2.4, share: 0.7 },
  { id: 't2', name: 'Scanner type 2', d: 1.6, share: 0.3 },
];

export type Clinic = { id: 'A' | 'B'; name: string; prevalence: number };
export const CLINICS: Clinic[] = [
  { id: 'A', name: 'Referral hospital', prevalence: 0.2 },
  { id: 'B', name: 'Community clinic', prevalence: 0.02 },
];
export const DEV_PREVALENCE = 0.2;
export const N = 10000;

const logit = (p: number) => Math.log(p / (1 - p));
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/** Density of scores for patients with the condition: a mixture over scanner types. */
export const densityPos = (s: number, groups = GROUPS) => groups.reduce((a, g) => a + g.share * phiDensity(s - g.d), 0);
/** Density of scores for patients without it. */
export const densityNeg = (s: number) => phiDensity(s);

/** The model's stated risk for a score, calibrated at the development prevalence, plus an optional shift in log-odds. */
export function risk(s: number, shift = 0, groups = GROUPS): number {
  const lr = densityPos(s, groups) / densityNeg(s);
  return sigmoid(logit(DEV_PREVALENCE) + Math.log(lr) + shift);
}

/** The log-odds shift that moves a model calibrated at one prevalence to another (the prior shift correction). */
export const priorShift = (from: number, to: number) => logit(to) - logit(from);

/** The score at which the stated risk equals p. Risk rises with the score, so this is a bisection. */
export function scoreForRisk(p: number, shift = 0): number {
  let lo = -12;
  let hi = 12;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (risk(mid, shift) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export type Confusion = { n: number; tp: number; fn: number; fp: number; tn: number; sensitivity: number; specificity: number; ppv: number; npv: number; flagged: number };

function confusionFrom(n: number, prevalence: number, sens: number, spec: number): Confusion {
  const tp = n * prevalence * sens;
  const fn = n * prevalence * (1 - sens);
  const fp = n * (1 - prevalence) * (1 - spec);
  const tn = n * (1 - prevalence) * spec;
  return { n, tp, fn, fp, tn, sensitivity: sens, specificity: spec, ppv: tp / (tp + fp), npv: tn / (tn + fn), flagged: tp + fp };
}

/** Counts and rates when everyone with a score at or above t is flagged. group = null means all patients together. */
export function confusion(prevalence: number, t: number, group: Group | null = null, n = N): Confusion {
  const spec = Phi(t);
  if (group) return confusionFrom(n * group.share, prevalence, 1 - Phi(t - group.d), spec);
  const sens = GROUPS.reduce((a, g) => a + g.share * (1 - Phi(t - g.d)), 0);
  return confusionFrom(n, prevalence, sens, spec);
}

export type CalibrationRow = { from: number; to: number; share: number; predicted: number; observed: number };

/** Edges of the risk bins, as stated risks. */
export const RISK_CUTS = [0.05, 0.2, 0.5, 0.8];

/**
 * The calibration table for one clinic. Patients are grouped by the risk the model states
 * (with the given log-odds shift). For each bin: the share of the clinic's patients in it, the
 * average stated risk, and the share who actually have the condition.
 */
export function calibrationTable(prevalence: number, shift = 0, cuts = RISK_CUTS): CalibrationRow[] {
  const scoreEdges = [-Infinity, ...cuts.map((c) => scoreForRisk(c, shift)), Infinity];
  const rows: CalibrationRow[] = [];
  for (let i = 0; i < scoreEdges.length - 1; i++) {
    const a = scoreEdges[i];
    const b = scoreEdges[i + 1];
    const p1 = GROUPS.reduce((acc, g) => acc + g.share * (Phi(b - g.d) - Phi(a - g.d)), 0);
    const p0 = Phi(b) - Phi(a);
    const share = prevalence * p1 + (1 - prevalence) * p0;
    const observed = (prevalence * p1) / share;
    // average stated risk inside the bin, weighted by how many of this clinic's patients score there
    const lo = Math.max(a, -9);
    const hi = Math.min(b, 9);
    const steps = 4000;
    const h = (hi - lo) / steps;
    let num = 0;
    let den = 0;
    for (let k = 0; k < steps; k++) {
      const s = lo + (k + 0.5) * h;
      const g = prevalence * densityPos(s) + (1 - prevalence) * densityNeg(s);
      num += risk(s, shift) * g * h;
      den += g * h;
    }
    rows.push({ from: i === 0 ? 0 : cuts[i - 1], to: i === cuts.length ? 1 : cuts[i], share, predicted: num / den, observed });
  }
  return rows;
}

export const pct = (x: number, digits = 0) => `${(x * 100).toFixed(digits)}%`;
