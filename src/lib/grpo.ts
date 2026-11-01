/**
 * A toy of group-relative policy optimisation (GRPO) for the "Post-training with
 * reinforcement learning" lesson.
 *
 * The "policy" is a softmax over a handful of whole answers to one prompt, so everything can
 * be computed exactly and checked by hand. A real language model chooses hundreds of tokens
 * per answer; the algebra below is the same, applied per token.
 *
 *  - Advantage of sample i in a group of k:  A_i = (r_i - mean(r)) / std(r)
 *    (DeepSeekMath, DeepSeek-R1). The standard deviation here is the sample one (divide by
 *    k - 1), which is what the Hugging Face TRL library computes; the papers do not say.
 *    If every reward in the group is equal the std is 0 and all advantages are set to 0.
 *  - Clipped objective per sample:  min(ratio x A, clip(ratio, 1 - eps, 1 + eps) x A),
 *    where ratio = pi_theta(answer) / pi_old(answer).
 *  - KL leash: beta x KL(pi_theta || pi_ref). Here the exact KL over the few answers is used;
 *    real implementations estimate it per token from samples.
 */

export type Stats = { mean: number; std: number; advantages: number[] };

/** Group mean, sample standard deviation and advantages for a list of rewards. */
export function groupStats(rewards: number[]): Stats {
  const k = rewards.length;
  if (k === 0) return { mean: 0, std: 0, advantages: [] };
  const mean = rewards.reduce((a, b) => a + b, 0) / k;
  if (k < 2) return { mean, std: 0, advantages: [0] };
  const std = Math.sqrt(rewards.reduce((a, r) => a + (r - mean) ** 2, 0) / (k - 1));
  const advantages = rewards.map((r) => (std === 0 ? 0 : (r - mean) / std));
  return { mean, std, advantages };
}

export function softmax(logits: number[]): number[] {
  const m = Math.max(...logits);
  const e = logits.map((x) => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
}

export const logitsFromProbs = (probs: number[]) => probs.map((p) => Math.log(p));

/** KL(p || q) in nats. */
export function kl(p: number[], q: number[]): number {
  let s = 0;
  for (let i = 0; i < p.length; i++) if (p[i] > 0) s += p[i] * Math.log(p[i] / q[i]);
  return s;
}

/** A small seeded random number generator, so a drawn group can be reproduced. */
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

/** Draw k answer indices from the policy. */
export function sampleGroup(probs: number[], k: number, seed: number): number[] {
  const rand = rng(seed);
  const out: number[] = [];
  for (let i = 0; i < k; i++) {
    let u = rand();
    let j = 0;
    for (; j < probs.length - 1; j++) {
      u -= probs[j];
      if (u < 0) break;
    }
    out.push(j);
  }
  return out;
}

/** The clipped surrogate for one sample (PPO and GRPO share it). */
export function clippedTerm(ratio: number, advantage: number, eps: number): number {
  const clipped = Math.min(Math.max(ratio, 1 - eps), 1 + eps);
  return Math.min(ratio * advantage, clipped * advantage);
}

/** True when the clip removes this sample's gradient: it already moved as far as allowed in the direction the advantage wants. */
export function isClipped(ratio: number, advantage: number, eps: number): boolean {
  return (advantage > 0 && ratio > 1 + eps) || (advantage < 0 && ratio < 1 - eps);
}

export type UpdateOptions = {
  /** Clip range, 0.2 in PPO. */
  eps: number;
  /** KL penalty weight. */
  beta: number;
  learningRate: number;
  /** Gradient steps taken on the same group (mu in the GRPO paper). */
  inner: number;
};

export type UpdateResult = {
  logits: number[];
  advantages: number[];
  /** pi_theta / pi_old for each sample after the last inner step. */
  ratios: number[];
  /** Samples whose gradient was cut by the clip at the last inner step. */
  clipped: number;
};

/**
 * Apply GRPO updates for one group. At the start (ratio 1, policy equal to the reference) the
 * gradient on answer j's logit is lr x (sum of the advantages of the samples that chose j) / k.
 */
export function grpoUpdate(
  logits: number[],
  refLogits: number[],
  group: number[],
  rewards: number[],
  opts: UpdateOptions,
): UpdateResult {
  const k = group.length;
  const { advantages } = groupStats(rewards);
  const old = softmax(logits);
  const refLog = logitsFromProbs(softmax(refLogits));
  let th = logits.slice();
  let ratios = group.map(() => 1);
  let clipped = 0;
  for (let step = 0; step < opts.inner; step++) {
    const pi = softmax(th);
    const g = th.map(() => 0);
    clipped = 0;
    ratios = group.map((o) => pi[o] / old[o]);
    group.forEach((o, i) => {
      if (isClipped(ratios[i], advantages[i], opts.eps)) {
        clipped++;
        return;
      }
      for (let j = 0; j < th.length; j++) g[j] += (advantages[i] * ratios[i] * ((j === o ? 1 : 0) - pi[j])) / k;
    });
    const klNow = kl(pi, softmax(refLogits));
    th = th.map((x, j) => {
      const klGrad = pi[j] * (Math.log(pi[j]) - refLog[j] - klNow);
      return x + opts.learningRate * (g[j] - opts.beta * klGrad);
    });
  }
  const pi = softmax(th);
  ratios = group.map((o) => pi[o] / old[o]);
  return { logits: th, advantages, ratios, clipped };
}

export type Run = {
  /** Probability of a rewarded answer after each update. */
  pCorrect: number[];
  /** KL from the reference policy after each update. */
  kl: number[];
  probs: number[];
};

/**
 * Train from the reference policy for a number of updates, each on a fresh group, and record
 * how the probability of a rewarded answer and the drift from the reference change.
 */
export function train(
  refProbs: number[],
  correct: boolean[],
  k: number,
  steps: number,
  opts: UpdateOptions,
  seed: number,
): Run {
  const refLogits = logitsFromProbs(refProbs);
  const refNorm = softmax(refLogits);
  let th = refLogits.slice();
  const pCorrect: number[] = [];
  const drift: number[] = [];
  for (let s = 0; s < steps; s++) {
    const probs = softmax(th);
    const group = sampleGroup(probs, k, seed * 1000 + s);
    const rewards = group.map((o) => (correct[o] ? 1 : 0));
    th = grpoUpdate(th, refLogits, group, rewards, opts).logits;
    const now = softmax(th);
    pCorrect.push(now.reduce((a, p, j) => a + (correct[j] ? p : 0), 0));
    drift.push(kl(now, refNorm));
  }
  return { pCorrect, kl: drift, probs: softmax(th) };
}

export const probCorrect = (probs: number[], correct: boolean[]) => probs.reduce((a, p, j) => a + (correct[j] ? p : 0), 0);
