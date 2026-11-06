import { describe, expect, it } from 'vitest';
import { accuracy, collapse, initNet, makeXor, rng, runAll, score, train } from './no-activation-function';

describe('no activation function what-if', () => {
  it('the random generator is deterministic', () => {
    const a = rng(5);
    const b = rng(5);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(rng(5)()).not.toBe(rng(6)());
  });

  it('the dataset is four blobs with opposite corners sharing a class', () => {
    const d = makeXor(20, 7);
    expect(d).toHaveLength(80);
    expect(d.filter((p) => p.label === 1)).toHaveLength(40);
    // the means of the two classes are both close to the origin, so no line can separate them
    const mean = (l: 0 | 1) => {
      const s = d.filter((p) => p.label === l);
      return [s.reduce((a, p) => a + p.x, 0) / s.length, s.reduce((a, p) => a + p.y, 0) / s.length];
    };
    expect(Math.abs(mean(0)[0])).toBeLessThan(0.25);
    expect(Math.abs(mean(1)[1])).toBeLessThan(0.25);
  });

  it('collapse multiplies a hand-checked 2 layer example', () => {
    // layer 1: [[1,2],[3,4]], bias [1,0]; layer 2: [[1,-1]], bias [5]
    // W = [1,-1] * [[1,2],[3,4]] = [-2,-2]; b = [1,-1] . [1,0] + 5 = 6
    const c = collapse([
      { w: [[1, 2], [3, 4]], b: [1, 0] },
      { w: [[1, -1]], b: [5] },
    ]);
    expect(c.w).toEqual([-2, -2]);
    expect(c.b).toBe(6);
  });

  it('a stack of linear layers gives exactly the same answers as the one collapsed line', () => {
    for (const hidden of [1, 2, 3, 4]) {
      const net = initNet(hidden, 6, 'none', 3 + hidden);
      const { w, b } = collapse(net.layers);
      for (const [x, y] of [[0.3, -0.7], [-1.2, 0.4], [2, 2], [0, 0]]) {
        expect(score(net, x, y)).toBeCloseTo(w[0] * x + w[1] * y + b, 10);
      }
    }
  });

  it('collapse still holds after training', () => {
    const data = makeXor();
    const { net } = train(initNet(3, 6, 'none', 9), data, 100);
    const { w, b } = collapse(net.layers);
    for (const p of data.slice(0, 10)) expect(score(net, p.x, p.y)).toBeCloseTo(w[0] * p.x + w[1] * p.y + b, 9);
  });

  it('the linear stack stays near chance at every depth, the tanh network learns the pattern', () => {
    const { trials } = runAll();
    expect(trials).toHaveLength(8);
    for (const t of trials.filter((t) => t.activation === 'none')) {
      expect(t.accuracy).toBeLessThan(0.65);
      expect(t.finalLoss).toBeGreaterThan(0.65); // stuck near ln 2 = 0.693
    }
    for (const t of trials.filter((t) => t.activation === 'tanh')) {
      expect(t.accuracy).toBeGreaterThan(0.95);
      expect(t.finalLoss).toBeLessThan(0.2);
    }
  });

  it('training lowers the loss for the network with an activation', () => {
    const { losses } = train(initNet(2, 6, 'tanh', 4), makeXor(), 300);
    expect(losses[299]).toBeLessThan(losses[0]);
    expect(accuracy(initNet(2, 6, 'none', 1), makeXor())).toBeLessThan(0.8);
  });
});
