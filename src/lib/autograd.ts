/**
 * A step-by-step walk through backpropagation on one small expression:
 *
 *     p = a × b      q = p + a      r = tanh(q)
 *
 * The value a is used twice (in p and in q), so its gradient is the sum of two contributions. The
 * walk has one step per move: inputs, the three forward operations, then the seed and one step per
 * operation going backwards. Every step is a complete snapshot, so the viewer can go back and forth.
 */

export type NodeId = 'a' | 'b' | 'p' | 'q' | 'r';
export type Snapshot = {
  phase: 'inputs' | 'forward' | 'backward';
  title: string;
  /** What happens in this step, in words with the numbers in it. */
  text: string;
  /** The node being worked on. */
  active: NodeId | null;
  /** Edges (from input to result) used in this step. */
  edges: [NodeId, NodeId][];
  /** The local derivative on each active edge, for labelling it. */
  locals: Partial<Record<string, number>>;
  values: Record<NodeId, number | null>;
  grads: Record<NodeId, number | null>;
};

export const NODES: { id: NodeId; label: string; op: string; inputs: NodeId[] }[] = [
  { id: 'a', label: 'a', op: 'input', inputs: [] },
  { id: 'b', label: 'b', op: 'input', inputs: [] },
  { id: 'p', label: 'p', op: '×', inputs: ['a', 'b'] },
  { id: 'q', label: 'q', op: '+', inputs: ['p', 'a'] },
  { id: 'r', label: 'r', op: 'tanh', inputs: ['q'] },
];

const f = (n: number) => (Math.abs(n) < 5e-5 ? '0' : n.toFixed(3));
/** Like f, but a negative number goes in brackets so a square or a product reads clearly. */
const par = (n: number) => (n < 0 && Math.abs(n) >= 5e-5 ? `(${f(n)})` : f(n));

export function forwardValues(a: number, b: number) {
  const p = a * b;
  const q = p + a;
  const r = Math.tanh(q);
  return { a, b, p, q, r };
}

/** The slope of r with respect to a and b, estimated by nudging each input (central differences). */
export function numericalGradient(a: number, b: number, h = 1e-6) {
  const r = (x: number, y: number) => forwardValues(x, y).r;
  return { a: (r(a + h, b) - r(a - h, b)) / (2 * h), b: (r(a, b + h) - r(a, b - h)) / (2 * h) };
}

export function walk(a: number, b: number): Snapshot[] {
  const v = forwardValues(a, b);
  const none = { a: null, b: null, p: null, q: null, r: null } as Record<NodeId, number | null>;
  const steps: Snapshot[] = [];

  let values: Record<NodeId, number | null> = { ...none, a, b };
  let grads: Record<NodeId, number | null> = { ...none };
  const push = (s: Omit<Snapshot, 'values' | 'grads' | 'edges' | 'locals'> & Partial<Pick<Snapshot, 'edges' | 'locals'>>) =>
    steps.push({ edges: [], locals: {}, ...s, values: { ...values }, grads: { ...grads } });

  push({ phase: 'inputs', title: 'Start', active: null, text: `The two inputs are a = ${f(a)} and b = ${f(b)}. Nothing else is known yet. The forward pass fills in the rest.` });

  values = { ...values, p: v.p };
  push({ phase: 'forward', title: 'Forward: multiply', active: 'p', edges: [['a', 'p'], ['b', 'p']], text: `p = a × b = ${par(a)} × ${par(b)} = ${f(v.p)}.` });
  values = { ...values, q: v.q };
  push({ phase: 'forward', title: 'Forward: add', active: 'q', edges: [['p', 'q'], ['a', 'q']], text: `q = p + a = ${par(v.p)} + ${par(a)} = ${f(v.q)}. Notice that a is used here as well as in p.` });
  values = { ...values, r: v.r };
  push({ phase: 'forward', title: 'Forward: tanh', active: 'r', edges: [['q', 'r']], text: `r = tanh(q) = tanh(${f(v.q)}) = ${f(v.r)}. The forward pass is done: r is the output.` });

  grads = { ...grads, r: 1 };
  push({ phase: 'backward', title: 'Backward: start', active: 'r', text: 'Going backwards, the gradient of r with respect to itself is 1. Every other gradient will mean "if this value goes up by a little, r goes up by this many times as much".' });

  const slope = 1 - v.r * v.r;
  grads = { ...grads, q: slope * 1 };
  push({ phase: 'backward', title: 'Backward: tanh', active: 'r', edges: [['q', 'r']], locals: { 'q>r': slope }, text: `The local slope of tanh at this point is 1 − r² = 1 − ${par(v.r)}² = ${f(slope)}. So q.grad = ${f(slope)} × r.grad (1) = ${f(slope)}.` });

  const gq = slope;
  grads = { ...grads, p: gq * 1, a: gq * 1 };
  push({ phase: 'backward', title: 'Backward: add', active: 'q', edges: [['p', 'q'], ['a', 'q']], locals: { 'p>q': 1, 'a>q': 1 }, text: `Addition has local slope 1 for both inputs, so each receives q.grad = ${f(gq)} unchanged. Now p.grad = ${f(gq)}, and a.grad = ${f(gq)} so far (a has more contributions to come).` });

  const gp = gq;
  const aFromP = v.b * gp;
  const bFromP = v.a * gp;
  grads = { ...grads, a: gq + aFromP, b: bFromP };
  push({
    phase: 'backward',
    title: 'Backward: multiply',
    active: 'p',
    edges: [['a', 'p'], ['b', 'p']],
    locals: { 'a>p': v.b, 'b>p': v.a },
    text: `Multiplication's local slope for each input is the other input: ${f(v.b)} for a and ${f(v.a)} for b. So a receives ${par(v.b)} × ${f(gp)} = ${par(aFromP)} and ADDS it to the ${f(gq)} it already had: a.grad = ${f(gq + aFromP)}. b.grad = ${f(v.a)} × ${f(gp)} = ${f(bFromP)}.`,
  });

  return steps;
}
