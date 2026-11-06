/**
 * What if there is no tokenizer and the model reads single characters? Real counts from three ways of cutting
 * the same text into pieces: characters, whole words, and a toy subword split.
 * The subword split uses a tiny hand-made vocabulary (about 30 pieces) and always takes the longest piece that matches.
 * It is a toy: real tokenizers (byte-pair encoding and friends) learn tens of thousands of pieces from data.
 */

export type Scheme = 'chars' | 'subwords' | 'words';

export const schemes: { id: Scheme; label: string }[] = [
  { id: 'chars', label: 'Characters' },
  { id: 'subwords', label: 'Toy subwords' },
  { id: 'words', label: 'Words' },
];

/** The toy subword vocabulary. Single letters are the fallback for anything not listed. */
export const vocab = [
  'the', 'un', 'happy', 'cat', 'sat', 'on', 'mat', 'inter', 'national', 'is', 'ation', 'predict', 'able',
  'a', 'model', 'read', 's', 'text', 'as', 'token', 'and', 'every', 'can', 'look', 'at', 'other',
];

export const examples: { id: string; label: string; text: string }[] = [
  { id: 'cat', label: 'The unhappy cat sat on the mat.', text: 'The unhappy cat sat on the mat.' },
  { id: 'long', label: 'Internationalisation is unpredictable.', text: 'Internationalisation is unpredictable.' },
  { id: 'attn', label: 'A model reads text as tokens, and every token can look at every other token.', text: 'A model reads text as tokens, and every token can look at every other token.' },
];

/** An example context window. Real models range from a few thousand tokens to over a million. */
export const WINDOW = 8192;

const WORD = /[A-Za-z']+|[^\sA-Za-z']/g;
const longest = Math.max(...vocab.map((v) => v.length));
const known = new Set(vocab);

/** Splits one word with the toy vocabulary: longest match first, a single letter if nothing matches. */
export function splitWord(word: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < word.length) {
    let take = 1;
    for (let len = Math.min(longest, word.length - i); len > 1; len--) {
      if (known.has(word.slice(i, i + len).toLowerCase())) {
        take = len;
        break;
      }
    }
    out.push(word.slice(i, i + take));
    i += take;
  }
  return out;
}

/** Cuts text into the pieces the model would read under each scheme. Spaces are tokens only for characters. */
export function tokenize(text: string, scheme: Scheme): string[] {
  if (scheme === 'chars') return Array.from(text);
  const words = text.match(WORD) ?? [];
  if (scheme === 'words') return words;
  return words.flatMap((w) => (/^[A-Za-z']+$/.test(w) ? splitWord(w) : [w]));
}

/** Pairs a causal language model scores: each token looks at itself and every earlier token, n(n+1)/2 in all. */
export function causalPairs(n: number): number {
  return (n * (n + 1)) / 2;
}

/** Characters of text of this kind that fit in a window, if the window counts tokens. */
export function charsThatFit(text: string, scheme: Scheme, window = WINDOW): number {
  return Math.floor((window * text.length) / tokenize(text, scheme).length);
}

/** How many copies of the text fit in the window. */
export function copiesThatFit(text: string, scheme: Scheme, window = WINDOW): number {
  return Math.floor(window / tokenize(text, scheme).length);
}

export type Row = { scheme: Scheme; tokens: number; pairs: number; chars: number };

/** All figures for one text, for all three schemes. */
export function compare(text: string): Row[] {
  return schemes.map(({ id }) => {
    const tokens = tokenize(text, id).length;
    return { scheme: id, tokens, pairs: causalPairs(tokens), chars: charsThatFit(text, id) };
  });
}
