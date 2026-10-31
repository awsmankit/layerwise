import { describe, expect, it } from 'vitest';
import {
  SHAPES,
  SHAPE_IDS,
  T,
  addNoise,
  alphaBar,
  denoise,
  guidedNoise,
  inShape,
  onPromptSide,
  predictNoise,
  sampleData,
  sampleNoise,
  spread,
  timesteps,
} from './diffusion';

const N = 200;

describe('noise schedule', () => {
  it('starts with all signal and ends with almost none', () => {
    expect(alphaBar(0)).toBe(1);
    expect(alphaBar(T)).toBeLessThan(1e-4);
    expect(alphaBar(T)).toBeGreaterThan(0);
  });
  it('only ever loses signal', () => {
    for (let t = 1; t <= T; t++) expect(alphaBar(t)).toBeLessThan(alphaBar(t - 1));
  });
});

describe('shapes and sampling', () => {
  it('draws the same points for the same seed and different points for another', () => {
    const s = SHAPES.ring;
    expect(Array.from(sampleData(s, 20, 5))).toEqual(Array.from(sampleData(s, 20, 5)));
    expect(Array.from(sampleData(s, 20, 5))).not.toEqual(Array.from(sampleData(s, 20, 6)));
  });
  it('puts fresh samples of every shape on the shape', () => {
    for (const id of SHAPE_IDS) expect(inShape(SHAPES[id], sampleData(SHAPES[id], N, 1)), id).toBeGreaterThan(0.9);
  });
  it('gives each shape two prompt groups', () => {
    for (const id of SHAPE_IDS) {
      const g = SHAPES[id].group;
      expect(g).toContain('a');
      expect(g).toContain('b');
      expect(g.length).toBe(SHAPES[id].means.length);
    }
  });
});

describe('forward process', () => {
  it('leaves the data alone at step 0 and replaces it with the noise at step T', () => {
    const x0 = sampleData(SHAPES.ring, 50, 1);
    const eps = sampleNoise(50, 2);
    const same = addNoise(x0, eps, 0);
    const gone = addNoise(x0, eps, T);
    for (let i = 0; i < x0.length; i++) {
      expect(same[i]).toBeCloseTo(x0[i], 10);
      expect(gone[i]).toBeCloseTo(eps[i], 1);
    }
  });
});

describe('the stand-in denoiser', () => {
  it('matches the closed form for a single blob', () => {
    // with one blob the answer is a simple shrinkage towards the blob centre
    const s = { ...SHAPES.blobs, means: [[0.5, -0.5] as [number, number]], group: ['a' as const] };
    const t = 600;
    const a = alphaBar(t);
    const v = a * s.sigma ** 2 + (1 - a);
    const x = 0.3;
    const y = 0.1;
    const e = predictNoise(s, x, y, t, 'none');
    expect(e[0]).toBeCloseTo((Math.sqrt(1 - a) * (x - Math.sqrt(a) * 0.5)) / v, 10);
    expect(e[1]).toBeCloseTo((Math.sqrt(1 - a) * (y + Math.sqrt(a) * 0.5)) / v, 10);
  });
  it('matches a numerical score: the guess equals minus sqrt(1 - abar) times the gradient of log density', () => {
    const s = SHAPES.blobs;
    const t = 300;
    const a = alphaBar(t);
    const logp = (x: number, y: number) => {
      const v = a * s.sigma ** 2 + (1 - a);
      let p = 0;
      for (const m of s.means) p += Math.exp(-((x - Math.sqrt(a) * m[0]) ** 2 + (y - Math.sqrt(a) * m[1]) ** 2) / (2 * v)) / v;
      return Math.log(p);
    };
    const h = 1e-5;
    const gx = (logp(0.4 + h, 0.2) - logp(0.4 - h, 0.2)) / (2 * h);
    const gy = (logp(0.4, 0.2 + h) - logp(0.4, 0.2 - h)) / (2 * h);
    const e = predictNoise(s, 0.4, 0.2, t, 'none');
    expect(e[0]).toBeCloseTo(-Math.sqrt(1 - a) * gx, 5);
    expect(e[1]).toBeCloseTo(-Math.sqrt(1 - a) * gy, 5);
  });
  it('with guidance 1 equals the prompted guess, with 0 the unprompted one', () => {
    const s = SHAPES.ring;
    const c = predictNoise(s, 0.2, 0.7, 500, 'a');
    const u = predictNoise(s, 0.2, 0.7, 500, 'none');
    expect(guidedNoise(s, 0.2, 0.7, 500, 'a', 1)[0]).toBeCloseTo(c[0], 12);
    expect(guidedNoise(s, 0.2, 0.7, 500, 'a', 0)[1]).toBeCloseTo(u[1], 12);
  });
});

describe('the reverse process', () => {
  const sh = SHAPES.ring;
  const x0 = sampleData(sh, N, 1);
  const start = addNoise(x0, sampleNoise(N, 2), T);
  const run = (steps: number, extra = {}) =>
    denoise(sh, start, { steps, prompt: 'none', guidance: 1, randomness: 0, seed: 3, ...extra });

  it('visits steps + 1 states, from the noise to the result', () => {
    const states = run(10);
    expect(states).toHaveLength(11);
    expect(Array.from(states[0])).toEqual(Array.from(start));
  });
  it('uses evenly spaced noise levels ending at 0', () => {
    expect(timesteps(4)).toEqual([1000, 750, 500, 250, 0]);
    expect(timesteps(1)).toEqual([1000, 0]);
  });
  it('pulls noise onto the shape with enough steps', () => {
    const last = run(30).at(-1)!;
    expect(inShape(sh, start)).toBeLessThan(0.3);
    expect(inShape(sh, last)).toBeGreaterThan(0.9);
  });
  it('one step gives a blurry average in the middle, not the shape', () => {
    const last = run(1).at(-1)!;
    expect(inShape(sh, last)).toBeLessThan(0.05);
    expect(spread(last)).toBeLessThan(0.1);
  });
  it('gets better as the number of steps grows', () => {
    const q = [1, 3, 5, 10, 30].map((s) => inShape(sh, run(s).at(-1)!));
    for (let i = 1; i < q.length; i++) expect(q[i]).toBeGreaterThanOrEqual(q[i - 1]);
  });
  it('is repeatable, and the random sampler changes with the seed', () => {
    expect(Array.from(run(8).at(-1)!)).toEqual(Array.from(run(8).at(-1)!));
    const a = run(8, { randomness: 1, seed: 1 }).at(-1)!;
    const b = run(8, { randomness: 1, seed: 2 }).at(-1)!;
    expect(Array.from(a)).not.toEqual(Array.from(b));
    expect(Array.from(a)).toEqual(Array.from(run(8, { randomness: 1, seed: 1 }).at(-1)!));
  });
  it('follows the prompt when guided, and ignores it when guidance is 0', () => {
    const follow = run(20, { prompt: 'a', guidance: 1 }).at(-1)!;
    const ignore = run(20, { prompt: 'a', guidance: 0 }).at(-1)!;
    expect(onPromptSide(sh, follow, 'a')).toBeGreaterThan(0.95);
    expect(onPromptSide(sh, ignore, 'a')).toBeLessThan(0.7);
  });
  it('narrows the variety of results as guidance rises', () => {
    const s1 = spread(run(20, { prompt: 'a', guidance: 1 }).at(-1)!);
    const s4 = spread(run(20, { prompt: 'a', guidance: 4 }).at(-1)!);
    expect(s4).toBeLessThan(s1);
  });
});
