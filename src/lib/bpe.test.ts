import { describe, expect, it } from 'vitest';
import { applyMerges, countPairs, decode, encode, mergeIds, pretokenize, tokenLabel, totalTokens, train, vocabBytes, wordsFromText } from './bpe';

/*
 * The expected values below were produced by an independent reference implementation in
 * Python (the `regex` module with the GPT-2 pattern, ties broken by the smaller pair of ids,
 * stop when the best pair occurs fewer than twice), run on 1 November 2026.
 */
const CATS = "the cat sat on the mat. the cat ate the rat. the rat sat on the mat.";
const SENNRICH = "low low low low low lower lower newest newest newest newest newest newest widest widest widest";
const CODE = "for i in range(10):\n    print(i)\nfor j in range(10):\n    print(j)\n";

/** [first id, second id, new id, count when merged] */
const REF: Record<string, number[][]> = {
  cats: [[97, 116, 256, 9], [104, 101, 257, 6], [116, 257, 258, 6], [32, 258, 259, 5], [32, 99, 260, 2], [32, 109, 261, 2], [32, 111, 262, 2], [32, 114, 263, 2], [32, 115, 264, 2], [260, 256, 265, 2], [261, 256, 266, 2], [262, 110, 267, 2], [263, 256, 268, 2], [264, 256, 269, 2]],
  catsNoSplit: [[97, 116, 256, 9], [101, 32, 257, 7], [104, 257, 258, 6], [116, 258, 259, 6], [256, 32, 260, 5], [32, 259, 261, 4], [256, 46, 262, 3], [99, 260, 263, 2], [109, 262, 264, 2], [110, 261, 265, 2], [111, 265, 266, 2], [115, 260, 267, 2], [266, 264, 268, 2], [267, 268, 269, 2]],
  sennrich: [[101, 115, 256, 9], [256, 116, 257, 9], [108, 111, 258, 7], [258, 119, 259, 7], [32, 110, 260, 6], [32, 259, 261, 6], [101, 119, 262, 6], [260, 262, 263, 6], [263, 257, 264, 6], [32, 119, 265, 3], [100, 257, 266, 3], [105, 266, 267, 3], [265, 267, 268, 3], [101, 114, 269, 2], [261, 269, 270, 2]],
  code: [[32, 32, 256, 4], [105, 110, 257, 4], [10, 256, 258, 2], [32, 112, 259, 2], [32, 114, 260, 2], [32, 257, 261, 2], [41, 58, 262, 2], [49, 48, 263, 2], [97, 110, 264, 2], [102, 111, 265, 2], [103, 101, 266, 2], [114, 257, 267, 2], [258, 32, 268, 2], [259, 267, 269, 2], [260, 264, 270, 2], [265, 114, 271, 2], [269, 116, 272, 2], [270, 266, 273, 2]],
};
const ENC: { corpus: string; k: number; text: string; ids: number[] }[] = [{"corpus": "cats", "k": 8, "text": "the cat sat on the mat.", "ids": [258, 260, 256, 32, 115, 256, 262, 110, 259, 261, 256, 46]}, {"corpus": "cats", "k": 8, "text": "that rat ate the mat", "ids": [116, 104, 256, 263, 256, 32, 256, 101, 259, 261, 256]}, {"corpus": "cats", "k": 30, "text": "that rat ate the mat", "ids": [116, 104, 256, 268, 32, 256, 101, 259, 266]}, {"corpus": "cats", "k": 30, "text": "café 猫 🙂", "ids": [99, 97, 102, 195, 169, 32, 231, 140, 171, 32, 240, 159, 153, 130]}, {"corpus": "cats_nosplit", "k": 30, "text": "the cat sat on the mat.", "ids": [259, 263, 269]}, {"corpus": "sennrich", "k": 30, "text": "lowest newer widest low", "ids": [259, 257, 263, 269, 268, 261]}, {"corpus": "code", "k": 40, "text": "for k in range(10):\n    print(k)\n", "ids": [271, 32, 107, 261, 273, 40, 263, 262, 268, 272, 40, 107, 41, 10]}];
const TEXT: Record<string, string> = { cats: CATS, catsNoSplit: CATS, sennrich: SENNRICH, code: CODE };
const CATS_TOKENS = [68, 59, 53, 47, 42, 40, 38, 36, 34, 32, 30, 28, 26, 24, 22];

const asTable = (ms: ReturnType<typeof train>) => ms.map((m) => [m.pair[0], m.pair[1], m.id, m.count]);
const learn = (name: string) => train(TEXT[name], 60, { split: name !== 'catsNoSplit' });

describe('pre-tokenisation', () => {
  it('keeps the space with the word that follows it, like GPT-2', () => {
    expect(pretokenize('the cat sat.')).toEqual(['the', ' cat', ' sat', '.']);
    expect(pretokenize("don't stop")).toEqual(['don', "'t", ' stop']);
    expect(pretokenize('year 2024')).toEqual(['year', ' 2024']);
  });
  it('gives code indentation its own pre-token', () => {
    expect(pretokenize('a\n    b')).toEqual(['a', '\n   ', ' b']);
  });
  it('can be switched off, and an empty text has no pieces', () => {
    expect(pretokenize('the cat', false)).toEqual(['the cat']);
    expect(pretokenize('')).toEqual([]);
  });
  it('counts repeated words once, with their frequency', () => {
    const w = wordsFromText('a a a b');
    expect(w).toEqual([{ ids: [97], count: 1 }, { ids: [32, 97], count: 2 }, { ids: [32, 98], count: 1 }]);
  });
});

describe('pair counting and merging', () => {
  it('weights each pair by the word frequency', () => {
    const top = countPairs(wordsFromText(CATS)).slice(0, 6).map((p) => [p.pair[0], p.pair[1], p.count]);
    expect(top).toEqual([[97, 116, 9], [104, 101, 6], [116, 104, 6], [32, 116, 5], [32, 99, 2], [32, 109, 2]]);
  });
  it('merges left to right without overlaps', () => {
    expect(mergeIds([1, 1, 1], [1, 1], 9)).toEqual([9, 1]);
    expect(mergeIds([1, 1, 1, 1], [1, 1], 9)).toEqual([9, 9]);
    expect(mergeIds([5, 1, 2, 1, 2], [1, 2], 9)).toEqual([5, 9, 9]);
    expect(mergeIds([7], [1, 2], 9)).toEqual([7]);
  });
});

describe('training matches the Python reference', () => {
  for (const name of Object.keys(REF)) {
    it('learns the same merges, ids and counts on ' + name, () => {
      expect(asTable(learn(name))).toEqual(REF[name]);
    });
  }
  it('stops early when no pair repeats, and respects the merge limit', () => {
    expect(learn('cats').length).toBe(14);
    expect(train(CATS, 3).length).toBe(3);
    expect(train('abcdefg', 10).length).toBe(0);
    expect(train(CATS, 5, { minCount: 1 }).length).toBe(5);
  });
  it('follows the corpus size down as merges are applied: 68 tokens to 22', () => {
    const base = wordsFromText(CATS);
    const merges = learn('cats');
    const sizes = merges.map((_, i) => totalTokens(applyMerges(base, merges, i)));
    sizes.push(totalTokens(applyMerges(base, merges)));
    expect(sizes).toEqual(CATS_TOKENS);
  });
  it('reproduces Sennrich et al.: with this corpus es, est, lo, low are the first four merges', () => {
    const v = vocabBytes(learn('sennrich'));
    const first4 = learn('sennrich').slice(0, 4).map((m) => String.fromCharCode(...(v.get(m.id) ?? [])));
    expect(first4).toEqual(['es', 'est', 'lo', 'low']);
  });
});

describe('encoding', () => {
  for (const t of ENC) {
    it(`encodes "${t.text.replace(/\n/g, '\\n')}" after ${t.k} merges of ${t.corpus} as the reference does`, () => {
      const key = t.corpus === 'cats_nosplit' ? 'catsNoSplit' : t.corpus;
      const merges = learn(key).slice(0, t.k);
      expect(encode(t.text, merges, key !== 'catsNoSplit')).toEqual(t.ids);
    });
  }
  it('never has an unknown token: any text round-trips, including accents, Chinese and emoji', () => {
    const merges = learn('cats');
    for (const s of ['the cat sat on the mat.', 'café 猫 🙂', '', '   ', 'a\n\nb', 'ΑΒΓ ünï']) {
      expect(decode(encode(s, merges), merges)).toBe(s);
    }
  });
  it('uses only byte ids when no merges have been learned', () => {
    expect(encode('hi', [])).toEqual([104, 105]);
    expect(encode('é', [])).toEqual([195, 169]);
  });
  it('encodes an unseen word into more pieces than a seen one', () => {
    const merges = learn('cats');
    expect(encode(' cat', merges).length).toBe(1);
    expect(encode(' that', merges).length).toBeGreaterThan(2);
  });
});

describe('labels', () => {
  it('shows spaces and newlines visibly and incomplete UTF-8 as hex', () => {
    expect(tokenLabel([32, 116, 104, 101])).toBe('·the');
    expect(tokenLabel([10])).toBe('↵');
    expect(tokenLabel([195])).toBe('0xC3');
    expect(tokenLabel([195, 169])).toBe('é');
  });
});
