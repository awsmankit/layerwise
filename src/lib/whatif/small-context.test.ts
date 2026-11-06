import { describe, expect, it } from 'vitest';
import { conversation, countTokens, kept, questions, sizes, status, tokensInWindow, totalTokens, windowToKeepAll } from './small-context';

describe('small context what-if', () => {
  it('counts words and punctuation as tokens', () => {
    expect(countTokens('Hi, my name is Priya.')).toBe(7); // Hi , my name is Priya .
    expect(countTokens('')).toBe(0);
    expect(countTokens('150 euros')).toBe(2);
  });
  it('sizes match the conversation and add up', () => {
    expect(sizes).toHaveLength(conversation.length);
    expect(totalTokens()).toBe(sizes.reduce((a, b) => a + b, 0));
    expect(sizes[0]).toBe(countTokens('Hi, my name is Priya and I am allergic to peanuts.'));
    expect(sizes[0]).toBe(13); // Hi , my name is Priya and I am allergic to peanuts .
  });
  it('a window big enough keeps everything', () => {
    const k = kept(conversation.length, windowToKeepAll(conversation.length));
    expect(k.every(Boolean)).toBe(true);
  });
  it('the window drops the oldest first and keeps one unbroken run to the newest', () => {
    const n = conversation.length;
    const w = sizes[n - 1] + sizes[n - 2];
    const k = kept(n, w);
    expect(k.slice(0, n - 2).some(Boolean)).toBe(false);
    expect(k[n - 1]).toBe(true);
    expect(k[n - 2]).toBe(true);
    expect(tokensInWindow(n, w)).toBe(w);
    // one token short of the second message: only the newest stays
    expect(kept(n, w - 1).filter(Boolean)).toHaveLength(1);
  });
  it('a message bigger than the window empties it, and older ones stay dropped', () => {
    const k = kept(3, 1);
    expect(k.some(Boolean)).toBe(false);
  });
  it('a bigger window never forgets more', () => {
    const n = conversation.length;
    let prev = 0;
    for (let w = 0; w <= totalTokens(); w++) {
      const c = kept(n, w).filter(Boolean).length;
      expect(c).toBeGreaterThanOrEqual(prev);
      prev = c;
    }
  });
  it('the name question is lost as soon as message 1 is cut, the dinner question needs two messages', () => {
    const n = conversation.length;
    const name = questions[0].needs;
    expect(status(name, n, totalTokens())).toBe('ok');
    expect(status(name, n, totalTokens() - sizes[0])).toBe('lost');
    expect(status(name, 0, 100)).toBe('later');
    const dinner = questions[4].needs;
    expect(status(dinner, n, totalTokens())).toBe('ok');
    expect(status(dinner, n, totalTokens() - 1)).toBe('lost');
    expect(status(dinner, 5, 1000)).toBe('later'); // message 8 has not arrived yet
  });
  it('sliding: with a fixed window the allergy is known early and forgotten later', () => {
    const w = totalTokens(4);
    expect(status(questions[1].needs, 4, w)).toBe('ok');
    expect(status(questions[1].needs, 8, w)).toBe('lost');
  });
});
