import { describe, expect, it } from 'vitest';
import { CLUES, FRUITS, K, PER_KIND_TRAIN, accuracy, allCombos, bigSet, classify, confusion, orderClues, pairMix, scoreAll, shownSet, trainSet } from './colour-only';

describe('colour only what-if', () => {
  it('data are deterministic and the right size', () => {
    expect(trainSet()).toEqual(trainSet());
    expect(trainSet()).toHaveLength(4 * PER_KIND_TRAIN);
    expect(shownSet()).toHaveLength(24);
    for (const f of FRUITS) expect(shownSet().filter((x) => x.fruit === f)).toHaveLength(6);
    expect(bigSet()).toHaveLength(400);
    for (const x of bigSet()) for (const c of CLUES) expect(x[c]).toBeGreaterThan(0);
  });

  it('classifies by the most common kind among the 5 most similar training fruits (hand-checked)', () => {
    const t = (id: number, fruit: 'apple' | 'tomato', size: number) => ({ id, fruit, colour: 0.1, shape: 0.2, size });
    const train = [t(1, 'apple', 0.9), t(2, 'apple', 0.8), t(3, 'apple', 0.7), t(4, 'tomato', 0.3), t(5, 'tomato', 0.2), t(6, 'tomato', 0.25), t(7, 'tomato', 0.35), t(8, 'tomato', 0.4)];
    // a small fruit: its five nearest by size are 0.35, 0.3, 0.25, 0.4, 0.2 (all tomatoes)
    expect(classify(['size'], train, t(9, 'tomato', 0.33))).toBe('tomato');
    // colour alone cannot tell them apart: all distances are equal, so the first five win (3 apples, 2 tomatoes)
    expect(classify(['colour'], train, t(10, 'tomato', 0.3))).toBe('apple');
    expect(K).toBe(5);
  });

  it('colour alone confuses fruits of the same colour but never a red fruit with a yellow one', () => {
    const big = bigSet();
    const m = confusion(['colour'], big);
    // rows and columns: apple, tomato, banana, lemon
    expect(m[0][2] + m[0][3] + m[1][2] + m[1][3] + m[2][0] + m[2][1] + m[3][0] + m[3][1]).toBe(0);
    expect(m[0][1]).toBeGreaterThan(25);
    expect(m[3][2]).toBeGreaterThan(25);
    expect(accuracy(['colour'], big)).toBeGreaterThan(0.45);
    expect(accuracy(['colour'], big)).toBeLessThan(0.65);
    expect(pairMix(['colour'], big, 'red')).toBeGreaterThan(0.3);
    expect(pairMix(['colour'], big, 'yellow')).toBeGreaterThan(0.3);
    for (const row of m) expect(row.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('a second clue fixes its own pair: size separates apples from tomatoes, shape separates bananas from lemons', () => {
    const big = bigSet();
    expect(pairMix(['colour', 'size'], big, 'red')).toBeLessThan(0.05);
    expect(pairMix(['colour', 'shape'], big, 'yellow')).toBeLessThan(0.02);
    expect(pairMix(['colour', 'shape'], big, 'red')).toBeGreaterThan(0.2); // shape does not help the red pair
    expect(accuracy(['colour', 'size'], big)).toBeGreaterThan(accuracy(['colour'], big) + 0.3);
    expect(accuracy(['colour', 'shape', 'size'], big)).toBeGreaterThan(0.97);
  });

  it('colour only is the worst or tied for worst of all seven clue sets, and all three clues the best', () => {
    const combos = allCombos(bigSet());
    expect(combos).toHaveLength(7);
    expect(combos[0].clues).toEqual(['colour', 'shape', 'size']);
    expect(combos[6].clues).toEqual(['colour']);
  });

  it('shown fruits: scoring agrees with the confusion table, and clue order does not matter', () => {
    const s = scoreAll(['colour'], shownSet());
    expect(s).toHaveLength(24);
    expect(accuracy(['colour'], shownSet())).toBe(s.filter((x) => x.right).length / 24);
    expect(orderClues(['size', 'colour'])).toEqual(['colour', 'size']);
    const c = confusion(['colour', 'shape', 'size'], shownSet());
    expect(c.flat().reduce((a, b) => a + b, 0)).toBe(24);
  });
});
