import { describe, expect, it } from 'vitest';
import { Gan, PRESETS, RUN_LENGTH, classify, internals, normCdf, realQuantiles, zQuantile } from './gan';

const preset = (id: string) => PRESETS.find((p) => p.id === id)!.settings;

describe('maths helpers', () => {
  it('normCdf matches known values', () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 6);
    expect(normCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normCdf(-1)).toBeCloseTo(0.158655, 5);
  });
  it('zQuantile inverts it', () => {
    for (const p of [0.01, 0.2, 0.5, 0.9, 0.999]) expect(normCdf(zQuantile(p))).toBeCloseTo(p, 5);
  });
  it('the real quantiles are sorted and straddle both humps', () => {
    const q = realQuantiles(100);
    expect([...q].sort((a, b) => a - b)).toEqual(q);
    expect(q[0]).toBeLessThan(-2);
    expect(q[99]).toBeGreaterThan(2);
  });
});

describe('gradients', () => {
  it('the discriminator loss gradient matches finite differences', () => {
    const g = new Gan(preset('even'));
    const loss = (d: Float64Array) => {
      const acc = new Float64Array(d.length);
      return internals.accumulate(d, acc, 1.3, 1) + internals.accumulate(d, acc, -0.4, 0);
    };
    const grad = new Float64Array(g.d.length);
    internals.accumulate(g.d, grad, 1.3, 1);
    internals.accumulate(g.d, grad, -0.4, 0);
    for (let i = 0; i < g.d.length; i++) {
      const a = Float64Array.from(g.d);
      const b = Float64Array.from(g.d);
      a[i] += 1e-6;
      b[i] -= 1e-6;
      expect(grad[i]).toBeCloseTo((loss(a) - loss(b)) / 2e-6, 5);
    }
  });
  it('the gradient of D with respect to its input matches finite differences', () => {
    const g = new Gan(preset('even'));
    const t = internals.forward(g.d, 0.7);
    const dx = internals.backInput(g.d, t, 1);
    const num = (internals.forward(g.d, 0.7 + 1e-6).out - internals.forward(g.d, 0.7 - 1e-6).out) / 2e-6;
    expect(dx).toBeCloseTo(num, 5);
  });
});

describe('training runs', () => {
  it('is repeatable for a seed', () => {
    const a = new Gan(preset('even'));
    const b = new Gan(preset('even'));
    a.run(60);
    b.run(60);
    expect(a.fakes(20)).toEqual(b.fakes(20));
  });
  it('an even match ends with both humps covered and a small distance', () => {
    const g = new Gan(preset('even'));
    g.run(1500);
    const c = g.coverage();
    expect(c.left).toBeGreaterThan(0.3);
    expect(c.right).toBeGreaterThan(0.3);
    expect(g.w1()).toBeLessThan(0.4);
  });
  it('the untrained distance is large', () => {
    expect(new Gan(preset('even')).w1()).toBeGreaterThan(0.8);
  });
  it('a forger that is far too fast collapses onto one hump for some seeds, and the run records it', () => {
    const outcomes = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => {
      const g = new Gan({ ...preset('strong-g'), seed });
      g.run(RUN_LENGTH);
      return classify(g.coverage()) === 'one-hump' ? 'one-sided' : 'both';
    });
    expect(outcomes.filter((o) => o === 'one-sided').length).toBeGreaterThanOrEqual(3);
    expect(outcomes.filter((o) => o === 'both').length).toBeGreaterThanOrEqual(1);
  });
  it('the forger-too-fast preset starts on a seed that collapses, and the distance strip is jagged rather than falling', () => {
    const g = new Gan(PRESETS.find((p) => p.id === 'strong-g')!.settings);
    g.run(RUN_LENGTH);
    expect(classify(g.coverage())).toBe('one-hump');
    const w = g.history.map((h) => h.w1);
    let rises = 0;
    for (let i = 1; i < w.length; i++) if (w[i] > w[i - 1] + 0.3) rises += 1;
    expect(rises).toBeGreaterThanOrEqual(3);
  });
  it('records loss history every ten steps', () => {
    const g = new Gan(preset('even'));
    g.run(50);
    expect(g.history.map((h) => h.step)).toEqual([10, 20, 30, 40, 50]);
  });
});

describe('classify', () => {
  it('labels the four outcomes', () => {
    expect(classify({ left: 0.48, right: 0.46, between: 0.06 })).toBe('both');
    expect(classify({ left: 0, right: 1, between: 0 })).toBe('one-hump');
    expect(classify({ left: 0.05, right: 0.05, between: 0.9 })).toBe('between');
    expect(classify({ left: 0.4, right: 0.3, between: 0.3 })).toBe('partial');
  });
  it('the detective-too-strong preset learns more slowly than an even match: more fakes between the humps, larger distance', () => {
    const even = new Gan(PRESETS.find((p) => p.id === 'even')!.settings);
    const strong = new Gan(PRESETS.find((p) => p.id === 'strong-d')!.settings);
    even.run(RUN_LENGTH);
    strong.run(RUN_LENGTH);
    expect(strong.coverage().between).toBeGreaterThan(even.coverage().between);
    expect(strong.w1()).toBeGreaterThan(even.w1());
    expect(classify(strong.coverage())).not.toBe('one-hump');
  });
});
