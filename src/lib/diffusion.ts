/*
 * A toy 2D diffusion model for the "How image generators work" lesson.
 *
 * The data are points drawn from a simple shape (a ring, two blobs or two spiral arms),
 * written as a mixture of small round Gaussians. For a mixture of Gaussians the effect of
 * the forward noising has a closed form, so the network a real system would LEARN can be
 * written down exactly here. That exact function is a stand-in for the learned network:
 * it is what a perfectly trained denoiser would output for this one tiny dataset. Real
 * models learn an approximation of it from millions of pictures.
 *
 * Everything is deterministic: the same seed gives the same points and the same noise.
 */

export type Vec2 = [number, number];

/** Number of steps in the noising schedule, as in the original DDPM paper. */
export const T = 1000;
const BETA_1 = 1e-4;
const BETA_T = 0.02;

/** abar[t] is the fraction of the original signal's variance left after t noising steps (linear beta schedule). */
const ABAR: number[] = (() => {
  const out = [1];
  for (let t = 1; t <= T; t++) {
    const beta = BETA_1 + ((BETA_T - BETA_1) * (t - 1)) / (T - 1);
    out.push(out[t - 1] * (1 - beta));
  }
  return out;
})();

export function alphaBar(t: number): number {
  return ABAR[Math.max(0, Math.min(T, Math.round(t)))];
}

/* ---------- seeded randomness ---------- */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal numbers from a uniform generator (Box-Muller). */
export function gaussian(rand: () => number): () => number {
  return () => {
    const u = Math.max(rand(), 1e-12);
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
}

/* ---------- the toy shapes ---------- */

export type Group = 'a' | 'b';
export type ShapeId = 'ring' | 'blobs' | 'spiral';

export interface Shape {
  id: ShapeId;
  label: string;
  /** Standard deviation of each little round blob the shape is built from. */
  sigma: number;
  means: Vec2[];
  /** Which "prompt" each blob belongs to. */
  group: Group[];
  /** Plain-words names for the two prompts. */
  prompts: { a: string; b: string };
}

function ring(): Shape {
  const n = 28;
  const means: Vec2[] = [];
  const group: Group[] = [];
  for (let i = 0; i < n; i++) {
    const ang = (2 * Math.PI * i) / n;
    const m: Vec2 = [Math.cos(ang), Math.sin(ang)];
    means.push(m);
    group.push(m[0] >= 0 ? 'a' : 'b');
  }
  return { id: 'ring', label: 'Ring', sigma: 0.09, means, group, prompts: { a: 'right half', b: 'left half' } };
}

function blobs(): Shape {
  return {
    id: 'blobs',
    label: 'Two blobs',
    sigma: 0.2,
    means: [
      [-1, 0.35],
      [1, -0.35],
    ],
    group: ['a', 'b'],
    prompts: { a: 'left blob', b: 'right blob' },
  };
}

function spiral(): Shape {
  const per = 14;
  const means: Vec2[] = [];
  const group: Group[] = [];
  for (const [g, phase] of [['a', 0], ['b', Math.PI]] as const) {
    for (let i = 0; i < per; i++) {
      const s = i / (per - 1);
      const r = 0.25 + 0.95 * s;
      const ang = phase + 2.6 * Math.PI * s;
      means.push([r * Math.cos(ang), r * Math.sin(ang)]);
      group.push(g);
    }
  }
  return { id: 'spiral', label: 'Two spirals', sigma: 0.075, means, group, prompts: { a: 'first arm', b: 'second arm' } };
}

export const SHAPES: Record<ShapeId, Shape> = { ring: ring(), blobs: blobs(), spiral: spiral() };
export const SHAPE_IDS: ShapeId[] = ['ring', 'blobs', 'spiral'];

/** Which prompt steers the denoiser: none (unconditional), or one of the shape's two groups. */
export type Prompt = 'none' | Group;

/** Draw n points from the shape, spread evenly over its blobs. Returns a flat [x0, y0, x1, y1, ...] array. */
export function sampleData(shape: Shape, n: number, seed: number): Float64Array {
  const rand = mulberry32(seed);
  const g = gaussian(rand);
  const out = new Float64Array(2 * n);
  for (let i = 0; i < n; i++) {
    const m = shape.means[i % shape.means.length];
    out[2 * i] = m[0] + shape.sigma * g();
    out[2 * i + 1] = m[1] + shape.sigma * g();
  }
  return out;
}

/** One standard-normal noise value per coordinate. */
export function sampleNoise(n: number, seed: number): Float64Array {
  const g = gaussian(mulberry32(seed));
  const out = new Float64Array(2 * n);
  for (let i = 0; i < out.length; i++) out[i] = g();
  return out;
}

/** The forward process in one jump: x_t = sqrt(abar) * x0 + sqrt(1 - abar) * noise. */
export function addNoise(x0: Float64Array, noise: Float64Array, t: number): Float64Array {
  const a = alphaBar(t);
  const s = Math.sqrt(a);
  const n = Math.sqrt(1 - a);
  const out = new Float64Array(x0.length);
  for (let i = 0; i < out.length; i++) out[i] = s * x0[i] + n * noise[i];
  return out;
}

/* ---------- the stand-in denoiser ---------- */

/**
 * What a perfect network would output for one point: its guess of the noise that was mixed in.
 * After noising, each blob is still a round Gaussian (centre scaled by sqrt(abar), variance
 * abar*sigma^2 + 1 - abar), so the answer follows from Bayes' rule over the blobs.
 * `prompt` restricts the blobs to one group (the "conditional" network); 'none' uses all.
 */
export function predictNoise(shape: Shape, x: number, y: number, t: number, prompt: Prompt): Vec2 {
  const a = alphaBar(t);
  const root = Math.sqrt(a);
  const v = a * shape.sigma * shape.sigma + (1 - a);
  const logs: number[] = [];
  const ids: number[] = [];
  let best = -Infinity;
  for (let k = 0; k < shape.means.length; k++) {
    if (prompt !== 'none' && shape.group[k] !== prompt) continue;
    const dx = x - root * shape.means[k][0];
    const dy = y - root * shape.means[k][1];
    const lw = -(dx * dx + dy * dy) / (2 * v);
    logs.push(lw);
    ids.push(k);
    if (lw > best) best = lw;
  }
  let z = 0;
  const w = logs.map((l) => {
    const e = Math.exp(l - best);
    z += e;
    return e;
  });
  let ex = 0;
  let ey = 0;
  for (let j = 0; j < ids.length; j++) {
    const k = ids[j];
    const r = w[j] / z;
    ex += (r * (x - root * shape.means[k][0])) / v;
    ey += (r * (y - root * shape.means[k][1])) / v;
  }
  const s = Math.sqrt(1 - a);
  return [s * ex, s * ey];
}

/** Classifier-free guidance: start from the unprompted guess and push w times further towards the prompted one. */
export function guidedNoise(shape: Shape, x: number, y: number, t: number, prompt: Prompt, guidance: number): Vec2 {
  const u = predictNoise(shape, x, y, t, 'none');
  if (prompt === 'none') return u;
  const c = predictNoise(shape, x, y, t, prompt);
  return [u[0] + guidance * (c[0] - u[0]), u[1] + guidance * (c[1] - u[1])];
}

/* ---------- the reverse process ---------- */

/** The noise levels visited by a sampler with `steps` steps, from T down to 0. */
export function timesteps(steps: number): number[] {
  const s = Math.max(1, Math.round(steps));
  const out: number[] = [];
  for (let i = 0; i <= s; i++) out.push(Math.round((T * (s - i)) / s));
  return out;
}

export interface SampleOptions {
  steps: number;
  prompt: Prompt;
  guidance: number;
  /** 0 = deterministic (DDIM-style). 1 = adds fresh randomness at every step (DDPM-style). */
  randomness: 0 | 1;
  seed: number;
}

/**
 * Run the reverse process. Returns the points at every step: states[0] is the starting noise
 * and states[steps] is the finished sample. Each step asks the denoiser for its noise guess,
 * works out what the clean picture would be, and moves part of the way there.
 */
export function denoise(shape: Shape, start: Float64Array, opts: SampleOptions): Float64Array[] {
  const ts = timesteps(opts.steps);
  const rand = gaussian(mulberry32(opts.seed ^ 0x9e3779b9));
  const n = start.length / 2;
  const states: Float64Array[] = [Float64Array.from(start)];
  let x = Float64Array.from(start);
  for (let i = 0; i < ts.length - 1; i++) {
    const t = ts[i];
    const tNext = ts[i + 1];
    const a = alphaBar(t);
    const aNext = alphaBar(tNext);
    const sigma = opts.randomness * Math.sqrt((1 - aNext) / (1 - a)) * Math.sqrt(1 - a / aNext);
    const keep = Math.sqrt(Math.max(0, 1 - aNext - sigma * sigma));
    const next = new Float64Array(2 * n);
    for (let p = 0; p < n; p++) {
      const e = guidedNoise(shape, x[2 * p], x[2 * p + 1], t, opts.prompt, opts.guidance);
      for (let d = 0; d < 2; d++) {
        const x0 = (x[2 * p + d] - Math.sqrt(1 - a) * e[d]) / Math.sqrt(a);
        next[2 * p + d] = Math.sqrt(aNext) * x0 + keep * e[d] + (sigma > 0 ? sigma * rand() : 0);
      }
    }
    x = next;
    states.push(x);
  }
  return states;
}

/* ---------- a plain measure of "did it land on the shape" ---------- */

/** Share of points within 2.5 blob-widths of the shape. A fresh sample of the shape scores about 95 to 100 percent. */
export function inShape(shape: Shape, pts: Float64Array): number {
  const n = pts.length / 2;
  const reach = 2.5 * shape.sigma;
  let hit = 0;
  for (let p = 0; p < n; p++) {
    let near = Infinity;
    for (const m of shape.means) near = Math.min(near, Math.hypot(pts[2 * p] - m[0], pts[2 * p + 1] - m[1]));
    if (near <= reach) hit++;
  }
  return hit / n;
}

/** Share of points that sit on the prompted side (group). Used to show a prompt being followed. */
export function onPromptSide(shape: Shape, pts: Float64Array, prompt: Group): number {
  const n = pts.length / 2;
  let hit = 0;
  for (let p = 0; p < n; p++) {
    let best = Infinity;
    let g: Group = 'a';
    for (let k = 0; k < shape.means.length; k++) {
      const d = Math.hypot(pts[2 * p] - shape.means[k][0], pts[2 * p + 1] - shape.means[k][1]);
      if (d < best) {
        best = d;
        g = shape.group[k];
      }
    }
    if (g === prompt) hit++;
  }
  return hit / n;
}

/** Average distance of the points from their own centre of mass: shrinks when samples collapse to one blurry average. */
export function spread(pts: Float64Array): number {
  const n = pts.length / 2;
  let cx = 0;
  let cy = 0;
  for (let p = 0; p < n; p++) {
    cx += pts[2 * p];
    cy += pts[2 * p + 1];
  }
  cx /= n;
  cy /= n;
  let s = 0;
  for (let p = 0; p < n; p++) s += Math.hypot(pts[2 * p] - cx, pts[2 * p + 1] - cy);
  return s / n;
}

/** Choices offered on the steps slider. */
export const STEP_CHOICES = [1, 2, 3, 5, 10, 20, 50] as const;
