import { describe, expect, it } from 'vitest';
import { CENTRE, POINTS_PER_LOGIT, drawWins, estimateGap, mulberry32, oneBoard, repeatExperiment, votedGap, votesNeeded, winProb } from './arena-sim';

describe('Elo scale', () => {
  it('uses 400 points for 10 to 1 odds', () => {
    expect(winProb(0)).toBeCloseTo(0.5, 12);
    expect(winProb(400)).toBeCloseTo(10 / 11, 12);
    expect(winProb(-400)).toBeCloseTo(1 / 11, 12);
    expect(POINTS_PER_LOGIT).toBeCloseTo(173.7178, 3);
  });
  it('is symmetric', () => {
    expect(winProb(60) + winProb(-60)).toBeCloseTo(1, 12);
  });
});

describe('estimateGap', () => {
  it('recovers the gap from exact win shares', () => {
    const e = estimateGap(5288, 10000); // about winProb(20)
    expect(e.gap).toBeGreaterThan(19);
    expect(e.gap).toBeLessThan(21.5);
    expect(e.lo).toBeLessThan(e.gap);
    expect(e.hi).toBeGreaterThan(e.gap);
  });
  it('is zero at an even split and symmetric', () => {
    expect(estimateGap(50, 100).gap).toBeCloseTo(0, 10);
    expect(estimateGap(70, 100).gap).toBeCloseTo(-estimateGap(30, 100).gap, 10);
  });
  it('stays finite when one side wins every vote', () => {
    const e = estimateGap(20, 20);
    expect(Number.isFinite(e.gap)).toBe(true);
    expect(Number.isFinite(e.se)).toBe(true);
    expect(e.gap).toBeGreaterThan(0);
  });
  it('narrows with the square root of the votes: four times the votes halves the interval', () => {
    const a = estimateGap(5500, 10000);
    const b = estimateGap(22000, 40000);
    expect(b.hi - b.lo).toBeCloseTo((a.hi - a.lo) / 2, 0);
  });
});

describe('seeded simulation', () => {
  it('is repeatable', () => {
    expect(drawWins(500, 0.55, mulberry32(7))).toBe(drawWins(500, 0.55, mulberry32(7)));
    const p = { trueGap: 30, n: 1000, styleBonusB: 0 };
    expect(oneBoard(p, 3)).toEqual(oneBoard(p, 3));
  });
  it('centres the ratings on 1000 with A above B when the gap is estimated positive', () => {
    const b = oneBoard({ trueGap: 100, n: 2000, styleBonusB: 0 }, 1);
    expect(b.ratingA + b.ratingB).toBeCloseTo(2 * CENTRE, 8);
    expect(b.ratingA).toBeGreaterThan(b.ratingB);
  });
  it('bars overlap exactly when the gap interval includes zero', () => {
    for (let s = 1; s <= 40; s++) {
      const b = oneBoard({ trueGap: 15, n: 800, styleBonusB: 0 }, s);
      const barsTouch = b.ratingA - b.halfWidth <= b.ratingB + b.halfWidth;
      expect(b.overlap).toBe(barsTouch);
    }
  });
  it('adds style appeal to B and subtracts it from the voted gap', () => {
    expect(votedGap({ trueGap: 20, n: 1, styleBonusB: 35 })).toBe(-15);
  });
});

describe('repeated experiments', () => {
  it('rarely flips a large gap with plenty of votes', () => {
    const r = repeatExperiment({ trueGap: 100, n: 2000, styleBonusB: 0 }, 200, 1);
    expect(r.flipped).toBe(0);
    expect(r.clearRight).toBeGreaterThan(190);
  });
  it('flips a small gap with few votes about as often as not', () => {
    const r = repeatExperiment({ trueGap: 10, n: 200, styleBonusB: 0 }, 400, 2);
    expect(r.flipped / r.trials).toBeGreaterThan(0.25);
    expect(r.flipped / r.trials).toBeLessThan(0.5);
    expect(r.unclear / r.trials).toBeGreaterThan(0.85);
  });
  it('accounts for every trial exactly once in each tally', () => {
    const r = repeatExperiment({ trueGap: 20, n: 500, styleBonusB: 0 }, 300, 5);
    expect(r.rightOrder + r.flipped + r.tied).toBe(300);
    expect(r.clearRight + r.clearWrong + r.unclear).toBe(300);
  });
  it('a style bonus bigger than the quality gap makes narrow bars point at the wrong model', () => {
    const r = repeatExperiment({ trueGap: 20, n: 20000, styleBonusB: 60 }, 100, 9);
    expect(r.clearWrong).toBeGreaterThan(95);
  });
});

describe('votesNeeded', () => {
  it('needs about 1,160 votes for a 20-point gap and four times as many for 10', () => {
    expect(votesNeeded(20)).toBeGreaterThan(1100);
    expect(votesNeeded(20)).toBeLessThan(1250);
    expect(votesNeeded(10) / votesNeeded(20)).toBeGreaterThan(3.9);
    expect(votesNeeded(10) / votesNeeded(20)).toBeLessThan(4.1);
  });
  it('matches the interval formula: at that many votes the half-width equals the gap', () => {
    const gap = 40;
    const n = votesNeeded(gap);
    const p = winProb(gap);
    const e = estimateGap(Math.round(n * p), n);
    expect(1.96 * e.se).toBeGreaterThan(gap * 0.97);
    expect(1.96 * e.se).toBeLessThan(gap * 1.03);
  });
  it('is infinite for no gap', () => {
    expect(votesNeeded(0)).toBe(Infinity);
  });
});

describe('numbers quoted in the lesson (seed 7, 400 experiments, true gap 20 points)', () => {
  const run = (n: number) => repeatExperiment({ trueGap: 20, n, styleBonusB: 0 }, 400, 7);
  it('200 votes: order flipped in 72 of 400, bars overlapping in 351', () => {
    const r = run(200);
    expect(r.flipped).toBe(72);
    expect(r.unclear).toBe(351);
  });
  it('1,000 votes: flipped in 13, overlapping in 228', () => {
    const r = run(1000);
    expect(r.flipped).toBe(13);
    expect(r.unclear).toBe(228);
  });
  it('5,000 votes: never flipped, overlapping in 8', () => {
    const r = run(5000);
    expect(r.flipped).toBe(0);
    expect(r.unclear).toBe(8);
  });
  it('votes needed for gaps of 5, 10, 20, 50 and 100 points', () => {
    expect([5, 10, 20, 50, 100].map(votesNeeded)).toEqual([18553, 4641, 1164, 190, 51]);
  });
});
