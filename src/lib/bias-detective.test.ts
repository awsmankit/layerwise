import { describe, expect, it } from 'vitest';
import {
  LIMIT,
  START,
  STEP,
  TEST_CARDS,
  boundary,
  buildPile,
  countPile,
  evaluate,
  gap,
  percent,
  predict,
  starSide,
  train,
} from './bias-detective';

const startModel = () => train(buildPile(START.marker, START.pencil));

describe('bias detective: the toy sorter', () => {
  it('starts with a lopsided pile: many marker cards, one pencil card of each shape', () => {
    const n = countPile(buildPile(START.marker, START.pencil));
    expect(n.marker).toEqual({ star: 6, heart: 6 });
    expect(n.pencil).toEqual({ star: 1, heart: 1 });
  });

  it('has a test pile of new cards, mostly marker, and none of them in the training pools', () => {
    const style = (s: string) => TEST_CARDS.filter((x) => x.style === s).length;
    expect(style('marker')).toBe(20);
    expect(style('pencil')).toBe(10);
    const trainIds = new Set(buildPile(LIMIT.marker, LIMIT.pencil).map((x) => x.id));
    expect(TEST_CARDS.some((x) => trainIds.has(x.id))).toBe(false);
    expect(new Set(TEST_CARDS.map((x) => x.id)).size).toBe(TEST_CARDS.length);
  });

  it('learns the average star and the average heart', () => {
    const m = train([
      { id: 'a', shape: 'star', style: 'marker', pointy: 0.8, dark: 0.8 },
      { id: 'b', shape: 'star', style: 'marker', pointy: 0.6, dark: 0.6 },
      { id: 'c', shape: 'heart', style: 'marker', pointy: 0.2, dark: 0.4 },
    ]);
    expect(m.star?.pointy).toBeCloseTo(0.7);
    expect(m.star?.dark).toBeCloseTo(0.7);
    expect(m.heart).toEqual({ pointy: 0.2, dark: 0.4 });
  });

  it('guesses the closer average, and copes with a missing shape', () => {
    const m = train(buildPile(6, 6));
    expect(predict(m, { pointy: 0.9, dark: 0.8 })).toBe('star');
    expect(predict(m, { pointy: 0.05, dark: 0.8 })).toBe('heart');
    expect(predict({ star: null, heart: null }, { pointy: 0.9, dark: 0.9 })).toBe('heart');
  });

  it('looks good overall but is much worse on pencil cards', () => {
    const r = evaluate(startModel(), TEST_CARDS);
    expect(r.overall.total).toBe(30);
    expect(percent(r.overall)).toBeGreaterThanOrEqual(80);
    expect(percent(r.byStyle.marker)).toBe(100);
    expect(percent(r.byStyle.pencil)).toBeLessThanOrEqual(50);
    expect(gap(r)).toBeGreaterThanOrEqual(40);
  });

  it('adding more marker cards does not help pencil cards', () => {
    const before = evaluate(startModel(), TEST_CARDS);
    const after = evaluate(train(buildPile(START.marker + 2 * STEP, START.pencil)), TEST_CARDS);
    expect(percent(after.byStyle.pencil)).toBeLessThanOrEqual(percent(before.byStyle.pencil));
  });

  it('adding varied pencil cards closes the gap', () => {
    let pencil = START.pencil;
    let last = percent(evaluate(startModel(), TEST_CARDS).byStyle.pencil);
    while (pencil + STEP <= LIMIT.pencil) {
      pencil += STEP;
      const now = percent(evaluate(train(buildPile(START.marker, pencil)), TEST_CARDS).byStyle.pencil);
      expect(now).toBeGreaterThanOrEqual(last);
      last = now;
    }
    const fixed = evaluate(train(buildPile(START.marker, LIMIT.pencil)), TEST_CARDS);
    expect(percent(fixed.byStyle.pencil)).toBeGreaterThanOrEqual(90);
    expect(gap(fixed)).toBeLessThanOrEqual(10);
  });

  it('keeps the pile inside its limits', () => {
    const n = countPile(buildPile(99, 99));
    expect(n.marker.star).toBe(LIMIT.marker);
    expect(n.pencil.heart).toBe(LIMIT.pencil);
    expect(buildPile(-3, -3)).toEqual([]);
  });

  it('gives a decision line inside the square that sits between the two averages', () => {
    const m = startModel();
    const line = boundary(m);
    expect(line).not.toBeNull();
    for (const p of line!) {
      expect(p.pointy).toBeGreaterThanOrEqual(-1e-9);
      expect(p.pointy).toBeLessThanOrEqual(1 + 1e-9);
      expect(p.dark).toBeGreaterThanOrEqual(-1e-9);
      expect(p.dark).toBeLessThanOrEqual(1 + 1e-9);
    }
    // a point on the line is equally close to both averages
    const mid = { pointy: (line![0].pointy + line![1].pointy) / 2, dark: (line![0].dark + line![1].dark) / 2 };
    const d = (a: typeof mid, b: { pointy: number; dark: number }) => Math.hypot(a.pointy - b.pointy, a.dark - b.dark);
    expect(d(mid, m.star!)).toBeCloseTo(d(mid, m.heart!), 6);
    expect(boundary({ star: null, heart: null })).toBeNull();
  });

  it('shades the star side of the line with corners that really are star-side', () => {
    const m = startModel();
    const poly = starSide(m);
    expect(poly.length).toBeGreaterThanOrEqual(3);
    const d = (a: { pointy: number; dark: number }, b: { pointy: number; dark: number }) => Math.hypot(a.pointy - b.pointy, a.dark - b.dark);
    for (const p of poly) expect(d(p, m.star!)).toBeLessThanOrEqual(d(p, m.heart!) + 1e-9);
    // the star side reaches the right-hand edge of the square
    expect(Math.max(...poly.map((p) => p.pointy))).toBeCloseTo(1);
    expect(starSide({ star: null, heart: null })).toEqual([]);
  });
});
