import { describe, expect, it } from 'vitest';
import { SHOWN_SEED, SPEAKERS, TEST_SPEAKERS, averageScores, makeClips, score, splitByRow, splitBySpeaker } from './data-leakage';

describe('data leakage what-if', () => {
  it('builds clips per speaker, deterministically, and a clip shares its speaker label', () => {
    const a = makeClips(5);
    expect(a).toHaveLength(SPEAKERS * 5);
    expect(makeClips(5)).toEqual(a);
    const labels = new Map<number, number>();
    for (const c of a) {
      if (labels.has(c.speaker)) expect(labels.get(c.speaker)).toBe(c.label);
      labels.set(c.speaker, c.label);
    }
    // taking fewer clips per speaker keeps the same first clips
    expect(makeClips(3)[0]).toEqual(a[0]);
  });
  it('a split by speaker has no speaker on both sides; a split by row does', () => {
    const clips = makeClips(8);
    const bySpeaker = splitBySpeaker(clips, SHOWN_SEED);
    const testSpeakers = new Set(clips.filter((c) => bySpeaker.test.has(c.id)).map((c) => c.speaker));
    const trainSpeakers = new Set(clips.filter((c) => !bySpeaker.test.has(c.id)).map((c) => c.speaker));
    expect(testSpeakers.size).toBe(TEST_SPEAKERS);
    for (const s of testSpeakers) expect(trainSpeakers.has(s)).toBe(false);
    expect(score(clips, bySpeaker).withSibling).toBe(0);
    const byRow = score(clips, splitByRow(clips, SHOWN_SEED));
    expect(byRow.withSibling).toBe(byRow.testCount);
  });
  it('the shown split: near-perfect by row, much worse by speaker', () => {
    const clips = makeClips(8);
    const row = score(clips, splitByRow(clips, SHOWN_SEED)).accuracy;
    const speaker = score(clips, splitBySpeaker(clips, SHOWN_SEED)).accuracy;
    expect(row).toBeGreaterThan(0.9);
    expect(speaker).toBeLessThan(0.75);
    expect(row - speaker).toBeGreaterThan(0.25);
  });
  it('with one clip per speaker there is nothing to leak: both ways score the same on average', () => {
    const a = averageScores(1, 50);
    expect(a.row).toBeCloseTo(a.speaker, 1);
  });
  it('the leak grows with clips per speaker, while the honest score stays flat', () => {
    const k1 = averageScores(1, 60);
    const k4 = averageScores(4, 60);
    const k10 = averageScores(10, 60);
    expect(k4.row).toBeGreaterThan(k1.row + 0.2);
    expect(k10.row).toBeGreaterThanOrEqual(k4.row);
    expect(Math.abs(k10.speaker - k1.speaker)).toBeLessThan(0.05);
  });
  it('the honest score is above a coin flip but far below the leaky one (averaged over 100 splits)', () => {
    const a = averageScores(8, 100);
    expect(a.speaker).toBeGreaterThan(0.5);
    expect(a.speaker).toBeLessThan(0.7);
    expect(a.row).toBeGreaterThan(0.93);
  });
});
