/**
 * The loss functions of language modelling on tiny, hand-checkable examples, for the lesson
 * "Encoders, decoders and objectives". Probabilities in the lab are powers of one half so every
 * logarithm is a whole number of bits and the arithmetic can be checked by hand.
 */

/** The probabilities the lab offers for the true next token: 1, 1/2, 1/4, ... 1/64. */
export const P_STEPS = [1, 1 / 2, 1 / 4, 1 / 8, 1 / 16, 1 / 32, 1 / 64];

export const log2 = (x: number) => Math.log(x) / Math.LN2;

/** Surprise of one token, in bits: minus log2 of the probability given to the true token. */
export const bits = (p: number) => (p >= 1 ? 0 : -log2(p));

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Average cross-entropy in bits over a sequence, from the probability of each true token. */
export function meanBits(probs: number[]): number {
  return sum(probs.map(bits)) / probs.length;
}

/** Perplexity: 2 to the power of the average bits (the same number as e to the average nats). */
export function perplexity(probs: number[]): number {
  return Math.pow(2, meanBits(probs));
}

/** Bits per byte: the total bits for the text divided by its length in UTF-8 bytes. */
export function bitsPerByte(totalBits: number, bytes: number): number {
  return totalBits / bytes;
}

/** Number of UTF-8 bytes in a string. */
export function utf8Bytes(s: string): number {
  return new TextEncoder().encode(s).length;
}

/** Entropy of a distribution in bits. */
export function entropy(p: number[]): number {
  return sum(p.map((x) => (x > 0 ? -x * log2(x) : 0)));
}

/** Cross-entropy in bits: the average surprise when the truth is p and the model says q. */
export function crossEntropy(p: number[], q: number[]): number {
  return sum(p.map((x, i) => (x > 0 ? -x * log2(q[i]) : 0)));
}

/** KL divergence in bits: cross-entropy minus entropy, never negative. */
export function kl(p: number[], q: number[]): number {
  return crossEntropy(p, q) - entropy(p);
}

export const SENTENCE_TOKENS = ['the', 'cat', 'sat', 'on', 'the', 'mat'];
/** The text those tokens spell, with spaces: 22 bytes. */
export const SENTENCE_TEXT = 'the cat sat on the mat';

/** Index into P_STEPS for each token under three example models (made-up numbers for the lab). */
export const MODEL_PRESETS: { id: string; label: string; steps: number[] }[] = [
  { id: 'small', label: 'A small model', steps: [1, 3, 3, 2, 1, 3] },
  { id: 'big', label: 'A bigger model', steps: [1, 2, 1, 1, 0, 2] },
  { id: 'sure', label: 'Sure of the wrong thing', steps: [1, 6, 6, 5, 1, 6] },
];

/** The next-token example used for KL: the truth and four candidate models, over four candidate tokens. */
export const NEXT_TOKENS = ['mat', 'floor', 'sofa', 'bed'];
export const TRUTH = [1 / 2, 1 / 4, 1 / 8, 1 / 8];
export const KL_MODELS: { id: string; label: string; q: number[] }[] = [
  { id: 'right', label: 'Exactly right', q: [1 / 2, 1 / 4, 1 / 8, 1 / 8] },
  { id: 'flat', label: 'Uniform guess', q: [1 / 4, 1 / 4, 1 / 4, 1 / 4] },
  { id: 'cocky', label: 'Overconfident', q: [0.9, 0.05, 0.03, 0.02] },
  { id: 'wrong', label: 'Confidently wrong', q: [0.05, 0.05, 0.05, 0.85] },
];
