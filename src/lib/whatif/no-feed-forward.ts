/**
 * What if a transformer block has no feed-forward layer? A toy with eight tokens, each carrying two bits (a, b).
 * Attention is modelled as a hand-set mixing step: every token's output is a fixed weighted sum of the tokens'
 * values (the paper describes attention as a weighted sum of values). The feed-forward layer is modelled as the
 * paper describes it: applied to each position separately, ReLU between two linear steps.
 * Hand-set numbers for teaching, not trained weights. The attention pattern is held fixed in the toy, so the mix is
 * a straight-line (linear) function of the tokens; real attention weights also depend on the input.
 */

export const N = 8;
export const a = [1, 0, 1, 1, 0, 0, 1, 0];
export const b = [0, 1, 1, 0, 1, 0, 1, 0];

export type TaskId = 'copy' | 'xor-token' | 'xor-neighbour';

export type Task = {
  id: TaskId;
  name: string;
  plain: string;
  /** Which of the two input bits the block reads (0 = a, 1 = b). */
  channels: number[];
  /** Attention weights: row i says how much token i takes from each token. Rows add up to 1. */
  pattern: number[][];
  /** The correct answer for each token. */
  target: number[];
  /** What the feed-forward layer computes from the mixed number s: sum of coeff * relu(scale * s - shift). */
  ffn: { scale: number; units: { coeff: number; shift: number }[] };
};

const identity = () => Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => (i === j ? 1 : 0)));
const left = () => Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => (j === Math.max(i - 1, 0) ? 1 : 0)));
const selfAndLeft = () =>
  Array.from({ length: N }, (_, i) =>
    Array.from({ length: N }, (_, j) => (i === 0 ? (j === 0 ? 1 : 0) : j === i || j === i - 1 ? 0.5 : 0)),
  );

const xor = (x: number, y: number) => (x !== y ? 1 : 0);

export const tasks: Record<TaskId, Task> = {
  copy: {
    id: 'copy',
    name: 'Copy the left neighbour',
    plain: 'Each token must report its left neighbour’s bit a. Pure mixing across tokens.',
    channels: [0],
    pattern: left(),
    target: a.map((_, i) => a[Math.max(i - 1, 0)]),
    ffn: { scale: 1, units: [{ coeff: 1, shift: 0 }] },
  },
  'xor-token': {
    id: 'xor-token',
    name: 'A rule inside one token',
    plain: 'Each token must answer 1 when its own a and b differ (XOR). Nothing to fetch from other tokens.',
    channels: [0, 1],
    pattern: identity(),
    target: a.map((x, i) => xor(x, b[i])),
    ffn: { scale: 1, units: [{ coeff: 1, shift: 0 }, { coeff: -2, shift: 1 }] },
  },
  'xor-neighbour': {
    id: 'xor-neighbour',
    name: 'Compare with the left neighbour',
    plain: 'Each token must answer 1 when its a differs from its left neighbour’s a. It needs mixing, then a rule.',
    channels: [0],
    pattern: selfAndLeft(),
    target: a.map((x, i) => xor(x, a[Math.max(i - 1, 0)])),
    ffn: { scale: 2, units: [{ coeff: 1, shift: 0 }, { coeff: -2, shift: 1 }] },
  },
};

export const taskIds: TaskId[] = ['copy', 'xor-token', 'xor-neighbour'];

export const relu = (x: number) => (x > 0 ? x : 0);

const values = (): number[][] => a.map((x, i) => [x, b[i]]);

/** The attention step: each token's output is the weighted sum of the tokens' values, for the channels the task reads. */
export function attentionOut(t: Task): number[][] {
  const v = values();
  return t.pattern.map((row) => t.channels.map((c) => row.reduce((s, w, j) => s + w * v[j][c], 0)));
}

/** The one number the feed-forward layer sees for each token: the sum of the mixed channels. */
export function mixed(t: Task): number[] {
  return attentionOut(t).map((o) => o.reduce((s, x) => s + x, 0));
}

/** The feed-forward layer, applied to each token on its own. */
export function ffnOf(t: Task, s: number): number {
  return t.ffn.units.reduce((sum, u) => sum + u.coeff * relu(t.ffn.scale * s - u.shift), 0);
}

export function withFfn(t: Task): number[] {
  return mixed(t).map((s) => ffnOf(t, s));
}

/** Solve a small linear system by Gaussian elimination with partial pivoting. */
function solve(m: number[][], rhs: number[]): number[] {
  const n = rhs.length;
  const A = m.map((row, i) => [...row, rhs[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    if (Math.abs(A[c][c]) < 1e-12) A[c][c] = 1e-12;
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / A[c][c];
      for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = A[r][n];
    for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k];
    x[r] = s / A[r][r];
  }
  return x;
}

/**
 * Without the feed-forward layer the block can only hand its mixed numbers to a straight-line readout
 * (weights times the numbers, plus a constant). This is the best such readout: least squares over the eight tokens.
 * It is deliberately generous: nothing better is possible with a straight line.
 */
export function withoutFfn(t: Task): number[] {
  const o = attentionOut(t).map((r) => [1, ...r]); // constant plus channels
  const k = o[0].length;
  const ata = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => o.reduce((s, r) => s + r[i] * r[j], 0)));
  const aty = Array.from({ length: k }, (_, i) => o.reduce((s, r, n) => s + r[i] * t.target[n], 0));
  const w = solve(ata, aty);
  return o.map((r) => r.reduce((s, x, i) => s + x * w[i], 0));
}

export function mse(pred: number[], target: number[]): number {
  return pred.reduce((s, p, i) => s + (p - target[i]) ** 2, 0) / pred.length;
}

/** A token is right when its output is within 0.05 of the target. */
export function rightFlags(pred: number[], target: number[]): boolean[] {
  return pred.map((p, i) => Math.abs(p - target[i]) < 0.05);
}

/**
 * Would a feed-forward layer on its own (no mixing) be enough? Not if two tokens have the same own bits but different answers.
 * Returns the first such pair, or null if each token's answer depends only on its own bits.
 */
export function conflictForAloneFfn(t: Task): [number, number] | null {
  for (let i = 0; i < N; i++)
    for (let j = i + 1; j < N; j++) if (a[i] === a[j] && b[i] === b[j] && t.target[i] !== t.target[j]) return [i, j];
  return null;
}
