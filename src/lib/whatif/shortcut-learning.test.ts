import { describe, expect, it } from 'vitest';
import { STRENGTHS, accuracy, bigPhotos, curve, labBg, learn, makePhotos, says, scoreTests, shownPhotos, swappedBg, trainPhotos } from './shortcut-learning';

describe('shortcut learning what-if', () => {
  it('data are deterministic and balanced', () => {
    expect(trainPhotos()).toEqual(trainPhotos());
    expect(trainPhotos()).toHaveLength(40);
    expect(trainPhotos().filter((p) => p.animal === 'wolf')).toHaveLength(20);
    expect(shownPhotos()).toHaveLength(12);
    expect(shownPhotos().filter((p) => p.animal === 'wolf')).toHaveLength(6);
    expect(bigPhotos()).toHaveLength(400);
  });

  it('backgrounds: exactly the chosen share of each kind matches, and swapping flips every one', () => {
    const big = bigPhotos();
    for (const s of STRENGTHS) {
      const matched = big.filter((p) => (labBg(p, s) === 'snow') === (p.animal === 'wolf')).length;
      expect(matched).toBe(4 * s);
      for (const p of big.slice(0, 20)) expect(swappedBg(p, s)).not.toBe(labBg(p, s));
    }
    // nested: a photo that matches at 60 percent still matches at 80 percent
    const p = makePhotos(40, 1);
    for (const x of p) if (labBg(x, 60) === (x.animal === 'wolf' ? 'snow' : 'grass')) expect(labBg(x, 80)).toBe(x.animal === 'wolf' ? 'snow' : 'grass');
  });

  it('the helper picks the clue with most training photos right, tie to the animal look (hand-checked counts)', () => {
    const l90 = learn(90);
    expect(l90.trainN).toBe(40);
    expect(l90.trainRight.background).toBe(36);
    expect(l90.picked).toBe('background');
    expect(learn(100).trainRight.background).toBe(40);
    expect(learn(50).trainRight.background).toBe(20);
    expect(learn(50).picked).toBe('look');
    expect(learn(100).trainRight.look).toBe(learn(50).trainRight.look); // the animal's look does not depend on the background
    // the look clue alone is a fuzzy clue: clearly better than guessing, clearly short of perfect
    expect(learn(50).trainRight.look).toBeGreaterThan(26);
    expect(learn(50).trainRight.look).toBeLessThan(38);
  });

  it('a shortcut rule answers from the background only', () => {
    const r = learn(90).rule;
    const wolfy = { id: 1, animal: 'husky' as const, look: 0.99, u: 0 };
    expect(says(r, wolfy, 'snow')).toBe('wolf');
    expect(says(r, wolfy, 'grass')).toBe('husky');
  });

  it('with a strong shortcut: great in the lab, bad when backgrounds swap', () => {
    const big = bigPhotos();
    expect(accuracy(90, false, big)).toBeCloseTo(0.9, 5);
    expect(accuracy(90, true, big)).toBeCloseTo(0.1, 5);
    expect(accuracy(100, false, big)).toBeGreaterThan(0.99);
    expect(accuracy(100, true, big)).toBeLessThan(0.01);
    expect(scoreTests(90, true, shownPhotos())).toHaveLength(12);
  });

  it('with no link the helper learns the real clue, and swapping backgrounds changes nothing', () => {
    const big = bigPhotos();
    for (const s of [50, 60, 70]) {
      expect(learn(s).picked).toBe('look');
      expect(accuracy(s, false, big)).toBe(accuracy(s, true, big));
      expect(accuracy(s, true, big)).toBeGreaterThan(0.7);
    }
  });

  it('the lab score and the real-world score go in opposite directions once the shortcut is taken', () => {
    const c = curve(bigPhotos());
    const taken = c.filter((x) => x.picked === 'background');
    expect(taken.length).toBeGreaterThan(0);
    for (let i = 1; i < taken.length; i++) {
      expect(taken[i].lab).toBeGreaterThan(taken[i - 1].lab);
      expect(taken[i].swapped).toBeLessThan(taken[i - 1].swapped);
    }
    for (const t of taken) expect(t.lab + t.swapped).toBeCloseTo(1, 5);
  });
});
