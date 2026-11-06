import { describe, expect, it } from 'vitest';
import { blankRatio, blankSeconds, fractionVisible, timeToFirstToken, tokensVisible, totalSeconds, wordsOf } from './no-streaming';

describe('no streaming what-if', () => {
  it('time to first token is 0.2 s overhead plus 3,000 / 6,000 s of prefill = 0.7 s', () => {
    expect(timeToFirstToken()).toBeCloseTo(0.7, 12);
    expect(timeToFirstToken(6000)).toBeCloseTo(1.2, 12);
  });
  it('total time adds reply tokens over decode speed: 300 tokens at 40 per second is 7.5 s, 8.2 s in all', () => {
    expect(totalSeconds(300, 40)).toBeCloseTo(8.2, 12);
    expect(totalSeconds(300, 80)).toBeCloseTo(0.7 + 3.75, 12);
  });
  it('streaming leaves the screen blank only until the first token', () => {
    expect(blankSeconds(true, 300, 40)).toBeCloseTo(0.7, 12);
    expect(blankSeconds(false, 300, 40)).toBeCloseTo(8.2, 12);
  });
  it('the blank wait is 8.2 / 0.7, about 11.7 times longer, and the ratio grows with the reply length', () => {
    expect(blankRatio(300, 40)).toBeCloseTo(8.2 / 0.7, 12);
    expect(blankRatio(1000, 40)).toBeGreaterThan(blankRatio(100, 40));
  });
  it('streamed: nothing before the first token, then speed x time, then the whole reply', () => {
    expect(tokensVisible(0.5, true, 300, 40)).toBe(0);
    expect(tokensVisible(1.7, true, 300, 40)).toBe(40);
    expect(tokensVisible(3.0, true, 300, 40)).toBe(Math.floor(2.3 * 40));
    expect(tokensVisible(8.2, true, 300, 40)).toBe(300);
    expect(tokensVisible(100, true, 300, 40)).toBe(300);
  });
  it('not streamed: nothing until the very end, then everything at once', () => {
    expect(tokensVisible(0, false, 300, 40)).toBe(0);
    expect(tokensVisible(8.1, false, 300, 40)).toBe(0);
    expect(tokensVisible(8.2, false, 300, 40)).toBe(300);
  });
  it('both end with the same text at the same time, and streamed is never behind', () => {
    for (let t = 0; t <= 9; t += 0.3) expect(tokensVisible(t, true, 300, 40)).toBeGreaterThanOrEqual(tokensVisible(t, false, 300, 40));
    expect(fractionVisible(9, true, 300, 40)).toBe(1);
    expect(fractionVisible(9, false, 300, 40)).toBe(1);
  });
  it('turns tokens into words with the 0.75 rule of thumb', () => {
    expect(wordsOf(300)).toBe(225);
    expect(wordsOf(0)).toBe(0);
  });
});
