import { describe, expect, it } from 'vitest';
import { clippedTerm, groupStats, grpoUpdate, isClipped, kl, logitsFromProbs, probCorrect, sampleGroup, softmax, train } from './grpo';

describe('group advantages', () => {
  it('one right answer in four: mean 0.25, std 0.5, advantages +1.5 and -0.5', () => {
    const s = groupStats([1, 0, 0, 0]);
    expect(s.mean).toBeCloseTo(0.25, 12);
    expect(s.std).toBeCloseTo(0.5, 12);
    expect(s.advantages[0]).toBeCloseTo(1.5, 12);
    expect(s.advantages[1]).toBeCloseTo(-0.5, 12);
  });
  it('two right answers in eight: mean 0.25, sample std 0.4629', () => {
    const s = groupStats([1, 1, 0, 0, 0, 0, 0, 0]);
    expect(s.mean).toBeCloseTo(0.25, 12);
    expect(s.std).toBeCloseTo(Math.sqrt(1.5 / 7), 12);
    expect(s.advantages[0]).toBeCloseTo(0.75 / Math.sqrt(1.5 / 7), 10);
  });
  it('advantages sum to zero', () => {
    const s = groupStats([1, 0, 1, 1, 0, 0, 0, 1]);
    expect(s.advantages.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 12);
  });
  it('a group that is all right or all wrong has no signal', () => {
    expect(groupStats([1, 1, 1, 1]).advantages).toEqual([0, 0, 0, 0]);
    expect(groupStats([0, 0, 0]).advantages).toEqual([0, 0, 0]);
  });
  it('rewards of any scale give the same advantages', () => {
    const a = groupStats([1, 0, 0, 1]).advantages;
    const b = groupStats([10, 0, 0, 10]).advantages;
    a.forEach((x, i) => expect(x).toBeCloseTo(b[i], 12));
  });
});

describe('clipped objective', () => {
  it('equals ratio x advantage inside the clip range', () => {
    expect(clippedTerm(1.1, 2, 0.2)).toBeCloseTo(2.2, 12);
  });
  it('caps a good sample whose probability already rose too far', () => {
    expect(clippedTerm(1.5, 2, 0.2)).toBeCloseTo(2.4, 12);
    expect(isClipped(1.5, 2, 0.2)).toBe(true);
  });
  it('for a bad sample, the minimum keeps the unclipped (more negative) term when the ratio is high', () => {
    expect(clippedTerm(1.5, -1, 0.2)).toBeCloseTo(-1.5, 12);
    expect(isClipped(1.5, -1, 0.2)).toBe(false);
  });
  it('stops pushing a bad sample once its probability fell below 1 - eps', () => {
    expect(clippedTerm(0.5, -1, 0.2)).toBeCloseTo(-0.8, 12);
    expect(isClipped(0.5, -1, 0.2)).toBe(true);
  });
});

describe('one update from the reference policy', () => {
  const ref = logitsFromProbs([0.4, 0.3, 0.2, 0.1]);
  const opts = { eps: 0.2, beta: 0.3, learningRate: 1, inner: 1 };
  it('moves each logit by lr x (sum of advantages of samples that chose it) / k', () => {
    // answers 0,2,2,3 drawn; only answer 0 is rewarded: advantages 1.5, -0.5, -0.5, -0.5
    const r = grpoUpdate(ref, ref, [0, 2, 2, 3], [1, 0, 0, 0], opts);
    expect(r.logits[0] - ref[0]).toBeCloseTo(1.5 / 4, 10);
    expect(r.logits[1] - ref[1]).toBeCloseTo(0, 10);
    expect(r.logits[2] - ref[2]).toBeCloseTo(-1 / 4, 10);
    expect(r.logits[3] - ref[3]).toBeCloseTo(-0.5 / 4, 10);
  });
  it('raises the probability of the rewarded answer', () => {
    const r = grpoUpdate(ref, ref, [0, 2, 2, 3], [1, 0, 0, 0], opts);
    expect(softmax(r.logits)[0]).toBeGreaterThan(0.4);
  });
  it('does nothing when the whole group got the same reward', () => {
    const r = grpoUpdate(ref, ref, [0, 1, 2, 3], [0, 0, 0, 0], opts);
    r.logits.forEach((x, i) => expect(x).toBeCloseTo(ref[i], 12));
  });
  it('the clip stops further movement within one group', () => {
    const o = { eps: 0.2, beta: 0, learningRate: 0.1, inner: 40 };
    const r = grpoUpdate(ref, ref, [0, 2, 2, 3], [1, 0, 0, 0], o);
    expect(r.ratios[0]).toBeGreaterThan(1.2);
    expect(r.ratios[0]).toBeLessThan(1.35);
    expect(r.clipped).toBeGreaterThan(0);
  });
});

describe('KL penalty', () => {
  const p = [0.22, 0.08, 0.25, 0.2, 0.15, 0.1];
  const correct = [true, true, false, false, false, false];
  const opts = (beta: number) => ({ eps: 0.2, beta, learningRate: 0.5, inner: 1 });
  it('KL of a distribution from itself is zero and positive otherwise', () => {
    expect(kl(p, p)).toBeCloseTo(0, 12);
    expect(kl([0.5, 0.5], [0.9, 0.1])).toBeGreaterThan(0);
  });
  it('training raises the rewarded probability', () => {
    const run = train(p, correct, 8, 30, opts(0.2), 1);
    expect(run.pCorrect[29]).toBeGreaterThan(probCorrect(p, correct) + 0.2);
  });
  it('a stronger KL penalty keeps the policy closer to the reference and learns less', () => {
    const free = train(p, correct, 8, 30, opts(0), 1);
    const leash = train(p, correct, 8, 30, opts(1), 1);
    expect(leash.kl[29]).toBeLessThan(free.kl[29]);
    expect(leash.pCorrect[29]).toBeLessThan(free.pCorrect[29]);
  });
  it('is reproducible for a given seed', () => {
    expect(train(p, correct, 8, 10, opts(0.2), 3).pCorrect).toEqual(train(p, correct, 8, 10, opts(0.2), 3).pCorrect);
  });
});

describe('sampling', () => {
  it('draws roughly in proportion to the probabilities', () => {
    const g = sampleGroup([0.7, 0.3], 2000, 5);
    const share = g.filter((x) => x === 0).length / g.length;
    expect(share).toBeGreaterThan(0.65);
    expect(share).toBeLessThan(0.75);
  });
  it('is deterministic for a seed', () => {
    expect(sampleGroup([0.2, 0.3, 0.5], 8, 9)).toEqual(sampleGroup([0.2, 0.3, 0.5], 8, 9));
  });
});
