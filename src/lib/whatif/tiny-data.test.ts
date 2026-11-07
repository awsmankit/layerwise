import { describe, expect, it } from 'vitest';
import { DRAWS, IDEAL, LIM, SIZES, accuracy, bestAccuracy, learn, lineAngle, run, segment, tilt, trainDots, testDots, say } from './tiny-data';

describe('tiny data what-if', () => {
  it('data are deterministic and every draw has both groups', () => {
    expect(trainDots(3, 0, 4)).toEqual(trainDots(3, 0, 4));
    expect(trainDots(3, 0, 4)).not.toEqual(trainDots(3, 0, 5));
    for (const n of SIZES) for (let k = 0; k < DRAWS; k++) {
      const d = trainDots(n, 0, k);
      expect(d).toHaveLength(n);
      expect(d.some((p) => p.label === 0)).toBe(true);
      expect(d.some((p) => p.label === 1)).toBe(true);
    }
    const t = testDots();
    expect(t).toHaveLength(600);
    expect(t.filter((p) => p.label === 1)).toHaveLength(300);
    for (const p of t) expect(Math.abs(p.x)).toBeLessThan(LIM);
  });

  it('learns the line halfway between the two group averages (hand-checked)', () => {
    const r = learn([
      { x: -2, y: 0, label: 0 },
      { x: 0, y: -2, label: 0 },
      { x: 2, y: 2, label: 1 },
    ]);
    // A average (-1,-1), B average (2,2): normal (3,3), midpoint (0.5,0.5), c = 3
    expect(r.a).toBeCloseTo(3);
    expect(r.b).toBeCloseTo(3);
    expect(r.c).toBeCloseTo(3);
    expect(say(r, { x: 2, y: 2 })).toBe(1);
    expect(say(r, { x: -1, y: -1 })).toBe(0);
    expect(tilt(r)).toBe(0);
  });

  it('angles: the ideal line runs at -45 degrees; a flat line is 0 and a tipped one is 90 away from it', () => {
    expect(lineAngle(IDEAL)).toBe(-45);
    expect(lineAngle({ a: 0, b: 1, c: 0 })).toBe(0);
    expect(Math.abs(lineAngle({ a: 1, b: 0, c: 0 }))).toBe(90);
    expect(tilt(IDEAL)).toBe(0);
    expect(tilt({ a: 0, b: 1, c: 0 })).toBe(45);
    expect(tilt({ a: 1, b: -1, c: 0 })).toBe(90); // a line along y = x is square to the ideal line
  });

  it('line ends sit on the edge of the plot box', () => {
    const s = segment(IDEAL)!;
    expect([Math.abs(s.x1), Math.abs(s.y1)]).toContain(LIM);
    expect(Math.abs(s.x1 + s.y1)).toBeLessThan(0.01);
    expect(segment({ a: 1, b: 1, c: 100 })).toBeNull();
    expect(segment({ a: 0, b: 1, c: 1 })).toEqual({ x1: -LIM, y1: 1, x2: LIM, y2: 1 });
  });

  it('the best straight rule scores about 93 percent on this world', () => {
    expect(bestAccuracy()).toBeGreaterThan(0.9);
    expect(bestAccuracy()).toBeLessThan(0.96);
    expect(accuracy(IDEAL, testDots())).toBe(bestAccuracy());
  });

  it('with three examples the 20 rules disagree a lot; with 300 they almost agree', () => {
    for (const batch of [0, 1, 2]) {
      const three = run(3, batch);
      const thirty = run(30, batch);
      const big = run(300, batch);
      expect(three.rules).toHaveLength(20);
      expect(three.rms).toBeGreaterThan(thirty.rms);
      expect(thirty.rms).toBeGreaterThan(big.rms);
      expect(three.rms).toBeGreaterThan(15);
      expect(big.rms).toBeLessThan(4);
      expect(three.accMin).toBeLessThan(0.8);
      expect(big.accMin).toBeGreaterThan(0.9);
      expect(three.accMax - three.accMin).toBeGreaterThan(big.accMax - big.accMin);
      expect(three.accMin).toBeLessThanOrEqual(three.accMean);
      expect(three.accMean).toBeLessThanOrEqual(three.accMax);
    }
  });

  it('the average tilt falls steadily with more examples', () => {
    const r = SIZES.map((n) => run(n, 0).rms);
    expect(r[0]).toBeGreaterThan(r[3]);
    expect(r[3]).toBeGreaterThan(r[5]);
    expect(run(3, 0)).toEqual(run(3, 0));
  });
});
