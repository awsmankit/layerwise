import { describe, expect, it } from 'vitest';
import {
  BLANK,
  alignmentCount,
  argmaxPath,
  collapse,
  collapseSteps,
  editDistance,
  greedyDecode,
  normaliseRows,
  pathProbability,
  prefixBeamSearch,
  temper,
  textProbability,
  topAlignments,
  type Probs,
} from './ctc';
import { SCENARIOS } from './ctc-scenarios';

/** Small deterministic random generator (LCG) so the random tests are repeatable. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
const randomProbs = (T: number, K: number, seed: number): Probs => {
  const r = rng(seed);
  return normaliseRows(Array.from({ length: T }, () => Array.from({ length: K }, () => r() + 0.05)));
};

/** Every path of length T over K symbols, as arrays. */
function* allPaths(T: number, K: number): Generator<number[]> {
  const path = new Array<number>(T).fill(0);
  while (true) {
    yield [...path];
    let i = T - 1;
    while (i >= 0 && path[i] === K - 1) path[i--] = 0;
    if (i < 0) return;
    path[i]++;
  }
}

describe('collapse', () => {
  // symbols: 0 = blank, 1 = a, 2 = b
  it('merges repeats and drops blanks', () => {
    expect(collapse([1, 1, 0, 2, 2, 2, 0])).toEqual([1, 2]);
    expect(collapse([0, 0, 0])).toEqual([]);
  });
  it('keeps a double letter only when a blank separates it', () => {
    expect(collapse([1, 1, 1])).toEqual([1]);
    expect(collapse([1, 0, 1])).toEqual([1, 1]);
  });
  it('shows the stages', () => {
    const [path, merged, text] = collapseSteps([0, 1, 1, 0, 1, 2, 2]);
    expect(path).toEqual([0, 1, 1, 0, 1, 2, 2]);
    expect(merged).toEqual([0, 1, 0, 1, 2]);
    expect(text).toEqual([1, 1, 2]);
  });
});

describe('probabilities', () => {
  it('sums to the same total over all texts as over all paths (brute force, T=4, K=3)', () => {
    const probs = randomProbs(4, 3, 11);
    const byText = new Map<string, number>();
    let total = 0;
    for (const path of allPaths(4, 3)) {
      const p = pathProbability(probs, path);
      total += p;
      const k = collapse(path).join(',');
      byText.set(k, (byText.get(k) ?? 0) + p);
    }
    expect(total).toBeCloseTo(1, 12);
    for (const [k, p] of byText) {
      const text = k === '' ? [] : k.split(',').map(Number);
      expect(textProbability(probs, text)).toBeCloseTo(p, 12);
    }
  });

  it('counts alignments the same way as brute force', () => {
    for (const target of [[], [1], [1, 2], [1, 1], [1, 2, 1]]) {
      for (const T of [3, 4, 5, 6]) {
        let n = 0;
        for (const path of allPaths(T, 3)) if (collapse(path).join(',') === target.join(',')) n++;
        expect(alignmentCount(T, target, 3)).toBe(n);
      }
    }
  });

  it('lists alignments best first, each one collapsing to the target', () => {
    const probs = randomProbs(6, 3, 5);
    const target = [1, 2];
    const found = topAlignments(probs, target, 1000);
    expect(found.length).toBe(alignmentCount(6, target, 3));
    for (const f of found) expect(collapse(f.path)).toEqual(target);
    for (let i = 1; i < found.length; i++) expect(found[i - 1].p).toBeGreaterThanOrEqual(found[i].p);
    expect(found.reduce((s, f) => s + f.p, 0)).toBeCloseTo(textProbability(probs, target), 12);
  });
});

describe('the two-frame example from the CTC literature', () => {
  // blank 0.6, a 0.4 in both frames: the best path is blank-blank (empty text, 0.36), yet "a" has 0.64 in total
  const probs: Probs = [
    [0.6, 0.4],
    [0.6, 0.4],
  ];
  it('greedy decoding gives the empty text but "a" is more probable', () => {
    expect(argmaxPath(probs)).toEqual([0, 0]);
    expect(greedyDecode(probs)).toEqual([]);
    expect(textProbability(probs, [])).toBeCloseTo(0.36, 12);
    expect(textProbability(probs, [1])).toBeCloseTo(0.64, 12);
  });
  it('beam search with width 2 finds "a"', () => {
    const best = prefixBeamSearch(probs, 2)[0];
    expect(best.text).toEqual([1]);
    expect(best.p).toBeCloseTo(0.64, 12);
  });
});

describe('prefix beam search', () => {
  it('with a wide beam matches the brute-force best text and its probability', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const probs = randomProbs(5, 3, seed * 7);
      const byText = new Map<string, number>();
      for (const path of allPaths(5, 3)) {
        const k = collapse(path).join(',');
        byText.set(k, (byText.get(k) ?? 0) + pathProbability(probs, path));
      }
      const [bestKey, bestP] = [...byText.entries()].sort((a, b) => b[1] - a[1])[0];
      const got = prefixBeamSearch(probs, 1000)[0];
      expect(got.text.join(',')).toBe(bestKey);
      expect(got.p).toBeCloseTo(bestP, 10);
    }
  });
  it('reports probabilities that match the forward algorithm, whatever the width', () => {
    const probs = randomProbs(6, 4, 99);
    for (const width of [1, 2, 5]) {
      const beams = prefixBeamSearch(probs, width);
      expect(beams.length).toBeLessThanOrEqual(width);
      // a text's reported probability can only be lower than or equal to its true probability (pruned paths are lost)
      for (const h of beams) expect(h.p).toBeLessThanOrEqual(textProbability(probs, h.text) + 1e-12);
    }
  });
});

describe('temper', () => {
  it('leaves temperature 1 alone, flattens above it and keeps rows summing to 1', () => {
    const probs: Probs = [[0.7, 0.2, 0.1]];
    expect(temper(probs, 1)[0][0]).toBeCloseTo(0.7, 12);
    const flat = temper(probs, 3)[0];
    expect(flat[0]).toBeLessThan(0.7);
    expect(flat.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });
});

describe('editDistance', () => {
  it('matches known values', () => {
    expect([...'kitten'].length).toBe(6);
    expect(editDistance([...'kitten'], [...'sitting'])).toBe(3);
    expect(editDistance([], [1, 2])).toBe(2);
    expect(editDistance([1, 2, 3], [1, 2, 3])).toBe(0);
  });
});

describe('lesson scenarios (the claims made in the text)', () => {
  const text = (sc: (typeof SCENARIOS)[number], t: number[]) => t.map((i) => sc.symbols[i]).join('');
  const by = (id: string) => SCENARIOS.find((s) => s.id === id)!;

  it('every row is a probability distribution with the blank first', () => {
    for (const sc of SCENARIOS) {
      expect(sc.symbols[BLANK]).toBe('_');
      for (const row of sc.probs) {
        expect(row.length).toBe(sc.symbols.length);
        expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
      }
    }
  });
  it('the clear "cat" decodes to cat with many alignments', () => {
    const sc = by('cat');
    expect(text(sc, greedyDecode(sc.probs))).toBe('cat');
    expect(alignmentCount(sc.probs.length, [1, 2, 3], sc.symbols.length)).toBe(1716);
  });
  it('"hello" needs the blank between the two l letters', () => {
    const sc = by('hello');
    expect(text(sc, greedyDecode(sc.probs))).toBe('hello');
    expect(text(sc, collapse([0, 1, 1, 2, 2, 3, 3, 3, 3, 4, 4, 0]))).toBe('helo');
  });
  it('"yes": greedy gives nothing, beam width 1 also, width 2 or more finds yes', () => {
    const sc = by('yes');
    expect(greedyDecode(sc.probs)).toEqual([]);
    expect(prefixBeamSearch(sc.probs, 1)[0].text).toEqual([]);
    for (const w of [2, 4, 8]) expect(text(sc, prefixBeamSearch(sc.probs, w)[0].text)).toBe('yes');
  });
  it('the flickering "cat": greedy spells caat, a beam of 4 finds cat, and cat is the more probable text', () => {
    const sc = by('flicker');
    const greedy = greedyDecode(sc.probs);
    expect(text(sc, greedy)).toBe('caat');
    expect(text(sc, prefixBeamSearch(sc.probs, 4)[0].text)).toBe('cat');
    expect(textProbability(sc.probs, [1, 2, 3])).toBeGreaterThan(textProbability(sc.probs, greedy));
  });
});
