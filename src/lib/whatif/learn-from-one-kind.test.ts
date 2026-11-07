import { describe, expect, it } from 'vitest';
import { CATS, MAX_DOGS, accuracy, bigTest, curve, perKind, score, says, testPics, trainingSet } from './learn-from-one-kind';

describe('learn from one kind what-if', () => {
  it('data are deterministic and have the sizes the screen shows', () => {
    expect(trainingSet(3)).toEqual(trainingSet(3));
    expect(trainingSet(0)).toHaveLength(CATS);
    expect(trainingSet(MAX_DOGS)).toHaveLength(CATS + MAX_DOGS);
    expect(trainingSet(99)).toHaveLength(CATS + MAX_DOGS);
    const t = testPics();
    expect(t).toHaveLength(12);
    expect(t.filter((p) => p.kind === 'cat')).toHaveLength(6);
    expect(bigTest().filter((p) => p.kind === 'dog')).toHaveLength(100);
    for (const p of trainingSet(MAX_DOGS)) {
      expect(p.ears).toBeGreaterThan(0);
      expect(p.ears).toBeLessThan(1);
    }
  });

  it('only cats in training: everything is called a cat, so accuracy is exactly the share of cats', () => {
    const t = testPics();
    for (const s of score(0, t)) expect(s.said).toBe('cat');
    expect(accuracy(0, t)).toBe(0.5);
    expect(accuracy(0, bigTest())).toBe(0.5);
    const k = perKind(0, t);
    expect(k).toEqual({ dogsRight: 0, dogsTotal: 6, catsRight: 6, catsTotal: 6 });
  });

  it('copies the label of the nearest training picture (hand-checked)', () => {
    const train = [
      { id: 1, kind: 'cat' as const, ears: 0.9, snout: 0.2 },
      { id: 2, kind: 'dog' as const, ears: 0.3, snout: 0.8 },
    ];
    expect(says(train, { id: 3, kind: 'dog', ears: 0.4, snout: 0.6 })).toBe('dog');
    expect(says(train, { id: 4, kind: 'cat', ears: 0.8, snout: 0.3 })).toBe('cat');
    // exact tie: the earlier training picture wins
    expect(says(train, { id: 5, kind: 'cat', ears: 0.6, snout: 0.5 })).toBe('cat');
  });

  it('adding dogs helps: the full set is much better than cats only', () => {
    const t = testPics();
    const c = curve(t);
    expect(c[0]).toBe(0.5);
    expect(c[MAX_DOGS]).toBeGreaterThanOrEqual(0.75);
    expect(c[MAX_DOGS]).toBeGreaterThan(c[0]);
    const big = curve(bigTest());
    expect(big[0]).toBe(0.5);
    expect(big[MAX_DOGS]).toBeGreaterThan(0.9);
    expect(big[MAX_DOGS]).toBeGreaterThan(big[1]);
    // with one dog the helper already gets some dogs right; with ten it recognises most of them
    expect(perKind(1, bigTest()).dogsRight).toBeGreaterThan(0);
    expect(perKind(MAX_DOGS, bigTest()).dogsRight).toBeGreaterThan(perKind(1, bigTest()).dogsRight);
  });

  it('every step with at least one dog beats cats only on the steady test set, and the curve is mostly rising', () => {
    const big = curve(bigTest());
    for (let d = 1; d <= MAX_DOGS; d++) expect(big[d]).toBeGreaterThan(0.5);
    // the biggest training set is the best one, and the last five steps never fall by more than 2 points
    expect(Math.max(...big)).toBe(big[MAX_DOGS]);
    for (let d = 6; d <= MAX_DOGS; d++) expect(big[d]).toBeGreaterThanOrEqual(big[d - 1] - 0.02);
  });
});
