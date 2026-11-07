import { describe, expect, it } from "vitest";
import {
  GRID,
  NOISE_STEPS,
  ceiling,
  curve,
  fit,
  fitLine,
  flippedSet,
  gridMap,
  makePoints,
  mapChange,
  noisyLabels,
  run,
  testSet,
  trainSet,
} from "./label-noise";

describe("label noise what-if", () => {
  it("data are deterministic, balanced, and inside the plot", () => {
    const a = trainSet(60);
    expect(trainSet(60)).toEqual(a);
    expect(a.filter((p) => p.label === 1)).toHaveLength(30);
    for (const p of makePoints(600, 1)) {
      expect(Math.abs(p.x)).toBeLessThan(3);
      expect(Math.abs(p.y)).toBeLessThan(3);
    }
  });

  it("flips exactly the asked share, and the flips are nested as the share grows", () => {
    expect(flippedSet(60, 0).size).toBe(0);
    expect(flippedSet(60, 25).size).toBe(15);
    expect(flippedSet(600, 45).size).toBe(270);
    const small = flippedSet(60, 10);
    const big = flippedSet(60, 30);
    for (const i of small) expect(big.has(i)).toBe(true);
    const train = trainSet(60);
    const labels = noisyLabels(train, flippedSet(60, 25));
    expect(labels.filter((l, i) => l !== train[i].label)).toHaveLength(15);
  });

  it("the best possible rule scores near 88% on the clean test points", () => {
    expect(testSet()).toHaveLength(500);
    expect(ceiling()).toBeGreaterThan(0.85);
    expect(ceiling()).toBeLessThan(0.92);
  });

  it("gradient descent finds a line that points along the diagonal and separates clean data well", () => {
    const train = trainSet(600);
    const { w } = fitLine(
      train,
      train.map((p) => p.label),
    );
    expect(w[0]).toBeGreaterThan(0.3);
    expect(w[1]).toBeGreaterThan(0.3);
    expect(Math.abs(w[0] - w[1])).toBeLessThan(0.4);
  });

  it("1-nearest-neighbour on clean labels reproduces every training label (hand check)", () => {
    const train = trainSet(60);
    const labels = train.map((p) => p.label);
    const pred = fit("memoriser", train, labels);
    for (const p of train) expect(pred(p.x, p.y)).toBe(p.label);
    // after flipping, the memoriser copies the wrong label at every flipped row
    const flipped = flippedSet(60, 20);
    const noisy = noisyLabels(train, flipped);
    const p2 = fit("memoriser", train, noisy);
    for (const i of flipped) expect(p2(train[i].x, train[i].y)).toBe(noisy[i]);
  });

  it("accuracy on clean data falls as labels get worse, for the memoriser", () => {
    const c = curve("memoriser", 60);
    expect(c).toHaveLength(NOISE_STEPS.length);
    expect(c[0]).toBeGreaterThan(c[4]);
    expect(c[4]).toBeGreaterThan(c[9] - 0.001);
    expect(c[0] - c[6]).toBeGreaterThan(0.1);
  });

  it("with 600 rows the straight line resists: it loses less than 3 points up to 30% flipped", () => {
    const c = curve("line", 600);
    expect(c[0] - c[6]).toBeLessThan(0.03);
    expect(c[0]).toBeGreaterThan(0.85);
  });

  it("simpler or smoother models resist better than the memoriser, and more data helps it too", () => {
    const at30 = (m: "line" | "smoother" | "memoriser", n: number) =>
      curve(m, n)[6];
    expect(at30("line", 600)).toBeGreaterThan(at30("memoriser", 600) + 0.15);
    expect(at30("smoother", 60)).toBeGreaterThan(at30("memoriser", 60));
    expect(at30("smoother", 600)).toBeGreaterThan(at30("smoother", 60) - 0.05);
    expect(at30("memoriser", 600)).toBeLessThan(0.7);
  });

  it("the decision map has GRID x GRID cells and moves more for the memoriser than for the line", () => {
    const clean = run("memoriser", 60, 0);
    const noisy = run("memoriser", 60, 25);
    expect(noisy.map).toHaveLength(GRID * GRID);
    const lineMove = mapChange(
      run("line", 600, 0).map,
      run("line", 600, 25).map,
    );
    const memMove = mapChange(clean.map, noisy.map);
    expect(memMove).toBeGreaterThan(0.1);
    expect(lineMove).toBeLessThan(0.05);
    expect(mapChange(clean.map, clean.map)).toBe(0);
    expect(gridMap(() => 1).every((v) => v === 1)).toBe(true);
  });
});
