/**
 * Scaling-law arithmetic for the "Scaling laws and compute-optimal training" lesson.
 *
 * Two ideas are used throughout:
 *
 *  1. Training compute C is about 6 x N x D floating-point operations for a model with
 *     N parameters trained on D tokens (Kaplan et al. 2020; 2N per token forward, about
 *     4N backward). Serving costs about 2 x N per generated or read token.
 *  2. Final training loss follows a parametric law L(N, D) = E + A / N^alpha + B / D^beta
 *     (Hoffmann et al. 2022, "Approach 3"). With C = 6ND fixed, the loss-minimising N and D
 *     have a closed form, used by `optimalAllocation`.
 *
 * Every constant below comes from a paper; the absolute loss values belong to that paper's
 * dataset and tokenizer, so they are not comparable with another model's loss. Everything
 * here is an extrapolation of a fit, and the fits themselves disagree: treat the outputs as
 * planning estimates, not predictions.
 */

export type FitId = 'epoch' | 'hoffmann';

export type Fit = {
  id: FitId;
  label: string;
  /** Where the numbers come from. */
  source: string;
  E: number;
  A: number;
  B: number;
  alpha: number;
  beta: number;
};

export const FITS: Record<FitId, Fit> = {
  epoch: {
    id: 'epoch',
    label: 'Epoch AI re-fit (2024)',
    source: 'Besiroglu et al., "Chinchilla Scaling: A replication attempt", equation 3 (arXiv 2404.10102)',
    E: 1.8172,
    A: 482.01,
    B: 2085.43,
    alpha: 0.3478,
    beta: 0.3658,
  },
  hoffmann: {
    id: 'hoffmann',
    label: 'Hoffmann et al. as printed (2022)',
    source: 'Hoffmann et al., "Training Compute-Optimal Large Language Models", Approach 3 as printed in the paper (arXiv 2203.15556)',
    E: 1.69,
    A: 406.4,
    B: 410.7,
    alpha: 0.34,
    beta: 0.28,
  },
};

/** FLOPs of training: 6 x parameters x tokens. */
export const trainFlops = (n: number, d: number) => 6 * n * d;

/** FLOPs of serving: about 2 x parameters per token. */
export const inferFlops = (n: number, tokens: number) => 2 * n * tokens;

/** Predicted final training loss for N parameters trained on D tokens. */
export function loss(fit: Fit, n: number, d: number): number {
  return fit.E + fit.A / Math.pow(n, fit.alpha) + fit.B / Math.pow(d, fit.beta);
}

/** The part of the loss that no amount of data removes for a model of this size. */
export function sizeFloor(fit: Fit, n: number): number {
  return fit.E + fit.A / Math.pow(n, fit.alpha);
}

export type Allocation = { n: number; d: number; ratio: number; loss: number };

/**
 * Loss-minimising split of a compute budget C (FLOPs) between parameters and tokens under
 * C = 6ND. Setting the derivative to zero gives N = G (C/6)^(beta/(alpha+beta)) with
 * G = (alpha A / (beta B))^(1 / (alpha + beta)), and D = C / (6N).
 */
export function optimalAllocation(fit: Fit, c: number): Allocation {
  const { A, B, alpha, beta } = fit;
  const g = Math.pow((alpha * A) / (beta * B), 1 / (alpha + beta));
  const n = g * Math.pow(c / 6, beta / (alpha + beta));
  const d = c / (6 * n);
  return { n, d, ratio: d / n, loss: loss(fit, n, d) };
}

/** Train a model of the given size on whatever tokens the budget allows. */
export function fixedSize(fit: Fit, n: number, c: number): Allocation {
  const d = c / (6 * n);
  return { n, d, ratio: d / n, loss: loss(fit, n, d) };
}

/** Loss of the best N and D for a budget, as a curve over budgets. */
export const frontierLoss = (fit: Fit, c: number) => optimalAllocation(fit, c).loss;

/**
 * Tokens a model of N parameters needs to reach a target loss, or null when the target is
 * below what a model that small can reach with any amount of data.
 */
export function tokensForLoss(fit: Fit, n: number, target: number): number | null {
  const gap = target - sizeFloor(fit, n);
  if (!(gap > 0)) return null;
  return Math.pow(fit.B / gap, 1 / fit.beta);
}

export type MatchedAlternative = {
  /** Parameters of the smaller model. */
  n: number;
  /** Tokens it needs to reach the same loss as the compute-optimal model. */
  d: number;
  ratio: number;
  /** Its training FLOPs. */
  train: number;
  /** Training FLOPs divided by the compute-optimal model's. */
  trainMultiple: number;
};

/**
 * A model smaller than the compute-optimal one (size = fraction x N_opt), trained for as many
 * tokens as it takes to reach the same loss. It costs more to train and less to serve.
 * Null if that loss is unreachable at the smaller size.
 */
export function matchedAlternative(fit: Fit, c: number, fraction: number): MatchedAlternative | null {
  const opt = optimalAllocation(fit, c);
  const n = opt.n * fraction;
  const d = tokensForLoss(fit, n, opt.loss);
  if (d === null) return null;
  const train = trainFlops(n, d);
  return { n, d, ratio: d / n, train, trainMultiple: train / c };
}

/** Total FLOPs to train a model and then serve it for a number of tokens. */
export const lifetimeFlops = (n: number, d: number, servedTokens: number) => trainFlops(n, d) + inferFlops(n, servedTokens);

/**
 * Number of served tokens above which the smaller, longer-trained model has the lower total
 * FLOPs: 6 N2 D2 + 2 N2 T = 6 N D + 2 N T gives T = 3 (N2 D2 - N D) / (N - N2).
 * Infinity if the "smaller" model is not smaller.
 */
export function breakEvenServedTokens(opt: { n: number; d: number }, alt: { n: number; d: number }): number {
  if (!(alt.n < opt.n)) return Infinity;
  return (3 * (alt.n * alt.d - opt.n * opt.d)) / (opt.n - alt.n);
}

/* ---------- from FLOPs to hardware time and money ---------- */

export type GpuPlan = {
  gpuSeconds: number;
  gpuHours: number;
  gpuDays: number;
  /** Wall-clock days on the stated number of GPUs. */
  wallDays: number;
  /** Cost at the stated price per GPU-hour. */
  cost: number;
};

/**
 * Hardware time for C FLOPs when each GPU sustains peak x utilisation FLOP/s.
 * Utilisation here is model FLOPs utilisation (MFU): useful model FLOPs per second divided by
 * the chip's peak. Large dense-model runs have reported roughly 40 percent.
 */
export function gpuPlan(c: number, peakFlops: number, mfu: number, gpus: number, pricePerGpuHour: number): GpuPlan {
  const gpuSeconds = c / (peakFlops * mfu);
  const gpuHours = gpuSeconds / 3600;
  return {
    gpuSeconds,
    gpuHours,
    gpuDays: gpuHours / 24,
    wallDays: gpuHours / gpus / 24,
    cost: gpuHours * pricePerGpuHour,
  };
}

/** The reverse: the FLOPs a block of GPU-days delivers at a given peak and utilisation. */
export const flopsFromGpuDays = (gpuDays: number, peakFlops: number, mfu: number) => gpuDays * 86400 * peakFlops * mfu;

/* ---------- fitting a power law (also the idea behind the lab) ---------- */

/**
 * Least-squares line through (log10 x, log10 y): y = coef * x^exponent.
 */
export function fitPowerLaw(xs: number[], ys: number[]): { coef: number; exponent: number } {
  const n = xs.length;
  const lx = xs.map((x) => Math.log10(x));
  const ly = ys.map((y) => Math.log10(y));
  const mx = lx.reduce((a, b) => a + b, 0) / n;
  const my = ly.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (lx[i] - mx) * (ly[i] - my);
    sxx += (lx[i] - mx) ** 2;
  }
  const exponent = sxy / sxx;
  return { coef: Math.pow(10, my - exponent * mx), exponent };
}

/* ---------- display helpers ---------- */

/** 1.2e24 style text, or a plain number when small. */
export function sci(x: number, digits = 3): string {
  if (!isFinite(x) || x === 0) return String(x);
  if (Math.abs(x) < 1e4 && Math.abs(x) >= 0.01) return String(Number(x.toPrecision(3)));
  const e = Math.floor(Math.log10(Math.abs(x)));
  const m = x / Math.pow(10, e);
  return `${m.toFixed(digits - 1)}e${e}`;
}

/** 7.2B, 1.33T and so on, for parameter and token counts. */
export function human(x: number): string {
  if (!isFinite(x)) return String(x);
  const units: [number, string][] = [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ];
  for (const [v, s] of units) {
    if (Math.abs(x) >= v) {
      const q = x / v;
      return (q >= 100 ? q.toFixed(0) : q >= 10 ? q.toFixed(1) : q.toFixed(2)) + s;
    }
  }
  return String(Math.round(x));
}
