import { beforeAll, describe, expect, it } from 'vitest';
import { DIM, features, finalAccuracy, HIDDEN, label, learningCurve, runAll, SIZES, EPOCHS, EVERY, type Curve } from './no-pretraining';

let all: ReturnType<typeof runAll>;
beforeAll(() => {
  all = runAll();
}, 30000);

const at = (n: number): Curve => all.curves[SIZES.indexOf(n as (typeof SIZES)[number])];

describe('no pretraining what-if (toy)', () => {
  it('feature extractor with zero weights returns tanh of the bias', () => {
    const f = features({ w: Array.from({ length: HIDDEN }, () => Array(DIM).fill(0)), b: Array(HIDDEN).fill(0.5) }, Array(DIM).fill(3));
    for (const v of f) expect(v).toBeCloseTo(Math.tanh(0.5), 12);
  });

  it('labels are the sign of a direction in the hidden factors', () => {
    expect(label([1, 0, 0], [0.2, -5, 5])).toBe(1);
    expect(label([1, 0, 0], [-0.2, 5, 5])).toBe(0);
  });

  it('has a curve for every labelled-set size, from epoch 0 to the last', () => {
    expect(all.curves).toHaveLength(SIZES.length);
    for (const c of all.curves) {
      expect(c.epochs[0]).toBe(0);
      expect(c.epochs[c.epochs.length - 1]).toBe(EPOCHS);
      expect(c.epochs[1]).toBe(EVERY);
      expect(c.scratch).toHaveLength(c.epochs.length);
      expect(c.pretrained).toHaveLength(c.epochs.length);
    }
  });

  it('both start near chance before any training on the new task', () => {
    for (const c of all.curves) {
      expect(c.scratch[0]).toBeGreaterThan(0.35);
      expect(c.scratch[0]).toBeLessThan(0.65);
    }
  });

  it('with few labels the pretrained start beats training from scratch by a wide margin', () => {
    for (const n of [4, 8, 16]) {
      const f = finalAccuracy(at(n));
      expect(f.pretrained - f.scratch, `n=${n}`).toBeGreaterThan(0.1);
    }
  });

  it('with plenty of labels, scratch catches up: the gap shrinks as labels grow', () => {
    const gap = (n: number) => finalAccuracy(at(n)).pretrained - finalAccuracy(at(n)).scratch;
    expect(gap(64)).toBeLessThan(gap(8));
    expect(gap(64)).toBeLessThan(0.1);
  });

  it('more labels help the scratch network', () => {
    expect(finalAccuracy(at(64)).scratch).toBeGreaterThan(finalAccuracy(at(4)).scratch + 0.15);
  });

  it('the pretrained learner is quick: most of its final accuracy arrives in the first 10 epochs', () => {
    const c = at(8);
    expect(c.pretrained[2]).toBeGreaterThan(c.pretrained[c.pretrained.length - 1] - 0.05);
  });

  it('is deterministic', () => {
    const a = learningCurve(8, all.extractor, 2);
    const b = learningCurve(8, all.extractor, 2);
    expect(a).toEqual(b);
  });
});
