import { describe, expect, it } from 'vitest';
import {
  CENTRES,
  CLASSES,
  DIM,
  backgroundShare,
  fitSoftmax,
  infoNce,
  infoNceOne,
  initWeights,
  makeItems,
  makePairs,
  makeView,
  meanPairAngle,
  neighbourPurity,
  newTrainer,
  predict,
  pretrain,
  rng,
  train,
  transferCurve,
} from './selfsup';

describe('data', () => {
  it('is deterministic and balanced', () => {
    const a = makeItems(30, 5);
    const b = makeItems(30, 5);
    expect(a).toEqual(b);
    expect(a.filter((i) => i.cls === 0)).toHaveLength(10);
    expect(a[0].x).toHaveLength(DIM);
  });
  it('puts the class in dims 2 and 3 in the shifted domain', () => {
    const items = makeItems(300, 2, 'shifted');
    const mean = (c: number, d: number) => items.filter((i) => i.cls === c).reduce((s, i) => s + i.x[d], 0) / 100;
    for (let c = 0; c < CLASSES; c++) {
      expect(mean(c, 2)).toBeCloseTo(CENTRES[c][0], 0);
      expect(Math.abs(mean(c, 0))).toBeLessThan(0.7);
    }
  });
  it('copies the background at aug 0 and redraws it at aug 1', () => {
    const [item] = makeItems(1, 1);
    const same = makeView(item, 0, rng(1));
    expect(Math.abs(same[2] - item.x[2])).toBeLessThan(1e-9);
    const redrawn = makeView(item, 1, rng(1));
    expect(Math.abs(redrawn[2] - item.x[2])).toBeGreaterThan(0.01);
    expect(Math.abs(redrawn[0] - item.x[0])).toBeLessThan(0.6); // content only gets a small nudge
  });
});

describe('InfoNCE', () => {
  it('worked example: positive 0.9, negatives 0.2, 0 and -0.3 at temperature 0.5', () => {
    const l = infoNceOne(0.9, [0.2, 0, -0.3], 0.5);
    const e = [Math.exp(1.8), Math.exp(0.4), 1, Math.exp(-0.6)];
    expect(l).toBeCloseTo(-Math.log(e[0] / (e[0] + e[1] + e[2] + e[3])), 12);
    expect(l).toBeCloseTo(0.4072, 3);
  });
  it('is large when a negative looks more like the anchor than the positive does', () => {
    expect(infoNceOne(0.2, [0.9, 0, -0.3], 0.5)).toBeGreaterThan(1.5);
  });
  it('a lower temperature sharpens the loss', () => {
    expect(infoNceOne(0.9, [0.2, 0, -0.3], 0.1)).toBeLessThan(infoNceOne(0.9, [0.2, 0, -0.3], 0.5));
  });
  it('has a gradient that matches finite differences', () => {
    const items = makeItems(6, 4);
    const pairs = makePairs(items, 0.7, 11);
    const W = initWeights(2);
    const { grad } = infoNce(W, pairs, 0.5);
    const h = 1e-5;
    for (let d = 0; d < 2; d++)
      for (let j = 0; j < DIM; j++) {
        const up = W.map((r) => [...r]);
        const dn = W.map((r) => [...r]);
        up[d][j] += h;
        dn[d][j] -= h;
        const num = (infoNce(up, pairs, 0.5).loss - infoNce(dn, pairs, 0.5).loss) / (2 * h);
        expect(grad[d][j]).toBeCloseTo(num, 6);
      }
  });
});

describe('contrastive training', () => {
  it('with strong augmentation, classes separate and the encoder ignores the background', () => {
    for (const seed of [3, 5, 7]) {
      const items = makeItems(36, seed);
      const tr0 = newTrainer(seed);
      const tr = train(tr0, items, 1, 0.5, seed, 150);
      expect(tr.loss).toBeLessThan(tr0.loss || Infinity);
      expect(neighbourPurity(tr.W, items)).toBeGreaterThan(0.9);
      expect(backgroundShare(tr.W)).toBeLessThan(0.05);
      expect(meanPairAngle(tr.W, makePairs(items, 1, 9))).toBeLessThan(15);
    }
  });
  it('with no augmentation, the background is a shortcut and the classes stay mixed', () => {
    for (const seed of [3, 5, 7]) {
      const items = makeItems(36, seed);
      const tr = train(newTrainer(seed), items, 0, 0.5, seed, 150);
      expect(neighbourPurity(tr.W, items)).toBeLessThan(0.7);
      expect(backgroundShare(tr.W)).toBeGreaterThan(0.05);
    }
  });
});

describe('transfer', () => {
  it('fits a softmax head that separates three clear clusters', () => {
    const feats = [[2, 0], [2.1, 0.1], [-1, 1.7], [-1.1, 1.8], [-1, -1.7], [-1, -1.8]];
    const y = [0, 0, 1, 1, 2, 2];
    const Wc = fitSoftmax(feats, y);
    expect(y.every((c, i) => predict(Wc, feats[i]) === c)).toBe(true);
  });
  it('pretrained features beat training from scratch on few labels, and scratch catches up', () => {
    const c = transferCurve(pretrain(), 'source');
    expect(c[0].frozen).toBeGreaterThan(c[0].scratch + 0.3);
    expect(c[c.length - 1].scratch).toBeGreaterThan(0.95);
    expect(c[c.length - 1].scratch).toBeGreaterThan(c[0].scratch);
  });
  it('frozen features fail when the new task depends on what pretraining threw away', () => {
    const c = transferCurve(pretrain(), 'shifted');
    expect(c[c.length - 1].frozen).toBeLessThan(0.5);
    expect(c[c.length - 1].scratch).toBeGreaterThan(0.95);
  });
  it('pretraining without augmentation gives weaker features', () => {
    const good = transferCurve(pretrain(1), 'source')[0].frozen;
    const poor = transferCurve(pretrain(0), 'source')[0].frozen;
    expect(poor).toBeLessThan(good - 0.2);
  });
});
