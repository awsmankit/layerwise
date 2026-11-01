/*
 * Word error rate by edit distance, with the alignment kept so it can be shown, plus a small toy
 * text normaliser. Pure functions, no DOM. The counts are checked against the jiwer package in
 * wer.test.ts. The normaliser is a teaching toy (a handful of contractions and the numbers 0 to 999);
 * real evaluations use a documented normaliser such as the one released with Whisper.
 */

export type Op = 'ok' | 'sub' | 'del' | 'ins';
/** One column of an alignment. `ref` is missing for an insertion and `hyp` is missing for a deletion. */
export type AlignItem = { op: Op; ref?: string; hyp?: string };

export type Score = {
  items: AlignItem[];
  hits: number;
  subs: number;
  dels: number;
  ins: number;
  /** Number of words in the reference (N = S + D + H). */
  refLen: number;
  hypLen: number;
  /** S + D + I: the minimum number of word edits that turn the hypothesis into the reference. */
  edits: number;
  /** Word error rate, (S + D + I) / N. NaN when the reference is empty, because it divides by zero. */
  wer: number;
  /** Match error rate, (S + D + I) / (H + S + D + I): never above 1 (Morris et al., 2004). */
  mer: number;
  /** Word information lost, 1 - (H / N) * (H / hypothesis length) (Morris et al., 2004). */
  wil: number;
};

/** Split on whitespace. */
export const words = (s: string): string[] => s.split(/\s+/).filter(Boolean);

/**
 * Minimum edit distance between two token lists, with one optimal alignment. Substitutions, deletions
 * and insertions each cost 1; a match costs 0. When several alignments tie, the backtrace prefers a
 * match or substitution, then a deletion, then an insertion. The total is the same for every optimal
 * alignment; how it splits between S, D and I can differ.
 */
export function alignTokens(ref: readonly string[], hyp: readonly string[]): AlignItem[] {
  const n = ref.length;
  const m = hyp.length;
  const d: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = 0; i <= n; i++) d[i][0] = i;
  for (let j = 0; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = ref[i - 1] === hyp[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j - 1] + cost, d[i - 1][j] + 1, d[i][j - 1] + 1);
    }
  }
  const out: AlignItem[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1)) {
      out.push({ op: ref[i - 1] === hyp[j - 1] ? 'ok' : 'sub', ref: ref[i - 1], hyp: hyp[j - 1] });
      i--;
      j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      out.push({ op: 'del', ref: ref[i - 1] });
      i--;
    } else {
      out.push({ op: 'ins', hyp: hyp[j - 1] });
      j--;
    }
  }
  return out.reverse();
}

/** Align two word lists and count hits, substitutions, deletions and insertions. */
export function scoreTokens(ref: readonly string[], hyp: readonly string[]): Score {
  const items = alignTokens(ref, hyp);
  let hits = 0;
  let subs = 0;
  let dels = 0;
  let ins = 0;
  for (const it of items) {
    if (it.op === 'ok') hits++;
    else if (it.op === 'sub') subs++;
    else if (it.op === 'del') dels++;
    else ins++;
  }
  const edits = subs + dels + ins;
  const refLen = ref.length;
  const hypLen = hyp.length;
  const aligned = hits + edits;
  return {
    items,
    hits,
    subs,
    dels,
    ins,
    refLen,
    hypLen,
    edits,
    wer: refLen === 0 ? NaN : edits / refLen,
    mer: aligned === 0 ? 0 : edits / aligned,
    wil: refLen === 0 || hypLen === 0 ? (refLen === 0 && hypLen === 0 ? 0 : 1) : 1 - (hits / refLen) * (hits / hypLen),
  };
}

/** Word-level score of two strings split on whitespace. */
export const scoreText = (ref: string, hyp: string): Score => scoreTokens(words(ref), words(hyp));

/** Plain edit distance between two token lists. */
export function editDistance(a: readonly string[], b: readonly string[]): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1), prev[j] + 1, cur[j - 1] + 1);
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Character error rate: the same edit distance over characters (spaces count, as in jiwer), divided by
 * the reference length in characters. NaN for an empty reference. Useful for languages written without
 * spaces between words.
 */
export function cer(ref: string, hyp: string): number {
  const r = Array.from(ref);
  return r.length === 0 ? NaN : editDistance(r, Array.from(hyp)) / r.length;
}

/* ---------- a toy text normaliser ---------- */

export type NormOptions = {
  lowercase: boolean;
  /** Replace everything except letters, digits and apostrophes with a space. */
  punctuation: boolean;
  /** Spell out whole numbers 0 to 999 ("12" becomes "twelve"). */
  numerals: boolean;
  /** Expand a few common English contractions ("you're" becomes "you are"). */
  contractions: boolean;
  /** Drop "um", "uh", "er", "erm", "hmm" and "mm". */
  fillers: boolean;
};

export const NO_NORMALISATION: NormOptions = { lowercase: false, punctuation: false, numerals: false, contractions: false, fillers: false };

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** British-style spelling of a whole number from 0 to 999 as a list of words: 101 is "one hundred and one". */
export function numberToWords(n: number): string[] {
  if (!Number.isInteger(n) || n < 0 || n > 999) throw new RangeError('numberToWords handles whole numbers from 0 to 999');
  if (n < 20) return [ONES[n]];
  if (n < 100) return n % 10 === 0 ? [TENS[n / 10]] : [TENS[Math.floor(n / 10)], ONES[n % 10]];
  const head = [ONES[Math.floor(n / 100)], 'hundred'];
  return n % 100 === 0 ? head : [...head, 'and', ...numberToWords(n % 100)];
}

const CONTRACTIONS: Record<string, string> = {
  "i'm": 'i am',
  "you're": 'you are',
  "we're": 'we are',
  "they're": 'they are',
  "it's": 'it is',
  "that's": 'that is',
  "there's": 'there is',
  "don't": 'do not',
  "doesn't": 'does not',
  "didn't": 'did not',
  "isn't": 'is not',
  "can't": 'cannot',
  "won't": 'will not',
  "i'll": 'i will',
  "i've": 'i have',
  "let's": 'let us',
};
const FILLERS = new Set(['um', 'uh', 'er', 'erm', 'hmm', 'mm']);

/** Apply the chosen steps and return the list of words. Steps run in a fixed order: case, contractions, punctuation, numbers, fillers. */
export function normaliseWords(text: string, opts: NormOptions): string[] {
  let s = text.replace(/[‘’]/g, "'");
  if (opts.lowercase) s = s.toLowerCase();
  if (opts.contractions) s = s.replace(/[A-Za-z]+'[A-Za-z]+/g, (w) => CONTRACTIONS[w.toLowerCase()] ?? w);
  if (opts.punctuation) s = s.replace(/[^\p{L}\p{N}'\s]/gu, ' ').replace(/(^|\s)'+|'+(?=\s|$)/g, '$1');
  let toks = words(s);
  if (opts.numerals) toks = toks.flatMap((t) => (/^\d{1,3}$/.test(t) ? numberToWords(Number(t)) : [t]));
  if (opts.fillers) toks = toks.filter((t) => !FILLERS.has(t.toLowerCase().replace(/[^\p{L}]/gu, '')));
  return toks;
}

/** Normalise both sides in the same way, then score them. */
export function scoreWithNormalisation(ref: string, hyp: string, opts: NormOptions): Score {
  return scoreTokens(normaliseWords(ref, opts), normaliseWords(hyp, opts));
}
