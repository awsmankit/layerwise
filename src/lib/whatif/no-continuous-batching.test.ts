import { describe, expect, it } from 'vitest';
import { busySlots, config, longestChoices, replyLengths, scheduleContinuous, scheduleStatic, summarise, type Config } from './no-continuous-batching';

const two: Config = { ...config, slots: 2, requests: 4 };

describe('no continuous batching what-if', () => {
  it('reply lengths: 40 of them, between the shortest and the longest, repeatable, skewed short', () => {
    const l = replyLengths(300);
    expect(l).toHaveLength(40);
    expect(Math.min(...l)).toBeGreaterThanOrEqual(8);
    expect(Math.max(...l)).toBeLessThan(300);
    expect(replyLengths(300)).toEqual(l);
    const mean = l.reduce((a, b) => a + b, 0) / l.length;
    expect(mean).toBeLessThan((8 + 300) / 2);
    expect(Math.max(...l)).toBeGreaterThan(2 * mean);
  });
  it('hand example, 2 slots, replies 3, 5, 2, 1: static takes 5 + 2 = 7 steps, continuous takes 6', () => {
    const lengths = [3, 5, 2, 1];
    const s = summarise(scheduleStatic(lengths, two), two);
    const c = summarise(scheduleContinuous(lengths, two), two);
    expect(s.steps).toBe(7);
    expect(c.steps).toBe(6);
    expect(s.tokens).toBe(11);
    expect(c.tokens).toBe(11);
    expect(s.utilisation).toBeCloseTo(11 / 14, 12);
    expect(c.utilisation).toBeCloseTo(11 / 12, 12);
    expect(s.idleSlotSteps).toBe(3);
    expect(c.idleSlotSteps).toBe(1);
  });
  it('hand example: static holds a finished reply until the batch ends', () => {
    const b = scheduleStatic([3, 5, 2, 1], two);
    expect(b[0]).toMatchObject({ start: 0, end: 3, released: 5 });
    expect(b[1]).toMatchObject({ start: 0, end: 5, released: 5 });
    expect(b[2]).toMatchObject({ start: 5, end: 7, released: 7 });
    expect(b[3]).toMatchObject({ start: 5, end: 6, released: 7 });
    const c = scheduleContinuous([3, 5, 2, 1], two);
    expect(c[2]).toMatchObject({ slot: 0, start: 3, end: 5, released: 5 });
    expect(c[3]).toMatchObject({ slot: 0, start: 5, end: 6, released: 6 });
    // mean held: (2 + 0 + 0 + 1) / 4 steps
    expect(summarise(b, two).meanHeldSteps).toBeCloseTo(0.75, 12);
    expect(summarise(c, two).meanHeldSteps).toBe(0);
  });
  it('same replies equal length: no difference between the two', () => {
    const l = Array(40).fill(50);
    expect(summarise(scheduleStatic(l)).steps).toBe(summarise(scheduleContinuous(l)).steps);
    expect(summarise(scheduleStatic(l)).utilisation).toBeCloseTo(1, 12);
  });
  it('a slot never works on two replies at once, in either mode', () => {
    for (const make of [scheduleStatic, scheduleContinuous]) {
      const blocks = make(replyLengths(300));
      for (let s = 0; s < config.slots; s++) {
        const mine = blocks.filter((b) => b.slot === s).sort((a, b) => a.start - b.start);
        for (let i = 1; i < mine.length; i++) expect(mine[i].start).toBeGreaterThanOrEqual(mine[i - 1].released === mine[i - 1].end ? mine[i - 1].end : mine[i - 1].released);
      }
    }
  });
  it('tokens written are the same in both modes; continuous finishes sooner and uses slots better', () => {
    for (const longest of longestChoices) {
      const l = replyLengths(longest);
      const s = summarise(scheduleStatic(l));
      const c = summarise(scheduleContinuous(l));
      expect(c.tokens).toBe(s.tokens);
      expect(c.steps).toBeLessThan(s.steps);
      expect(c.utilisation).toBeGreaterThan(s.utilisation);
      expect(c.tokensPerSecond).toBeGreaterThan(s.tokensPerSecond);
      expect(c.meanReplySeconds).toBeLessThan(s.meanReplySeconds);
    }
  });
  it('the more the reply lengths spread, the worse static batching does', () => {
    const util = longestChoices.map((n) => summarise(scheduleStatic(replyLengths(n))).utilisation);
    expect(util[0]).toBeGreaterThan(util[util.length - 1]);
  });
  it('throughput is tokens over steps times 0.03 s', () => {
    const l = replyLengths(100);
    const s = summarise(scheduleStatic(l));
    expect(s.tokensPerSecond).toBeCloseTo(s.tokens / (s.steps * 0.03), 9);
  });
  it('busySlots counts replies being written at a step', () => {
    const c = scheduleContinuous([3, 5, 2, 1], two);
    expect(busySlots(c, 0)).toBe(2);
    expect(busySlots(c, 4)).toBe(2);
    expect(busySlots(c, 5)).toBe(1);
    const s = scheduleStatic([3, 5, 2, 1], two);
    expect(busySlots(s, 4)).toBe(1); // the 3-token reply is done, its slot is held
  });
});
