/**
 * Attention masks and the training examples that go with them, for the lesson "Encoders, decoders and
 * objectives". A mask is a grid: row i is the token that is looking, column j is a token it may look at.
 * Pure functions, no randomness: the learner chooses which tokens to hide.
 */

export type MaskKind = 'bidirectional' | 'causal' | 'prefix' | 'full';
export type Arch = 'encoder' | 'decoder' | 'encdec' | 'prefix';

export const SENTENCE = ['The', 'cat', 'sat', 'on', 'the', 'warm', 'mat', '.'];

/** The mask for `n` tokens. For 'prefix' the first `prefix` tokens see each other both ways and the rest look back only. 'full' is used for cross-attention. */
export function maskGrid(kind: MaskKind, n: number, prefix = 0, m = n): boolean[][] {
  const rows = kind === 'full' ? m : n;
  return Array.from({ length: rows }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      if (kind === 'bidirectional' || kind === 'full') return true;
      if (kind === 'causal') return j <= i;
      return j <= i || j < prefix;
    }),
  );
}

/** Which key positions token `i` can see in this grid. */
export function visibleFrom(grid: boolean[][], i: number): number[] {
  return grid[i].flatMap((ok, j) => (ok ? [j] : []));
}

export function countAllowed(grid: boolean[][]): number {
  return grid.reduce((s, row) => s + row.filter(Boolean).length, 0);
}

/** BERT-style masked language modelling: hidden tokens become [MASK], and only they are predicted. */
export function maskedLM(tokens: string[], hidden: number[]) {
  const set = new Set(hidden);
  return {
    input: tokens.map((t, i) => (set.has(i) ? '[MASK]' : t)),
    targets: tokens.flatMap((t, i) => (set.has(i) ? [{ pos: i, token: t }] : [])),
  };
}

/** GPT-style next-token prediction: every position predicts the token after it. */
export function nextToken(tokens: string[]) {
  return { input: tokens.slice(0, -1), target: tokens.slice(1) };
}

const SENTINELS = ['<X>', '<Y>', '<Z>', '<W>', '<V>', '<U>', '<T>', '<S>'];

/**
 * T5-style span corruption: each run of consecutive hidden tokens is replaced by one sentinel in the input,
 * and the target lists each sentinel followed by the tokens it hid, then a closing sentinel.
 */
export function spanCorrupt(tokens: string[], hidden: number[]) {
  const set = new Set(hidden);
  const input: string[] = [];
  const target: string[] = [];
  let spans = 0;
  let i = 0;
  while (i < tokens.length) {
    if (!set.has(i)) {
      input.push(tokens[i]);
      i += 1;
      continue;
    }
    const s = SENTINELS[spans];
    spans += 1;
    input.push(s);
    target.push(s);
    while (i < tokens.length && set.has(i)) {
      target.push(tokens[i]);
      i += 1;
    }
  }
  if (spans > 0) target.push(SENTINELS[spans]);
  return { input, target, spans };
}

/** For each architecture: what is fed in, what is predicted, the mask(s), and how many positions carry a training signal. */
export function describe(arch: Arch, tokens: string[], hidden: number[], prefix: number) {
  const n = tokens.length;
  if (arch === 'encoder') {
    const { input, targets } = maskedLM(tokens, hidden);
    return {
      input,
      predicted: targets.map((t) => `${t.token} (at ${t.pos + 1})`),
      signal: targets.length,
      of: n,
      grids: [{ label: 'Encoder self-attention', grid: maskGrid('bidirectional', n), rows: input, cols: input }],
    };
  }
  if (arch === 'decoder') {
    const { input, target } = nextToken(tokens);
    return {
      input,
      predicted: target,
      signal: target.length,
      of: input.length,
      grids: [{ label: 'Decoder self-attention', grid: maskGrid('causal', input.length), rows: input, cols: input }],
    };
  }
  if (arch === 'prefix') {
    const p = Math.max(1, Math.min(prefix, n - 1));
    return {
      input: tokens.slice(0, -1),
      predicted: tokens.slice(p),
      signal: n - p,
      of: n - 1,
      grids: [{ label: `Prefix attention, first ${p} tokens open both ways`, grid: maskGrid('prefix', n - 1, p), rows: tokens.slice(0, -1), cols: tokens.slice(0, -1) }],
    };
  }
  const { input, target, spans } = spanCorrupt(tokens, hidden);
  const dec = target.slice(0, -1);
  return {
    input,
    predicted: target.slice(1),
    signal: spans === 0 ? 0 : target.length - 1,
    of: Math.max(dec.length, 0),
    decoderInput: dec,
    grids: [
      { label: 'Encoder self-attention (reads the corrupted input)', grid: maskGrid('bidirectional', input.length), rows: input, cols: input },
      { label: 'Decoder self-attention (writes the spans)', grid: maskGrid('causal', Math.max(dec.length, 1)), rows: dec.length ? dec : ['-'], cols: dec.length ? dec : ['-'] },
    ],
  };
}
