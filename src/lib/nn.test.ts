import { describe, expect, it } from 'vitest';
import {
  DATASETS,
  accuracy,
  boundaryGrid,
  collapseLinear,
  createNet,
  forward,
  gradients,
  loss,
  makeData,
  neuronMaps,
  paramCount,
  rng,
  trainStep,
  weightAt,
  type Activation,
  type DatasetKind,
} from './nn';

function train(kind: DatasetKind, hidden: number[], activation: Activation, steps: number, seed = 1) {
  const data = makeData(kind, 120, seed);
  const net = createNet(hidden, activation, seed);
  for (let i = 0; i < steps; i++) trainStep(net, data);
  return { net, data };
}

describe('seeded randomness and data', () => {
  it('gives the same numbers for the same seed and different ones for another', () => {
    const a = rng(3);
    const b = rng(3);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(rng(3)()).not.toBe(rng(4)());
  });

  it('makes deterministic datasets inside the playground square', () => {
    for (const d of DATASETS) {
      const a = makeData(d.id, 120, 1);
      expect(a).toEqual(makeData(d.id, 120, 1));
      expect(a.length).toBe(120);
      const ones = a.filter((p) => p.label === 1).length;
      if (d.id === 'xor') expect(ones).toBeGreaterThan(40); // random corners: roughly balanced
      else expect(ones).toBe(60);
      if (d.id === 'xor') expect(ones).toBeLessThan(80);
      expect(a.every((p) => Math.abs(p.x) <= 1.2 && Math.abs(p.y) <= 1.2)).toBe(true);
    }
    expect(makeData('xor', 120, 1)).not.toEqual(makeData('xor', 120, 2));
  });
});

describe('network shape', () => {
  it('counts parameters by hand', () => {
    expect(paramCount([])).toBe(3); // 2 weights and a bias
    expect(paramCount([4])).toBe(2 * 4 + 4 + 4 * 1 + 1); // 17
    expect(paramCount([3, 3])).toBe(9 + 12 + 4);
    expect(createNet([3, 3], 'tanh').params.length).toBe(paramCount([3, 3]));
  });

  it('starts the same way for the same seed', () => {
    expect(Array.from(createNet([4], 'relu', 2).params)).toEqual(Array.from(createNet([4], 'relu', 2).params));
  });

  it('outputs a probability', () => {
    const net = createNet([4, 4], 'relu', 1);
    for (const [x, y] of [[0, 0], [1, -1], [-0.3, 0.8]]) {
      const p = forward(net, x, y);
      expect(p).toBeGreaterThan(0);
      expect(p).toBeLessThan(1);
    }
  });
});

describe('backpropagation', () => {
  for (const activation of ['tanh', 'sigmoid', 'relu', 'linear'] as const) {
    it(`matches a numerical gradient (${activation})`, () => {
      const data = makeData('circle', 30, 4);
      const net = createNet([3, 2], activation, 9);
      // nudge the biases off zero so ReLU units are not all sitting on a kink
      for (const o of net.offsets) for (let j = 0; j < 2; j++) net.params[o.b + j] += 0.07 * (j + 1);
      gradients(net, data);
      const analytic = Float64Array.from(net.grad);
      const h = 1e-5;
      for (let k = 0; k < net.params.length; k++) {
        const keep = net.params[k];
        net.params[k] = keep + h;
        const up = loss(net, data);
        net.params[k] = keep - h;
        const down = loss(net, data);
        net.params[k] = keep;
        expect(analytic[k]).toBeCloseTo((up - down) / (2 * h), 5);
      }
    });
  }
});

describe('training', () => {
  it('is deterministic: the same seed gives the same loss after the same steps', () => {
    const a = train('xor', [4], 'tanh', 50);
    const b = train('xor', [4], 'tanh', 50);
    expect(loss(a.net, a.data)).toBe(loss(b.net, b.data));
  });

  it('lowers the loss', () => {
    const data = makeData('circle', 120, 1);
    const net = createNet([4], 'tanh', 1);
    const first = trainStep(net, data);
    for (let i = 0; i < 200; i++) trainStep(net, data);
    expect(loss(net, data)).toBeLessThan(first / 4);
  });

  it('separates two clumps with no hidden layer at all', () => {
    const { net, data } = train('blobs', [], 'linear', 200);
    expect(accuracy(net, data)).toBeGreaterThan(0.95);
  });

  it('solves the ring and the corners with a few hidden neurons and a bend', () => {
    for (const kind of ['circle', 'xor'] as const) {
      const { net, data } = train(kind, [4], 'tanh', 400);
      expect(accuracy(net, data)).toBeGreaterThan(0.95);
    }
    const relu = train('xor', [4], 'relu', 400);
    expect(accuracy(relu.net, relu.data)).toBeGreaterThan(0.95);
  });

  it('cannot solve the ring or the corners without an activation function, however deep', () => {
    for (const kind of ['circle', 'xor'] as const) {
      const { net, data } = train(kind, [6, 6, 6], 'linear', 400);
      expect(accuracy(net, data)).toBeLessThan(0.8);
    }
  });

  it('can fit the spiral with two ReLU layers of six, within a few hundred steps', () => {
    const { net, data } = train('spiral', [6, 6], 'relu', 600);
    expect(accuracy(net, data)).toBeGreaterThan(0.95);
  });
});

describe('what is drawn', () => {
  it('gives one value per grid cell, equal to the network output at that cell', () => {
    const net = createNet([3], 'tanh', 1);
    const g = boundaryGrid(net, 8);
    expect(g.length).toBe(64);
    // cell (row 0, col 0) is the top-left, at (-1.2 + 0.15, 1.2 - 0.15)
    expect(g[0]).toBeCloseTo(forward(net, -1.05, 1.05), 6);
  });

  it('gives a map for every neuron, and the last layer is the output probability', () => {
    const net = createNet([3, 2], 'relu', 1);
    const maps = neuronMaps(net, 6);
    expect(maps.map((l) => l.length)).toEqual([2, 3, 2, 1]);
    expect(Array.from(maps[3][0])).toEqual(Array.from(boundaryGrid(net, 6)));
    // the first input neuron is x itself: it grows from left to right
    expect(maps[0][0][0]).toBeLessThan(maps[0][0][5]);
  });

  it('reads weights by layer, source neuron and target neuron', () => {
    const net = createNet([3], 'tanh', 1);
    expect(weightAt(net, 0, 1, 2)).toBe(net.params[net.offsets[0].w + 2 * 2 + 1]);
  });
});

describe('a stack of linear layers is one linear layer', () => {
  const layers = [
    { w: [[1, 2], [0, -1], [3, 1]], b: [0.5, 0, -1] },
    { w: [[1, 1, 0], [2, 0, -1]], b: [0, 1] },
    { w: [[0.5, -2]], b: [0.25] },
  ];
  it('collapses to a single weight matrix and bias with the same outputs', () => {
    const one = collapseLinear(layers);
    expect(one.w.length).toBe(1);
    expect(one.w[0].length).toBe(2);
    const run = (v: number[]) => {
      let a = v;
      for (const L of layers) a = L.w.map((row, j) => row.reduce((s, w, i) => s + w * a[i], 0) + L.b[j]);
      return a[0];
    };
    for (const v of [[0, 0], [1, 2], [-3, 0.5]]) {
      expect(one.w[0][0] * v[0] + one.w[0][1] * v[1] + one.b[0]).toBeCloseTo(run(v), 10);
    }
  });
});
