/**
 * Byte-level byte-pair encoding (BPE), small enough to read in one sitting.
 *
 * The method follows Sennrich et al. (2015): start from single symbols, count every
 * adjacent pair, merge the most frequent pair into a new symbol, and repeat. The base
 * symbols are the 256 byte values (as in GPT-2), so every string can be encoded and
 * nothing is ever "unknown". Text is first split into pre-tokens with the original
 * GPT-2 pattern, so that no merge ever crosses a word boundary.
 *
 * Choices this file makes, which real tokenizers may make differently:
 *  - a tie between equally frequent pairs goes to the pair with the smaller ids;
 *  - training stops when the best pair occurs fewer than `minCount` times (default 2);
 *  - ids 0 to 255 are the bytes, and merge number k (counting from 0) gets id 256 + k.
 */

export type Pair = [number, number];
/** A distinct pre-token, as a list of token ids, and how many times it occurs in the text. */
export type Word = { ids: number[]; count: number };
export type Merge = { pair: Pair; id: number; count: number };

/** The pre-tokenisation pattern of the original GPT-2 release (see tiktoken's openai_public.py). */
const GPT2_PATTERN = /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;

const encoder = new TextEncoder();

export function utf8Bytes(s: string): number[] {
  return Array.from(encoder.encode(s));
}

/** Split text into pre-tokens. With `split` off the whole text is one piece, so merges may cross spaces. */
export function pretokenize(text: string, split = true): string[] {
  if (!text) return [];
  if (!split) return [text];
  return text.match(GPT2_PATTERN) ?? [];
}

/** The distinct pre-tokens of a text as byte-id lists with counts, in order of first appearance. */
export function wordsFromText(text: string, split = true): Word[] {
  const seen = new Map<string, Word>();
  for (const piece of pretokenize(text, split)) {
    const hit = seen.get(piece);
    if (hit) hit.count += 1;
    else seen.set(piece, { ids: utf8Bytes(piece), count: 1 });
  }
  return [...seen.values()];
}

export type PairCount = { pair: Pair; count: number };

/** Count adjacent pairs, weighting each word by how often it occurs. Sorted by count, then by ids. */
export function countPairs(words: Word[]): PairCount[] {
  const counts = new Map<string, PairCount>();
  for (const { ids, count } of words) {
    for (let i = 0; i + 1 < ids.length; i++) {
      const key = `${ids[i]},${ids[i + 1]}`;
      const hit = counts.get(key);
      if (hit) hit.count += count;
      else counts.set(key, { pair: [ids[i], ids[i + 1]], count });
    }
  }
  return [...counts.values()].sort((x, y) => y.count - x.count || x.pair[0] - y.pair[0] || x.pair[1] - y.pair[1]);
}

/** Replace each non-overlapping occurrence of `pair` (scanning left to right) with `newId`. */
export function mergeIds(ids: number[], pair: Pair, newId: number): number[] {
  const out: number[] = [];
  let i = 0;
  while (i < ids.length) {
    if (i + 1 < ids.length && ids[i] === pair[0] && ids[i + 1] === pair[1]) {
      out.push(newId);
      i += 2;
    } else {
      out.push(ids[i]);
      i += 1;
    }
  }
  return out;
}

/** The words after the first `k` merges have been applied. */
export function applyMerges(words: Word[], merges: Merge[], k = merges.length): Word[] {
  let cur = words;
  for (const m of merges.slice(0, k)) {
    cur = cur.map((w) => ({ ids: mergeIds(w.ids, m.pair, m.id), count: w.count }));
  }
  return cur;
}

/** Total number of tokens in a segmented corpus. */
export const totalTokens = (words: Word[]) => words.reduce((n, w) => n + w.ids.length * w.count, 0);

/** Learn up to `maxMerges` merges from `text`. */
export function train(text: string, maxMerges: number, opts: { split?: boolean; minCount?: number } = {}): Merge[] {
  const { split = true, minCount = 2 } = opts;
  let words = wordsFromText(text, split);
  const merges: Merge[] = [];
  while (merges.length < maxMerges) {
    const best = countPairs(words)[0];
    if (!best || best.count < minCount) break;
    const merge: Merge = { pair: best.pair, id: 256 + merges.length, count: best.count };
    merges.push(merge);
    words = words.map((w) => ({ ids: mergeIds(w.ids, merge.pair, merge.id), count: w.count }));
  }
  return merges;
}

/** Encode text: split into pre-tokens, take bytes, then apply the merges in the order they were learned. */
export function encode(text: string, merges: Merge[], split = true): number[] {
  const rank = new Map<string, Merge>();
  merges.forEach((m) => rank.set(`${m.pair[0]},${m.pair[1]}`, m));
  const out: number[] = [];
  for (const piece of pretokenize(text, split)) {
    let ids = utf8Bytes(piece);
    while (ids.length > 1) {
      let best: Merge | null = null;
      for (let i = 0; i + 1 < ids.length; i++) {
        const m = rank.get(`${ids[i]},${ids[i + 1]}`);
        if (m && (!best || m.id < best.id)) best = m;
      }
      if (!best) break;
      ids = mergeIds(ids, best.pair, best.id);
    }
    out.push(...ids);
  }
  return out;
}

/** The bytes behind every token id: 0-255 are themselves, and a merge is the bytes of its two halves. */
export function vocabBytes(merges: Merge[]): Map<number, number[]> {
  const v = new Map<number, number[]>();
  for (let b = 0; b < 256; b++) v.set(b, [b]);
  for (const m of merges) v.set(m.id, [...(v.get(m.pair[0]) ?? []), ...(v.get(m.pair[1]) ?? [])]);
  return v;
}

/** Turn ids back into text. Invalid UTF-8 (a character cut in half) becomes the replacement character. */
export function decode(ids: number[], merges: Merge[]): string {
  const v = vocabBytes(merges);
  const bytes = ids.flatMap((id) => v.get(id) ?? []);
  return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
}

/**
 * A short readable label for a token: printable characters as they are, a space as a
 * middle dot, a newline as an arrow, and bytes that are not complete UTF-8 as hex.
 */
export function tokenLabel(bytes: number[]): string {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
  } catch {
    return bytes.map((b) => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
  }
  return text.replace(/ /g, '·').replace(/\n/g, '↵').replace(/\t/g, '⇥');
}

/** Learned vocabulary size: 256 byte tokens plus one per merge. */
export const vocabSize = (merges: Merge[], k = merges.length) => 256 + Math.min(k, merges.length);
