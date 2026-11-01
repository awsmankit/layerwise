/**
 * A tiny autoencoder and variational autoencoder on 2D points with a one-number latent code, for the
 * lesson "Autoencoders, VAEs and GANs". The nets are real: an encoder (2 -> 8 tanh -> mean and log-variance)
 * and a decoder (1 -> 8 tanh -> 2), trained by full-batch Adam with hand-written backpropagation. Every random
 * choice comes from a seeded generator, so a given seed always gives the same data and the same run.
 *
 * Plain autoencoder: the code is the encoder's mean and the loss is the squared reconstruction error.
 * VAE: the code is drawn as mean + sigma * noise (the reparameterisation trick) and the loss adds
 * klWeight * KL(N(mean, sigma^2) || N(0, 1)), the pull towards a tidy shared region.
 */
import { gauss, rng } from './nn';

export type DataKind = 'clumps' | 'arc';
export type Point = [number, number];
export type Mode = 'ae' | 'vae';

export const DATA_KINDS: { id: DataKind; label: string; note: string }[] = [
  { id: 'clumps', label: 'Two clumps', note: 'Two separate groups of points.' },
  { id: 'arc', label: 'Arc', note: 'Points along one curved line.' },
];

/** `n` points. Two clumps are centred at (-1.4, -0.9) and (1.4, 0.9); the arc is half a circle of radius 1.5. */
export function makeData(kind: DataKind, n = 160, seed = 1): Point[] {
  const r = rng(seed * 7717 + 5);
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    if (kind === 'clumps') {
      const s = i % 2 ? 1 : -1;
      out.push([s * 1.4 + gauss(r) * 0.22, s * 0.9 + gauss(r) * 0.22]);
    } else {
      const a = Math.PI * (0.05 + 0.9 * r());
      out.push([1.5 * Math.cos(a) + gauss(r) * 0.07, 1.5 * Math.sin(a) - 0.7 + gauss(r) * 0.07]);
    }
  }
  return out;
}

/* ---------- the network, in one flat parameter array ---------- */

export const H = 8;
const sizes = {
  W1: 2 * H, // encoder layer 1: H x 2
  b1: H,
  W2: 2 * H, // encoder output: 2 x H (mean, log-variance)
  b2: 2,
  V1: H, // decoder layer 1: H x 1
  c1: H,
  V2: 2 * H, // decoder output: 2 x H
  c2: 2,
};
const names = Object.keys(sizes) as (keyof typeof sizes)[];
const offsets: Record<string, number> = {};
let total = 0;
for (const k of names) {
  offsets[k] = total;
  total += sizes[k];
}
export const PARAM_COUNT = total;

export type Params = Float64Array;

export function initParams(seed: number): Params {
  const r = rng(seed * 104729 + 3);
  const p = new Float64Array(total);
  const fill = (k: keyof typeof sizes, scale: number) => {
    for (let i = 0; i < sizes[k]; i++) p[offsets[k] + i] = gauss(r) * scale;
  };
  fill('W1', 0.7);
  fill('W2', 0.4);
  fill('V1', 0.7);
  fill('V2', 0.4);
  return p;
}

const LV_MIN = -9;
const LV_MAX = 3;

export function encode(p: Params, x: Point): { mu: number; lv: number } {
  const o = offsets;
  let mu = p[o.b2];
  let lv = p[o.b2 + 1];
  for (let j = 0; j < H; j++) {
    const h = Math.tanh(p[o.W1 + 2 * j] * x[0] + p[o.W1 + 2 * j + 1] * x[1] + p[o.b1 + j]);
    mu += p[o.W2 + j] * h;
    lv += p[o.W2 + H + j] * h;
  }
  return { mu, lv: Math.min(LV_MAX, Math.max(LV_MIN, lv)) };
}

export function decode(p: Params, z: number): Point {
  const o = offsets;
  let x = p[o.c2];
  let y = p[o.c2 + 1];
  for (let j = 0; j < H; j++) {
    const h = Math.tanh(p[o.V1 + j] * z + p[o.c1 + j]);
    x += p[o.V2 + j] * h;
    y += p[o.V2 + H + j] * h;
  }
  return [x, y];
}

/** KL(N(mu, exp(lv)) || N(0, 1)) for one number: 0.5 * (mu^2 + sigma^2 - 1 - ln sigma^2). */
export function klGauss(mu: number, lv: number): number {
  return 0.5 * (mu * mu + Math.exp(lv) - 1 - lv);
}

/**
 * Loss and gradient for one batch. `eps` holds one fixed noise number per point (ignored for the plain
 * autoencoder), so the same call with the same noise is exactly repeatable and can be checked numerically.
 */
export function lossAndGrad(p: Params, data: Point[], mode: Mode, klWeight: number, eps: number[]) {
  const o = offsets;
  const g = new Float64Array(total);
  const n = data.length;
  let recon = 0;
  let kl = 0;
  for (let i = 0; i < n; i++) {
    const x = data[i];
    // encoder forward
    const h1 = new Array<number>(H);
    let mu = p[o.b2];
    let lvRaw = p[o.b2 + 1];
    for (let j = 0; j < H; j++) {
      h1[j] = Math.tanh(p[o.W1 + 2 * j] * x[0] + p[o.W1 + 2 * j + 1] * x[1] + p[o.b1 + j]);
      mu += p[o.W2 + j] * h1[j];
      lvRaw += p[o.W2 + H + j] * h1[j];
    }
    const clamped = lvRaw < LV_MIN || lvRaw > LV_MAX;
    const lv = Math.min(LV_MAX, Math.max(LV_MIN, lvRaw));
    const vae = mode === 'vae';
    const sigma = vae ? Math.exp(lv / 2) : 0;
    const z = vae ? mu + sigma * eps[i] : mu;
    // decoder forward
    const h2 = new Array<number>(H);
    let ox = p[o.c2];
    let oy = p[o.c2 + 1];
    for (let j = 0; j < H; j++) {
      h2[j] = Math.tanh(p[o.V1 + j] * z + p[o.c1 + j]);
      ox += p[o.V2 + j] * h2[j];
      oy += p[o.V2 + H + j] * h2[j];
    }
    const ex = ox - x[0];
    const ey = oy - x[1];
    recon += ex * ex + ey * ey;
    if (vae) kl += klGauss(mu, lv);

    // backward: decoder
    const dox = (2 * ex) / n;
    const doy = (2 * ey) / n;
    g[o.c2] += dox;
    g[o.c2 + 1] += doy;
    let dz = 0;
    for (let j = 0; j < H; j++) {
      g[o.V2 + j] += dox * h2[j];
      g[o.V2 + H + j] += doy * h2[j];
      const da = (p[o.V2 + j] * dox + p[o.V2 + H + j] * doy) * (1 - h2[j] * h2[j]);
      g[o.V1 + j] += da * z;
      g[o.c1 + j] += da;
      dz += p[o.V1 + j] * da;
    }
    // backward: the code
    let dmu = dz;
    let dlv = 0;
    if (vae) {
      dmu += (klWeight * mu) / n;
      dlv = dz * 0.5 * sigma * eps[i] + (klWeight * 0.5 * (Math.exp(lv) - 1)) / n;
      if (clamped) dlv = 0;
    }
    // backward: encoder
    g[o.b2] += dmu;
    g[o.b2 + 1] += dlv;
    for (let j = 0; j < H; j++) {
      g[o.W2 + j] += dmu * h1[j];
      g[o.W2 + H + j] += dlv * h1[j];
      const da = (p[o.W2 + j] * dmu + p[o.W2 + H + j] * dlv) * (1 - h1[j] * h1[j]);
      g[o.W1 + 2 * j] += da * x[0];
      g[o.W1 + 2 * j + 1] += da * x[1];
      g[o.b1 + j] += da;
    }
  }
  return { loss: recon / n + klWeight * (kl / n), recon: recon / n, kl: kl / n, grad: g };
}

/* ---------- training ---------- */

export type Trained = { params: Params; mode: Mode; klWeight: number; epochs: number; lossHistory: number[] };

export const DEFAULT_EPOCHS = 700;

/** Full-batch Adam. Deterministic for a given seed, data, mode and KL weight. */
export function train(data: Point[], mode: Mode, klWeight: number, seed: number, epochs = DEFAULT_EPOCHS, lr = 0.02): Trained {
  const p = initParams(seed);
  const m = new Float64Array(total);
  const v = new Float64Array(total);
  const r = rng(seed * 31 + 99);
  const lossHistory: number[] = [];
  const b1 = 0.9;
  const b2 = 0.999;
  for (let t = 1; t <= epochs; t++) {
    const eps = data.map(() => gauss(r));
    const { loss, grad } = lossAndGrad(p, data, mode, klWeight, eps);
    for (let i = 0; i < total; i++) {
      m[i] = b1 * m[i] + (1 - b1) * grad[i];
      v[i] = b2 * v[i] + (1 - b2) * grad[i] * grad[i];
      const mh = m[i] / (1 - Math.pow(b1, t));
      const vh = v[i] / (1 - Math.pow(b2, t));
      p[i] -= (lr * mh) / (Math.sqrt(vh) + 1e-8);
    }
    if (t % 10 === 0 || t === epochs) lossHistory.push(loss);
  }
  return { params: p, mode, klWeight, epochs, lossHistory };
}

/* ---------- what a trained model does ---------- */

export type Summary = {
  /** Mean squared reconstruction error on the training points. */
  recon: number;
  /** Mean KL per point (0 for a plain autoencoder, where it is not part of the loss). */
  kl: number;
  /** Latent code of every training point. */
  codes: number[];
  /** Mean and standard deviation of those codes. */
  codeMean: number;
  codeStd: number;
  /** Share of 200 codes drawn from N(0, 1) whose decoded point lies within `NEAR` of a real point. */
  priorOnData: number;
};

/** A decoded point counts as "near real data" when it is within this distance of a training point. */
export const NEAR = 0.6;

function nearest(data: Point[], q: Point): number {
  let best = Infinity;
  for (const d of data) {
    const dx = d[0] - q[0];
    const dy = d[1] - q[1];
    const dd = dx * dx + dy * dy;
    if (dd < best) best = dd;
  }
  return Math.sqrt(best);
}

/** Decode `n` seeded draws from N(0, 1). */
export function priorSamples(p: Params, n: number, seed: number): { z: number; point: Point }[] {
  const r = rng(seed * 977 + 11);
  return Array.from({ length: n }, () => {
    const z = gauss(r);
    return { z, point: decode(p, z) };
  });
}

export function summarise(t: Trained, data: Point[]): Summary {
  const codes: number[] = [];
  let recon = 0;
  let kl = 0;
  for (const x of data) {
    const { mu, lv } = encode(t.params, x);
    codes.push(mu);
    const d = decode(t.params, mu);
    recon += (d[0] - x[0]) ** 2 + (d[1] - x[1]) ** 2;
    if (t.mode === 'vae') kl += klGauss(mu, lv);
  }
  const n = data.length;
  const codeMean = codes.reduce((a, b) => a + b, 0) / n;
  const codeStd = Math.sqrt(codes.reduce((a, b) => a + (b - codeMean) ** 2, 0) / n);
  const draws = priorSamples(t.params, 200, 1);
  const hit = draws.filter((s) => nearest(data, s.point) <= NEAR).length;
  return { recon: recon / n, kl: kl / n, codes, codeMean, codeStd, priorOnData: hit / draws.length };
}
