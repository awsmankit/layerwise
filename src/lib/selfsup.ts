/**
 * Two toys for the lesson "Self-supervised and transfer learning".
 *
 * Toy data: every item has four numbers. Two of them (the "content") tell you which of three hidden classes it
 * belongs to; the other two (the "background") are random and say nothing about the class, like the colour of a
 * table behind a photographed object. A "view" of an item is the same item after augmentation: the content is
 * nudged a little and the background is scrambled by an amount you choose.
 *
 * Contrastive learning trains a small linear encoder (4 numbers in, 2 out) so that the two views of one item
 * get similar outputs and views of different items do not (the InfoNCE loss, as in SimCLR). The class labels are
 * never used for training. They are used only to score the result. Everything is deterministic.
 */

export const DIM = 4;
export const OUT = 2;
export const CLASSES = 3;
export const BACKGROUND_SPREAD = 3;
export const CONTENT_SPREAD = 0.35;
export const VIEW_NOISE = 0.1;

/** A small seeded random generator (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const normal = () => {
    const u = Math.max(next(), 1e-12);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
  };
  return { next, normal };
}

export type Domain = 'source' | 'shifted';
export type Item = { x: number[]; cls: number };

/** Class centres on a circle of radius 1 (angles 90, 210 and 330 degrees). */
export const CENTRES: [number, number][] = [0, 1, 2].map((k) => {
  const a = Math.PI / 2 + (k * 2 * Math.PI) / 3;
  return [Math.cos(a), Math.sin(a)];
});

/**
 * Make `n` items, round-robin over the classes. In the `source` domain the class lives in dims 0 and 1; in the
 * `shifted` domain it lives in dims 2 and 3 and dims 0 and 1 are the random background.
 */
export function makeItems(n: number, seed: number, domain: Domain = 'source'): Item[] {
  const r = rng(seed);
  const items: Item[] = [];
  for (let i = 0; i < n; i++) {
    const cls = i % CLASSES;
    const content = [CENTRES[cls][0] + CONTENT_SPREAD * r.normal(), CENTRES[cls][1] + CONTENT_SPREAD * r.normal()];
    const background = [BACKGROUND_SPREAD * r.normal(), BACKGROUND_SPREAD * r.normal()];
    items.push({ x: domain === 'source' ? [...content, ...background] : [...background, ...content], cls });
  }
  return items;
}

/**
 * One augmented view of an item. `aug` runs from 0 (the background is copied exactly) to 1 (the background is
 * thrown away and redrawn). In between, the redraw is mixed in so the background keeps its overall spread.
 */
export function makeView(item: Item, aug: number, r: ReturnType<typeof rng>, domain: Domain = 'source'): number[] {
  const keep = Math.sqrt(Math.max(0, 1 - aug * aug));
  const bgIdx = domain === 'source' ? [2, 3] : [0, 1];
  const out = item.x.map((v) => v + VIEW_NOISE * r.normal());
  for (const i of bgIdx) out[i] = keep * item.x[i] + aug * BACKGROUND_SPREAD * r.normal();
  return out;
}

export type Pair = [number[], number[]];
export function makePairs(items: Item[], aug: number, seed: number): Pair[] {
  const r = rng(seed);
  return items.map((it) => [makeView(it, aug, r), makeView(it, aug, r)]);
}

/* ---------- the encoder and the loss ---------- */

export type Weights = number[][]; // OUT rows of DIM numbers

export function initWeights(seed: number): Weights {
  const r = rng(seed);
  return Array.from({ length: OUT }, () => Array.from({ length: DIM }, () => 0.6 * r.normal()));
}

export const project = (W: Weights, x: number[]) => W.map((row) => row.reduce((s, w, j) => s + w * x[j], 0));
const norm = (v: number[]) => Math.hypot(...v);
const unit = (v: number[]) => {
  const n = norm(v) || 1;
  return v.map((a) => a / n);
};
const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);

/** The embedding of x: its direction after the linear map. */
export const embed = (W: Weights, x: number[]) => unit(project(W, x));

/**
 * InfoNCE (NT-Xent) over 2N views, where view 2k and 2k+1 belong to the same item. For each anchor, the loss is
 * minus the log of: (similarity to its partner, sharpened by the temperature) divided by (the same for every
 * other view). Returns the average loss and its gradient with respect to the weights.
 */
export function infoNce(W: Weights, pairs: Pair[], tau: number): { loss: number; grad: Weights } {
  const xs = pairs.flatMap((p) => [p[0], p[1]]);
  const m = xs.length;
  const zs = xs.map((x) => project(W, x));
  const ns = zs.map((z) => norm(z) || 1e-9);
  const us = zs.map((z, i) => z.map((a) => a / ns[i]));
  const partner = (a: number) => a ^ 1;

  const G: number[][] = Array.from({ length: m }, () => new Array(m).fill(0)); // dLoss/d s_ak, per anchor a
  let loss = 0;
  for (let a = 0; a < m; a++) {
    const sims = us.map((u, k) => (k === a ? -Infinity : dot(us[a], u) / tau));
    const top = Math.max(...sims);
    let denom = 0;
    for (let k = 0; k < m; k++) if (k !== a) denom += Math.exp(sims[k] - top);
    const logDen = top + Math.log(denom);
    loss += logDen - sims[partner(a)];
    for (let k = 0; k < m; k++) {
      if (k === a) continue;
      G[a][k] = (Math.exp(sims[k] - top) / denom - (k === partner(a) ? 1 : 0)) / (tau * m);
    }
  }
  loss /= m;

  const grad: Weights = Array.from({ length: OUT }, () => new Array(DIM).fill(0));
  for (let a = 0; a < m; a++) {
    // gradient with respect to the unit vector of a: every pair (a, k) counts once from each side
    const du = new Array(OUT).fill(0);
    for (let k = 0; k < m; k++) {
      if (k === a) continue;
      const c = G[a][k] + G[k][a];
      for (let d = 0; d < OUT; d++) du[d] += c * us[k][d];
    }
    // through the normalisation: (I - u u^T) / |z|
    const along = dot(du, us[a]);
    for (let d = 0; d < OUT; d++) {
      const dz = (du[d] - along * us[a][d]) / ns[a];
      for (let j = 0; j < DIM; j++) grad[d][j] += dz * xs[a][j];
    }
  }
  return { loss, grad };
}

/** Adam, written out so the toy has no dependencies. */
export type Trainer = { W: Weights; m: Weights; v: Weights; t: number; loss: number };
export const newTrainer = (seed: number): Trainer => ({
  W: initWeights(seed),
  m: Array.from({ length: OUT }, () => new Array(DIM).fill(0)),
  v: Array.from({ length: OUT }, () => new Array(DIM).fill(0)),
  t: 0,
  loss: NaN,
});

export const LR = 0.05;

/** One training step on a fresh augmentation of the items (the seed for the draw comes from the step number). */
export function trainStep(tr: Trainer, items: Item[], aug: number, tau: number, seed: number): Trainer {
  const pairs = makePairs(items, aug, seed * 1000 + tr.t + 1);
  const { loss, grad } = infoNce(tr.W, pairs, tau);
  const t = tr.t + 1;
  const b1 = 0.9;
  const b2 = 0.999;
  const W = tr.W.map((r) => [...r]);
  const m = tr.m.map((r) => [...r]);
  const v = tr.v.map((r) => [...r]);
  for (let d = 0; d < OUT; d++)
    for (let j = 0; j < DIM; j++) {
      m[d][j] = b1 * m[d][j] + (1 - b1) * grad[d][j];
      v[d][j] = b2 * v[d][j] + (1 - b2) * grad[d][j] ** 2;
      const mh = m[d][j] / (1 - b1 ** t);
      const vh = v[d][j] / (1 - b2 ** t);
      W[d][j] -= (LR * mh) / (Math.sqrt(vh) + 1e-8);
    }
  return { W, m, v, t, loss };
}

export function train(tr: Trainer, items: Item[], aug: number, tau: number, seed: number, steps: number): Trainer {
  let cur = tr;
  for (let i = 0; i < steps; i++) cur = trainStep(cur, items, aug, tau, seed);
  return cur;
}

/* ---------- scoring (uses the hidden labels; training never does) ---------- */

/** The share of items whose nearest neighbour (by cosine, among the other items, as first drawn) has the same class. */
export function neighbourPurity(W: Weights, items: Item[]): number {
  const zs = items.map((it) => embed(W, it.x));
  let ok = 0;
  for (let a = 0; a < items.length; a++) {
    let best = -2;
    let who = -1;
    for (let b = 0; b < items.length; b++) {
      if (b === a) continue;
      const s = dot(zs[a], zs[b]);
      if (s > best) {
        best = s;
        who = b;
      }
    }
    if (items[who].cls === items[a].cls) ok++;
  }
  return ok / items.length;
}

/** Angle in degrees between the two views of each item in the embedding, averaged. Small means the views agree. */
export function meanPairAngle(W: Weights, pairs: Pair[]): number {
  let s = 0;
  for (const [a, b] of pairs) s += Math.acos(Math.max(-1, Math.min(1, dot(embed(W, a), embed(W, b))))) * (180 / Math.PI);
  return s / pairs.length;
}

/** How much of the encoder's weight (squared) sits on the two background inputs, 0 to 1. */
export function backgroundShare(W: Weights, domain: Domain = 'source'): number {
  const idx = domain === 'source' ? [2, 3] : [0, 1];
  let bg = 0;
  let all = 0;
  for (const row of W)
    for (let j = 0; j < DIM; j++) {
      all += row[j] ** 2;
      if (idx.includes(j)) bg += row[j] ** 2;
    }
  return all === 0 ? 0 : bg / all;
}

/** Column norms of the encoder, one per input. */
export const inputWeights = (W: Weights) => Array.from({ length: DIM }, (_, j) => Math.hypot(...W.map((r) => r[j])));

/** InfoNCE for one anchor from a list of similarities, worked by hand in the lesson. */
export function infoNceOne(positive: number, negatives: number[], tau: number): number {
  const all = [positive, ...negatives].map((s) => Math.exp(s / tau));
  return -Math.log(all[0] / all.reduce((a, b) => a + b, 0));
}

/* ---------- transfer: a frozen feature map against training from scratch ---------- */

/** Softmax regression trained by plain gradient descent, with a small weight penalty. Features in, class out. */
export function fitSoftmax(feats: number[][], labels: number[], iters = 100, lr = 1, l2 = 0.01): number[][] {
  const d = feats[0].length + 1; // plus a bias
  const Wc: number[][] = Array.from({ length: CLASSES }, () => new Array(d).fill(0));
  const n = feats.length;
  for (let it = 0; it < iters; it++) {
    const g: number[][] = Array.from({ length: CLASSES }, () => new Array(d).fill(0));
    for (let i = 0; i < n; i++) {
      const x = [...feats[i], 1];
      const logits = Wc.map((w) => dot(w, x));
      const top = Math.max(...logits);
      const e = logits.map((l) => Math.exp(l - top));
      const s = e.reduce((a, b) => a + b, 0);
      for (let c = 0; c < CLASSES; c++) {
        const p = e[c] / s - (labels[i] === c ? 1 : 0);
        for (let j = 0; j < d; j++) g[c][j] += (p * x[j]) / n;
      }
    }
    for (let c = 0; c < CLASSES; c++) for (let j = 0; j < d; j++) Wc[c][j] -= lr * (g[c][j] + l2 * Wc[c][j]);
  }
  return Wc;
}

export function predict(Wc: number[][], f: number[]): number {
  const x = [...f, 1];
  let best = 0;
  let bestV = -Infinity;
  Wc.forEach((w, c) => {
    const v = dot(w, x);
    if (v > bestV) {
      bestV = v;
      best = c;
    }
  });
  return best;
}

export const accuracy = (Wc: number[][], feats: number[][], labels: number[]) => feats.filter((f, i) => predict(Wc, f) === labels[i]).length / feats.length;

export const LABEL_COUNTS = [3, 6, 12, 24, 48, 96];
export const TEST_SIZE = 300;
export const DRAWS = 16;

export type Curve = { n: number; frozen: number; scratch: number }[];

/** The feature map used by the "frozen" side: the encoder's unit vector, scaled by 2 so a linear head can use it. */
export const frozenFeatures = (W: Weights, x: number[]) => embed(W, x).map((v) => 2 * v);

/**
 * Accuracy against the number of labelled examples, averaged over `DRAWS` random draws of the labelled set.
 * Both sides use the same head (softmax regression) and the same training budget; only the input differs:
 * the frozen, pretrained feature map, or the raw four numbers.
 */
export function transferCurve(W: Weights, domain: Domain, seed = 7): Curve {
  const test = makeItems(TEST_SIZE, seed + 1000, domain);
  const testY = test.map((t) => t.cls);
  const testRaw = test.map((t) => t.x);
  const testFrozen = testRaw.map((x) => frozenFeatures(W, x));
  return LABEL_COUNTS.map((n) => {
    let f = 0;
    let s = 0;
    for (let d = 0; d < DRAWS; d++) {
      const pool = makeItems(n, seed * 31 + d * 977 + n, domain);
      const y = pool.map((p) => p.cls);
      const raw = pool.map((p) => p.x);
      f += accuracy(fitSoftmax(raw.map((x) => frozenFeatures(W, x)), y), testFrozen, testY);
      s += accuracy(fitSoftmax(raw, y), testRaw, testY);
    }
    return { n, frozen: f / DRAWS, scratch: s / DRAWS };
  });
}

/** Pretrain a feature map once: contrastive training on unlabelled items from the source domain. */
export function pretrain(aug = 1, tau = 0.5, steps = 150, seed = 7): Weights {
  const items = makeItems(36, seed);
  return train(newTrainer(seed), items, aug, tau, seed, steps).W;
}
