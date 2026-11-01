/*
 * Connectionist Temporal Classification (CTC) decoding, kept small enough to run and test in the browser.
 *
 * A model reads T audio frames and gives, for each frame, a probability for every symbol in a small alphabet
 * plus a special blank (index 0). A "path" picks one symbol per frame. The CTC rule turns a path into text:
 * merge runs of the same symbol, then delete the blanks. Many paths give the same text, so the probability
 * of a text is the SUM over all of its paths (Graves et al., 2006; Hannun, 2017).
 */

export const BLANK = 0;

/** probs[t][k]: probability of symbol k at frame t (each row sums to 1). Symbol 0 is the blank. */
export type Probs = number[][];

/** The CTC collapse rule B: merge repeated symbols, then drop blanks. */
export function collapse(path: readonly number[], blank = BLANK): number[] {
  const out: number[] = [];
  let prev = -1;
  for (const s of path) {
    if (s !== prev && s !== blank) out.push(s);
    prev = s;
  }
  return out;
}

/** The three stages of collapsing, for showing step by step: [path, after merging repeats, after dropping blanks]. */
export function collapseSteps(path: readonly number[], blank = BLANK): [number[], number[], number[]] {
  const merged: number[] = [];
  for (const s of path) if (merged.length === 0 || merged[merged.length - 1] !== s) merged.push(s);
  return [[...path], merged, merged.filter((s) => s !== blank)];
}

/** For each frame, the most likely symbol. */
export function argmaxPath(probs: Probs): number[] {
  return probs.map((row) => {
    let best = 0;
    for (let k = 1; k < row.length; k++) if (row[k] > row[best]) best = k;
    return best;
  });
}

/** Greedy (best path) decoding: the best symbol in every frame, then collapse. */
export const greedyDecode = (probs: Probs): number[] => collapse(argmaxPath(probs));

/** Probability of one particular path: the product of the chosen symbol's probability at every frame. */
export function pathProbability(probs: Probs, path: readonly number[]): number {
  let p = 1;
  for (let t = 0; t < probs.length; t++) p *= probs[t][path[t]];
  return p;
}

/**
 * Probability of a text: the sum of the probabilities of every path that collapses to it
 * (the CTC forward algorithm over the target with blanks between and around its symbols).
 */
export function textProbability(probs: Probs, target: readonly number[], blank = BLANK): number {
  const T = probs.length;
  const S = 2 * target.length + 1;
  const label = (s: number) => (s % 2 === 0 ? blank : target[(s - 1) / 2]);
  let alpha = new Array<number>(S).fill(0);
  alpha[0] = probs[0][blank];
  if (S > 1) alpha[1] = probs[0][label(1)];
  if (T === 0) return target.length === 0 ? 1 : 0;
  for (let t = 1; t < T; t++) {
    const next = new Array<number>(S).fill(0);
    for (let s = 0; s < S; s++) {
      let a = alpha[s];
      if (s >= 1) a += alpha[s - 1];
      if (s >= 2 && label(s) !== blank && label(s) !== label(s - 2)) a += alpha[s - 2];
      next[s] = a * probs[t][label(s)];
    }
    alpha = next;
  }
  return alpha[S - 1] + (S > 1 ? alpha[S - 2] : 0);
}

/** How many different paths of length T collapse to the target. */
export function alignmentCount(T: number, target: readonly number[], symbols: number): number {
  const ones: Probs = Array.from({ length: T }, () => new Array<number>(symbols).fill(1));
  return textProbability(ones, target);
}

/**
 * Every path that collapses to `target`, best first (at most `limit` are returned, found by
 * depth-first search over the allowed transitions). Intended for short inputs.
 */
export function topAlignments(probs: Probs, target: readonly number[], limit = 5, blank = BLANK): { path: number[]; p: number }[] {
  const T = probs.length;
  const S = 2 * target.length + 1;
  const label = (s: number) => (s % 2 === 0 ? blank : target[(s - 1) / 2]);
  const found: { path: number[]; p: number }[] = [];
  const path: number[] = [];
  const walk = (t: number, s: number, p: number) => {
    path.push(label(s));
    p *= probs[t][label(s)];
    if (t === T - 1) {
      if (s === S - 1 || s === S - 2) found.push({ path: [...path], p });
    } else {
      const steps = [s, s + 1];
      if (s + 2 < S && label(s + 2) !== blank && label(s + 2) !== label(s)) steps.push(s + 2);
      for (const n of steps) if (n < S) walk(t + 1, n, p);
    }
    path.pop();
  };
  walk(0, 0, 1);
  if (S > 1) walk(0, 1, 1);
  found.sort((a, b) => b.p - a.p);
  return found.slice(0, limit);
}

export type Hypothesis = { text: number[]; p: number };

/**
 * CTC prefix beam search (Hannun, 2017). Keeps the `width` best texts so far, and for each text the
 * probability of paths that end in a blank (pb) and in a symbol (pnb), so that paths which collapse to
 * the same text are added together. Returns the surviving texts, best first, with their probabilities.
 */
export function prefixBeamSearch(probs: Probs, width: number, blank = BLANK): Hypothesis[] {
  type Entry = { text: number[]; pb: number; pnb: number };
  const keyOf = (text: number[]) => text.join(',');
  let beams = new Map<string, Entry>([['', { text: [], pb: 1, pnb: 0 }]]);
  for (const row of probs) {
    const next = new Map<string, Entry>();
    const get = (text: number[]) => {
      const k = keyOf(text);
      let e = next.get(k);
      if (!e) {
        e = { text, pb: 0, pnb: 0 };
        next.set(k, e);
      }
      return e;
    };
    for (const { text, pb, pnb } of beams.values()) {
      const total = pb + pnb;
      const last = text.length ? text[text.length - 1] : -1;
      for (let c = 0; c < row.length; c++) {
        const p = row[c];
        if (c === blank) {
          get(text).pb += total * p;
        } else if (c === last) {
          get([...text, c]).pnb += pb * p; // a repeat after a blank is a new letter
          get(text).pnb += pnb * p; // a repeat with no blank between merges into the same letter
        } else {
          get([...text, c]).pnb += total * p;
        }
      }
    }
    beams = new Map([...next.entries()].sort((a, b) => b[1].pb + b[1].pnb - (a[1].pb + a[1].pnb)).slice(0, Math.max(1, width)));
  }
  return [...beams.values()].map((e) => ({ text: e.text, p: e.pb + e.pnb })).sort((a, b) => b.p - a.p);
}

/**
 * Make a model sound more or less sure of itself: raise every probability to the power 1/temperature and
 * renormalise. Temperature 1 changes nothing; above 1 flattens the rows, below 1 sharpens them.
 */
export function temper(probs: Probs, temperature: number): Probs {
  return probs.map((row) => {
    const powered = row.map((p) => p ** (1 / temperature));
    const sum = powered.reduce((a, b) => a + b, 0);
    return powered.map((p) => p / sum);
  });
}

/** Turn rows of non-negative weights into probabilities that sum to one. */
export function normaliseRows(rows: number[][]): Probs {
  return rows.map((r) => {
    const sum = r.reduce((a, b) => a + b, 0);
    return r.map((v) => v / sum);
  });
}

/** Levenshtein edit distance between two sequences (insertions, deletions and substitutions each cost 1). */
export function editDistance<T>(a: readonly T[], b: readonly T[]): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
