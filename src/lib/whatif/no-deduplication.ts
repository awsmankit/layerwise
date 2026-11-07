/**
 * What if the training data is not deduplicated?  (A TOY text corpus and a TOY model.)
 * The "web" is 150 distinct made-up one-line documents, 30 of which were scraped twice, plus one boilerplate line
 * ("all rights reserved ...") that is copied K times, like a licence footer on many pages. The data is shuffled,
 * the last fifth becomes the validation set, and the rest trains a word-level trigram model: it predicts the next word
 * from the last two words (backing off to one word), counting what followed in training.
 * Deduplication removes every exact repeat (keeping the first) before the split.
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

export const START = '<s>';
export const END = '<end>';
export const N_UNIQUE = 150;
export const N_REPEATED = 30; // distinct documents that were scraped a second time
export const VAL_FRACTION = 0.2;
export const N_SAMPLES = 300;
export const MAX_WORDS = 20;
export const BOILERPLATE = 'all rights reserved . do not copy this text without permission .';
/** Slider positions: how many copies of the boilerplate line are in the raw data. */
export const COPIES = [1, 5, 10, 20, 40, 80] as const;

const ADJ = ['old', 'small', 'quiet', 'red', 'happy', 'tired'];
const NOUN = ['cat', 'dog', 'farmer', 'robot', 'teacher', 'bird', 'sailor', 'baker'];
const VERB = ['saw', 'chased', 'helped', 'followed', 'greeted', 'ignored'];
const PLACE = ['park', 'river', 'market', 'station', 'school', 'harbour'];

export type Kind = 'plain' | 'repeated' | 'boiler';
export type Doc = { text: string; kind: Kind };

function shuffle<T>(arr: T[], r: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** The raw, shuffled pile of documents with all its repeats. */
export function makeRaw(copies: number, seed = 11): Doc[] {
  const r = rng(seed);
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const seen = new Set<string>();
  const unique: Doc[] = [];
  while (unique.length < N_UNIQUE) {
    const text = `the ${pick(ADJ)} ${pick(NOUN)} ${pick(VERB)} the ${pick(NOUN)} by the ${pick(PLACE)} .`;
    if (seen.has(text)) continue;
    seen.add(text);
    unique.push({ text, kind: unique.length < N_REPEATED ? 'repeated' : 'plain' });
  }
  const docs: Doc[] = [...unique];
  for (let i = 0; i < N_REPEATED; i++) docs.push({ ...unique[i] });
  for (let i = 0; i < copies; i++) docs.push({ text: BOILERPLATE, kind: 'boiler' });
  return shuffle(docs, r);
}

/** Keep the first copy of every distinct document. Returns which positions survive. */
export function keepFlags(raw: Doc[]): boolean[] {
  const seen = new Set<string>();
  return raw.map((d) => {
    if (seen.has(d.text)) return false;
    seen.add(d.text);
    return true;
  });
}

export type Split = { kept: boolean[]; role: ('train' | 'val' | 'removed')[]; train: string[]; val: string[] };

/** Split what is kept: the last VAL_FRACTION of the (kept) documents in order are the validation set. */
export function split(raw: Doc[], dedup: boolean): Split {
  const kept = dedup ? keepFlags(raw) : raw.map(() => true);
  const idx = raw.map((_, i) => i).filter((i) => kept[i]);
  const nVal = Math.round(idx.length * VAL_FRACTION);
  const valSet = new Set(idx.slice(idx.length - nVal));
  const role = raw.map((_, i) => (!kept[i] ? 'removed' : valSet.has(i) ? 'val' : 'train')) as Split['role'];
  return {
    kept,
    role,
    train: raw.filter((_, i) => role[i] === 'train').map((d) => d.text),
    val: raw.filter((_, i) => role[i] === 'val').map((d) => d.text),
  };
}

export type Counts = Map<string, Map<string, number>>;
const words = (s: string) => s.split(' ');

export function train(docs: string[]): Counts {
  const c: Counts = new Map();
  for (const d of docs) {
    const seq = [START, START, ...words(d), END];
    for (let i = 2; i < seq.length; i++) {
      for (const n of [2, 1]) {
        const key = seq.slice(i - n, i).join(' ');
        let m = c.get(key);
        if (!m) c.set(key, (m = new Map()));
        m.set(seq[i], (m.get(seq[i]) ?? 0) + 1);
      }
    }
  }
  return c;
}

/** Next-word counts after this history, backing off from two words to one. Sorted most frequent first, ties alphabetical. */
export function nextDist(c: Counts, history: string[]): [string, number][] {
  for (const n of [2, 1]) {
    const m = c.get(history.slice(history.length - n).join(' '));
    if (m) return [...m.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  }
  return [];
}

/** Share of next-word guesses (the single likeliest word) that are right, over every word and the end of each document. */
export function accuracy(c: Counts, docs: string[]): number {
  let right = 0;
  let total = 0;
  for (const d of docs) {
    const history = [START, START];
    for (const target of [...words(d), END]) {
      const dist = nextDist(c, history);
      if (dist.length && dist[0][0] === target) right++;
      total++;
      history.push(target);
    }
  }
  return total ? right / total : 0;
}

/** Write one line freely: pick each next word at random in proportion to its counts. */
export function sample(c: Counts, r: () => number): string {
  const history = [START, START];
  const out: string[] = [];
  for (let i = 0; i < MAX_WORDS; i++) {
    const dist = nextDist(c, history);
    if (!dist.length) break;
    const total = dist.reduce((a, [, n]) => a + n, 0);
    let x = r() * total;
    let tok = dist[dist.length - 1][0];
    for (const [t, n] of dist) {
      x -= n;
      if (x < 0) {
        tok = t;
        break;
      }
    }
    if (tok === END) break;
    out.push(tok);
    history.push(tok);
  }
  return out.join(' ');
}

export type Analysis = {
  raw: Doc[];
  split: Split;
  removed: number;
  trainSize: number;
  valSize: number;
  /** validation lines that also appear in the training data */
  leaked: number;
  leakShare: number;
  /** next-word accuracy on the whole validation set, as a team would report it */
  valAccuracy: number;
  /** the same score on only the validation lines that are NOT in the training data */
  honestAccuracy: number;
  boilerShareOfTrain: number;
  samples: { text: string; copied: boolean; boiler: boolean }[];
  copiedCount: number;
  boilerCount: number;
};

export function analyse(dedup: boolean, copies: number, nSamples = N_SAMPLES): Analysis {
  const raw = makeRaw(copies);
  const sp = split(raw, dedup);
  const model = train(sp.train);
  const trainSet = new Set(sp.train);
  const unseen = sp.val.filter((t) => !trainSet.has(t));
  const leaked = sp.val.length - unseen.length;
  const r = rng(99);
  const samples = Array.from({ length: nSamples }, () => {
    const text = sample(model, r);
    return { text, copied: trainSet.has(text), boiler: text === BOILERPLATE };
  });
  return {
    raw,
    split: sp,
    removed: sp.role.filter((x) => x === 'removed').length,
    trainSize: sp.train.length,
    valSize: sp.val.length,
    leaked,
    leakShare: sp.val.length ? leaked / sp.val.length : 0,
    valAccuracy: accuracy(model, sp.val),
    honestAccuracy: accuracy(model, unseen),
    boilerShareOfTrain: sp.train.filter((t) => t === BOILERPLATE).length / sp.train.length,
    samples,
    copiedCount: samples.filter((s) => s.copied).length,
    boilerCount: samples.filter((s) => s.boiler).length,
  };
}

/** The most frequently copied lines among the samples, most frequent first. */
export function topCopied(a: Analysis, n = 3): { text: string; count: number; boiler: boolean }[] {
  const m = new Map<string, number>();
  for (const s of a.samples) if (s.copied) m.set(s.text, (m.get(s.text) ?? 0) + 1);
  return [...m.entries()]
    .sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1))
    .slice(0, n)
    .map(([text, count]) => ({ text, count, boiler: text === BOILERPLATE }));
}

/** The first few freely written lines that are not copies of training text. */
export function newLines(a: Analysis, n = 3): string[] {
  return a.samples.filter((s) => !s.copied).slice(0, n).map((s) => s.text);
}
