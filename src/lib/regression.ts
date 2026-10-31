/** Linear and logistic regression helpers for the "fit a line" lesson. Pure functions, no DOM. */

export type Pt = { x: number; y: number };
export type Line = { slope: number; intercept: number };

/** Closed-form least squares for one input. With fewer than two distinct x values it returns a flat line at the mean. */
export function fitLine(points: Pt[]): Line {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (const p of points) {
    sxy += (p.x - mx) * (p.y - my);
    sxx += (p.x - mx) ** 2;
  }
  if (sxx < 1e-12) return { slope: 0, intercept: my };
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx };
}

export const predict = (line: Line, x: number) => line.intercept + line.slope * x;

/** Residual = actual minus predicted (positive when the point sits above the line). */
export const residuals = (points: Pt[], line: Line) => points.map((p) => p.y - predict(line, p.x));

/** Sum of squared errors. */
export const sse = (points: Pt[], line: Line) => residuals(points, line).reduce((s, r) => s + r * r, 0);

export const mse = (points: Pt[], line: Line) => (points.length ? sse(points, line) / points.length : 0);

/**
 * Least squares with several inputs by the normal equations (X'X) b = X'y,
 * solved with Gaussian elimination and partial pivoting. Returns [intercept, ...coefficients],
 * or null if the inputs are linearly dependent.
 */
export function fitMultiple(rows: number[][], ys: number[]): number[] | null {
  const n = rows.length;
  if (n === 0) return null;
  const k = rows[0].length + 1;
  const X = rows.map((r) => [1, ...r]);
  const A: number[][] = Array.from({ length: k }, () => new Array(k + 1).fill(0));
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) for (let r = 0; r < n; r++) A[i][j] += X[r][i] * X[r][j];
    for (let r = 0; r < n; r++) A[i][k] += X[r][i] * ys[r];
  }
  for (let c = 0; c < k; c++) {
    let p = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-10) return null;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < k; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let j = c; j <= k; j++) A[r][j] -= f * A[c][j];
    }
  }
  return A.map((row, i) => row[k] / row[i]);
}

/* ---------- logistic regression ---------- */

export const sigmoid = (z: number) => (z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z)));
export const logit = (p: number) => Math.log(p / (1 - p));

export type Labelled = { x: number; label: 0 | 1 };
export type Logistic = { w: number; b: number };

export const probability = (m: Logistic, x: number) => sigmoid(m.w * x + m.b);

/** Mean log loss (cross-entropy), with probabilities clipped away from 0 and 1. */
export function logLoss(points: Labelled[], m: Logistic): number {
  if (!points.length) return 0;
  const eps = 1e-12;
  let s = 0;
  for (const p of points) {
    const q = Math.min(1 - eps, Math.max(eps, probability(m, p.x)));
    s += p.label === 1 ? -Math.log(q) : -Math.log(1 - q);
  }
  return s / points.length;
}

/** One gradient-descent step on the mean log loss. The gradient is mean((p - y) * x) for w and mean(p - y) for b. */
export function logisticStep(points: Labelled[], m: Logistic, lr: number): Logistic {
  const n = points.length;
  if (!n) return m;
  let gw = 0;
  let gb = 0;
  for (const p of points) {
    const err = probability(m, p.x) - p.label;
    gw += err * p.x;
    gb += err;
  }
  return { w: m.w - (lr * gw) / n, b: m.b - (lr * gb) / n };
}

export function trainLogistic(points: Labelled[], start: Logistic, steps: number, lr: number): Logistic {
  let m = start;
  for (let i = 0; i < steps; i++) m = logisticStep(points, m, lr);
  return m;
}

/** The x where the probability equals the threshold t (0 < t < 1). Null if the curve is flat. */
export function boundaryAt(m: Logistic, t: number): number | null {
  if (Math.abs(m.w) < 1e-9) return null;
  return (logit(t) - m.b) / m.w;
}

/** How many points are on the right side of the threshold. */
export function accuracyAt(points: Labelled[], m: Logistic, t: number): number {
  if (!points.length) return 0;
  return points.filter((p) => (probability(m, p.x) >= t ? 1 : 0) === p.label).length / points.length;
}
