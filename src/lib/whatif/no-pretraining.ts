/**
 * What if we train from scratch instead of starting from a pretrained model?
 * A TOY version of transfer learning, small enough to run in the browser.
 *
 * The world: each example is 40 numbers. Only 3 hidden factors decide the labels; 5 other factors swing the numbers
 * around a lot but mean nothing, and there is some plain noise on top.
 * Step 1 (pretraining): a small network learns to predict 6 related quantities from a big labelled set (600 examples).
 *   Its hidden layer becomes a feature extractor that has learned which directions matter and which to ignore.
 * Step 2 (the new task): a different labelling of the same world, with only a handful of labelled examples.
 *   "From scratch" trains a fresh network. "Pretrained" keeps the learned features and trains only a new output on top.
 * Everything is seeded, so the page and the tests agree.
 */

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(r: () => number): number {
  return Math.sqrt(-2 * Math.log(Math.max(r(), 1e-12))) * Math.cos(2 * Math.PI * r());
}

export const DIM = 40;
export const FACTORS = 3;
export const HIDDEN = 6;
export const RELATED_TASKS = 6;
export const PRETRAIN_EXAMPLES = 600;
export const NOISE = 1.0;
export const PRETRAIN_EPOCHS = 300;
export const EPOCHS = 100;
export const EVERY = 5;
export const SIZES = [4, 8, 16, 32, 64] as const;
export const TRIALS = 8;

/** The fixed way the 3 hidden factors are mixed into 12 numbers. */
function mixing(): number[][] {
  const r = rng(101);
  return Array.from({ length: DIM }, () => Array.from({ length: FACTORS }, () => gauss(r)));
}
const MIX = mixing();

/** Nuisance factors: big swings in the input that have nothing to do with any label. */
export const NUISANCE = 5;
export const NUISANCE_SCALE = 3;
const NMIX = (() => {
  const r = rng(202);
  return Array.from({ length: DIM }, () => Array.from({ length: NUISANCE }, () => gauss(r)));
})();

type Example = { x: number[]; z: number[] };

function draw(n: number, r: () => number): Example[] {
  return Array.from({ length: n }, () => {
    const z = Array.from({ length: FACTORS }, () => gauss(r));
    const u = Array.from({ length: NUISANCE }, () => NUISANCE_SCALE * gauss(r));
    const x = MIX.map((row, j) => row.reduce((s, m, k) => s + m * z[k], 0) + NMIX[j].reduce((s, m, k) => s + m * u[k], 0) + NOISE * gauss(r));
    return { x, z };
  });
}

function unit(r: () => number): number[] {
  const v = Array.from({ length: FACTORS }, () => gauss(r));
  const n = Math.sqrt(v.reduce((s, a) => s + a * a, 0));
  return v.map((a) => a / n);
}

export const label = (w: number[], z: number[]) => (w.reduce((s, a, k) => s + a * z[k], 0) > 0 ? 1 : 0);
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

export type Extractor = { w: number[][]; b: number[] }; // HIDDEN x DIM

export function features(f: Extractor, x: number[]): number[] {
  return f.w.map((row, h) => Math.tanh(row.reduce((s, w, i) => s + w * x[i], f.b[h])));
}

/** Train `outputs` sigmoid units on top of a tanh hidden layer. `trainHidden` false keeps the hidden layer as given. */
function fitNet(
  X: number[][],
  Y: number[][],
  hidden: Extractor,
  head: { w: number[][]; b: number[] },
  epochs: number,
  lr: number,
  trainHidden: boolean,
  regress = false,
) {
  const n = X.length;
  const feats = trainHidden ? null : X.map((x) => features(hidden, x));
  for (let e = 0; e < epochs; e++) {
    const gW1 = hidden.w.map((r) => r.map(() => 0));
    const gb1 = hidden.b.map(() => 0);
    const gW2 = head.w.map((r) => r.map(() => 0));
    const gb2 = head.b.map(() => 0);
    for (let k = 0; k < n; k++) {
      const h = feats ? feats[k] : features(hidden, X[k]);
      const out = head.w.map((row, o) => {
        const z = row.reduce((s, w, i) => s + w * h[i], head.b[o]);
        return regress ? z : sigmoid(z);
      });
      const d2 = out.map((p, o) => p - Y[k][o]);
      d2.forEach((d, o) => {
        gb2[o] += d;
        for (let i = 0; i < HIDDEN; i++) gW2[o][i] += d * h[i];
      });
      if (trainHidden) {
        for (let i = 0; i < HIDDEN; i++) {
          const back = d2.reduce((s, d, o) => s + d * head.w[o][i], 0) * (1 - h[i] * h[i]);
          gb1[i] += back;
          for (let j = 0; j < DIM; j++) gW1[i][j] += back * X[k][j];
        }
      }
    }
    head.w.forEach((row, o) => row.forEach((_, i) => (row[i] -= (lr * gW2[o][i]) / n)));
    head.b.forEach((_, o) => (head.b[o] -= (lr * gb2[o]) / n));
    if (trainHidden) {
      hidden.w.forEach((row, i) => row.forEach((_, j) => (row[j] -= (lr * gW1[i][j]) / n)));
      hidden.b.forEach((_, i) => (hidden.b[i] -= (lr * gb1[i]) / n));
    }
  }
}

function randomExtractor(r: () => number): Extractor {
  const s = Math.sqrt(1 / DIM);
  return { w: Array.from({ length: HIDDEN }, () => Array.from({ length: DIM }, () => gauss(r) * s)), b: Array(HIDDEN).fill(0) };
}

/** Step 1: learn features from the big related task. */
export function pretrain(seed = 7): Extractor {
  const r = rng(seed);
  const data = draw(PRETRAIN_EXAMPLES, r);
  const tasks = Array.from({ length: RELATED_TASKS }, () => unit(r));
  const hidden = randomExtractor(r);
  const head = { w: Array.from({ length: RELATED_TASKS }, () => Array.from({ length: HIDDEN }, () => gauss(r) * 0.3)), b: Array(RELATED_TASKS).fill(0) };
  fitNet(
    data.map((d) => d.x),
    data.map((d) => tasks.map((w) => w.reduce((s, a, k) => s + a * d.z[k], 0))),
    hidden,
    head,
    PRETRAIN_EPOCHS,
    0.15,
    true,
    true,
  );
  return hidden;
}

/** Test accuracy of "features then a one-unit output" on examples it has never seen. */
function accuracyOf(hidden: Extractor, head: { w: number[][]; b: number[] }, test: { x: number[]; y: number }[]): number {
  let ok = 0;
  for (const t of test) {
    const h = features(hidden, t.x);
    const s = head.w[0].reduce((a, w, i) => a + w * h[i], head.b[0]);
    if ((s > 0 ? 1 : 0) === t.y) ok++;
  }
  return ok / test.length;
}

export type Curve = { epochs: number[]; scratch: number[]; pretrained: number[] };

/**
 * Learning curves on a new task with `labelled` examples: test accuracy after every EVERY epochs,
 * averaged over TRIALS different new tasks. The pretrained run keeps the features and trains only the output.
 */
export function learningCurve(labelled: number, extractor: Extractor, trials = TRIALS): Curve {
  const epochs = Array.from({ length: EPOCHS / EVERY + 1 }, (_, i) => i * EVERY);
  const scratch = epochs.map(() => 0);
  const pre = epochs.map(() => 0);
  for (let t = 0; t < trials; t++) {
    const r = rng(1000 + 17 * t + labelled);
    const w = unit(r);
    const train = draw(labelled, r);
    const test = draw(300, r).map((d) => ({ x: d.x, y: label(w, d.z) }));
    const X = train.map((d) => d.x);
    const Y = train.map((d) => [label(w, d.z)]);

    const sh = randomExtractor(r);
    const sHead = { w: [Array.from({ length: HIDDEN }, () => gauss(r) * 0.3)], b: [0] };
    scratch[0] += accuracyOf(sh, sHead, test);
    const ph: Extractor = { w: extractor.w.map((row) => row.slice()), b: extractor.b.slice() };
    const pHead = { w: [Array.from({ length: HIDDEN }, () => gauss(r) * 0.3)], b: [0] };
    pre[0] += accuracyOf(ph, pHead, test);

    for (let c = 1; c < epochs.length; c++) {
      fitNet(X, Y, sh, sHead, EVERY, 0.3, true);
      fitNet(X, Y, ph, pHead, EVERY, 0.3, false);
      scratch[c] += accuracyOf(sh, sHead, test);
      pre[c] += accuracyOf(ph, pHead, test);
    }
  }
  return { epochs, scratch: scratch.map((a) => a / trials), pretrained: pre.map((a) => a / trials) };
}

/** Pretrain once, then the learning curves for every labelled-set size. About half a second of arithmetic. */
export function runAll(): { extractor: Extractor; curves: Curve[] } {
  const extractor = pretrain();
  return { extractor, curves: SIZES.map((n) => learningCurve(n, extractor)) };
}

/** Accuracy at the end of training. */
export const finalAccuracy = (c: Curve) => ({ scratch: c.scratch[c.scratch.length - 1], pretrained: c.pretrained[c.pretrained.length - 1] });
