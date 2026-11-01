/**
 * A tiny generative adversarial network on one number, for the lesson "Autoencoders, VAEs and GANs".
 * Real data is a two-humped distribution (a mixture of two bell curves). The generator G turns a random
 * number z (from a standard bell curve) into a fake sample: G is a 1 -> 8 tanh -> 1 net. The discriminator D
 * scores a sample from 0 (looks fake) to 1 (looks real): D is a 1 -> 8 tanh -> 1 sigmoid net.
 * Both are trained by Adam with hand-written backpropagation, taking turns: `dSteps` updates of D for every
 * update of G. G uses the non-saturating loss from the original paper (maximise log D(G(z))).
 * Every random choice comes from a seeded generator, so a given seed and settings always replay the same run.
 */
import { gauss, rng } from './nn';

export const H = 8;
export const MODES = [-2, 2];
export const MODE_SD = 0.4;
export const BATCH = 32;

export type GanSettings = {
  /** Learning rate of the generator (Adam). */
  lrG: number;
  /** Learning rate of the discriminator (Adam). */
  lrD: number;
  /** Discriminator updates per generator update. */
  dSteps: number;
  seed: number;
};

/** The learning rates the sliders offer, smallest to largest. */
export const RATES_G = [0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05];
export const RATES_D = [0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.03];
export const D_STEPS = [1, 2, 5];
export const RUN_LENGTH = 1500;

export const PRESETS: { id: string; label: string; note: string; settings: GanSettings }[] = [
  {
    id: 'even',
    label: 'Even match',
    note: 'Both players learn at the same pace, one discriminator step per generator step.',
    settings: { lrG: 0.002, lrD: 0.002, dSteps: 1, seed: 1 },
  },
  {
    id: 'strong-d',
    label: 'Detective too strong',
    note: 'The discriminator learns much faster and takes five steps per generator step.',
    settings: { lrG: 0.0005, lrD: 0.03, dSteps: 5, seed: 1 },
  },
  {
    id: 'strong-g',
    label: 'Forger too fast',
    note: 'The generator learns much faster than the discriminator can keep up.',
    settings: { lrG: 0.05, lrD: 0.0005, dSteps: 1, seed: 2 },
  },
];

/* ---------- parameters: G then D, in one flat array each ---------- */

const NG = 3 * H + 1; // w1 (H), b1 (H), w2 (H), b2 (1)
type Adam = { m: Float64Array; v: Float64Array; t: number };

export class Gan {
  settings: GanSettings;
  g: Float64Array;
  d: Float64Array;
  private ag: Adam;
  private ad: Adam;
  private rand: () => number;
  steps = 0;
  /** Recorded every 10 steps: step number, discriminator loss, generator loss, 1-Wasserstein distance. */
  history: { step: number; lossD: number; lossG: number; w1: number }[] = [];

  constructor(settings: GanSettings) {
    this.settings = { ...settings };
    this.rand = rng(settings.seed * 6007 + 17);
    this.g = new Float64Array(NG);
    this.d = new Float64Array(NG);
    for (let j = 0; j < H; j++) {
      this.g[j] = gauss(this.rand) * 0.8; // w1
      this.g[2 * H + j] = gauss(this.rand) * 0.4; // w2
      this.d[j] = gauss(this.rand) * 0.8;
      this.d[2 * H + j] = gauss(this.rand) * 0.4;
    }
    this.ag = { m: new Float64Array(NG), v: new Float64Array(NG), t: 0 };
    this.ad = { m: new Float64Array(NG), v: new Float64Array(NG), t: 0 };
  }

  /** The generator: z -> a fake sample. */
  gen(z: number): number {
    return mlp(this.g, z);
  }

  /** The discriminator: sample -> probability that it is real. */
  disc(x: number): number {
    return sigmoid(mlp(this.d, x));
  }

  /** One real sample from the two-humped distribution. */
  private real(): number {
    return (this.rand() < 0.5 ? MODES[0] : MODES[1]) + gauss(this.rand) * MODE_SD;
  }

  /** One round: `dSteps` discriminator updates, then one generator update. */
  step(): void {
    const { lrG, lrD, dSteps } = this.settings;
    let lossD = 0;
    for (let k = 0; k < dSteps; k++) {
      const gd = new Float64Array(NG);
      lossD = 0;
      for (let i = 0; i < BATCH; i++) {
        const xr = this.real();
        const xf = this.gen(gauss(this.rand));
        lossD += accumulate(this.d, gd, xr, 1) + accumulate(this.d, gd, xf, 0);
      }
      lossD /= BATCH;
      for (let i = 0; i < NG; i++) gd[i] /= BATCH;
      adam(this.d, gd, this.ad, lrD);
    }
    // generator: minimise -log D(G(z))
    const gg = new Float64Array(NG);
    let lossG = 0;
    for (let i = 0; i < BATCH; i++) {
      const z = gauss(this.rand);
      const trace = forward(this.g, z);
      const x = trace.out;
      const dt = forward(this.d, x);
      const p = sigmoid(dt.out);
      lossG += -Math.log(Math.max(p, 1e-9));
      // d(-log p)/d(logit) = p - 1; carry it back through D to its input x, then through G
      const dLogit = p - 1;
      const dx = backInput(this.d, dt, dLogit);
      backParams(this.g, trace, dx, gg);
    }
    lossG /= BATCH;
    for (let i = 0; i < NG; i++) gg[i] /= BATCH;
    adam(this.g, gg, this.ag, lrG);

    this.steps += 1;
    if (this.steps % 10 === 0) this.history.push({ step: this.steps, lossD, lossG, w1: this.w1() });
  }

  run(n: number): void {
    for (let i = 0; i < n; i++) this.step();
  }

  /** Fixed grid of z values, so successive readings are comparable. */
  fakes(n = 400): number[] {
    return Array.from({ length: n }, (_, i) => this.gen(zQuantile((i + 0.5) / n)));
  }

  /** 1-Wasserstein distance between the fakes and the real distribution: the average gap between sorted values. */
  w1(n = 400): number {
    const f = this.fakes(n).sort((a, b) => a - b);
    const r = realQuantiles(n);
    let s = 0;
    for (let i = 0; i < n; i++) s += Math.abs(f[i] - r[i]);
    return s / n;
  }

  /** How the fakes split between the two humps, and how many land near either. */
  coverage(n = 400): { left: number; right: number; between: number } {
    const f = this.fakes(n);
    const near = 3 * MODE_SD;
    let left = 0;
    let right = 0;
    for (const x of f) {
      if (Math.abs(x - MODES[0]) <= near) left += 1;
      else if (Math.abs(x - MODES[1]) <= near) right += 1;
    }
    return { left: left / n, right: right / n, between: 1 - (left + right) / n };
  }
}

/* ---------- maths ---------- */

const sigmoid = (a: number) => 1 / (1 + Math.exp(-a));

/** The mixture's quantiles at (i + 0.5) / n, found by bisection on its CDF. */
export function realQuantiles(n: number): number[] {
  const cdf = (x: number) => 0.5 * (normCdf((x - MODES[0]) / MODE_SD) + normCdf((x - MODES[1]) / MODE_SD));
  return Array.from({ length: n }, (_, i) => {
    const q = (i + 0.5) / n;
    let lo = -6;
    let hi = 6;
    for (let k = 0; k < 60; k++) {
      const mid = (lo + hi) / 2;
      if (cdf(mid) < q) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  });
}

/** Standard normal CDF (Abramowitz and Stegun 7.1.26, error below 1.5e-7). */
export function normCdf(x: number): number {
  const u = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * u);
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  const erf = 1 - poly * Math.exp(-u * u);
  return x >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

/** Standard normal quantile (Acklam's rational approximation). */
export function zQuantile(p: number): number {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - lo) return -zQuantile(1 - p);
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/* ---------- the two nets share one shape: x -> H tanh units -> one number ---------- */

type Trace = { x: number; h: number[]; out: number };

function forward(p: Float64Array, x: number): Trace {
  const h = new Array<number>(H);
  let out = p[3 * H];
  for (let j = 0; j < H; j++) {
    h[j] = Math.tanh(p[j] * x + p[H + j]);
    out += p[2 * H + j] * h[j];
  }
  return { x, h, out };
}

export function mlp(p: Float64Array, x: number): number {
  return forward(p, x).out;
}

/** Gradient of the output with respect to the input x, scaled by `dOut`. */
function backInput(p: Float64Array, t: Trace, dOut: number): number {
  let dx = 0;
  for (let j = 0; j < H; j++) dx += dOut * p[2 * H + j] * (1 - t.h[j] * t.h[j]) * p[j];
  return dx;
}

/** Add the gradient of the parameters, for an output gradient `dOut`, into `g`. */
function backParams(p: Float64Array, t: Trace, dOut: number, g: Float64Array): void {
  g[3 * H] += dOut;
  for (let j = 0; j < H; j++) {
    g[2 * H + j] += dOut * t.h[j];
    const da = dOut * p[2 * H + j] * (1 - t.h[j] * t.h[j]);
    g[j] += da * t.x;
    g[H + j] += da;
  }
}

/** Binary cross-entropy of D on one sample with the given label; adds its gradient into `g`. Returns the loss. */
function accumulate(d: Float64Array, g: Float64Array, x: number, label: 0 | 1): number {
  const t = forward(d, x);
  const p = sigmoid(t.out);
  backParams(d, t, p - label, g);
  return -Math.log(Math.max(label ? p : 1 - p, 1e-9));
}

function adam(p: Float64Array, g: Float64Array, s: Adam, lr: number): void {
  const b1 = 0.5; // the low first-moment decay usual for GANs
  const b2 = 0.999;
  s.t += 1;
  for (let i = 0; i < p.length; i++) {
    s.m[i] = b1 * s.m[i] + (1 - b1) * g[i];
    s.v[i] = b2 * s.v[i] + (1 - b2) * g[i] * g[i];
    const mh = s.m[i] / (1 - Math.pow(b1, s.t));
    const vh = s.v[i] / (1 - Math.pow(b2, s.t));
    p[i] -= (lr * mh) / (Math.sqrt(vh) + 1e-8);
  }
}

/** Exposed for the gradient check in the tests. */
export const internals = { forward, backInput, backParams, accumulate, sigmoid };

export type Outcome = 'both' | 'one-hump' | 'between' | 'partial';

/** A plain-words label for where a run ended up, from where the fakes landed. */
export function classify(c: { left: number; right: number; between: number }): Outcome {
  if (c.between > 0.5) return 'between';
  if (Math.min(c.left, c.right) < 0.1) return 'one-hump';
  if (c.between <= 0.25 && Math.min(c.left, c.right) >= 0.25) return 'both';
  return 'partial';
}

export const OUTCOME_LABEL: Record<Outcome, string> = {
  both: 'both humps covered',
  'one-hump': 'collapsed onto one hump',
  between: 'stuck between the humps',
  partial: 'partly covered',
};
