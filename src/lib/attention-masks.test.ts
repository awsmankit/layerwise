import { describe, expect, it } from 'vitest';
import { SENTENCE, countAllowed, describe as explain, maskGrid, maskedLM, nextToken, spanCorrupt, visibleFrom } from './attention-masks';

describe('mask grids', () => {
  it('bidirectional: every token sees every token', () => {
    const g = maskGrid('bidirectional', 4);
    expect(countAllowed(g)).toBe(16);
  });
  it('causal: token i sees tokens 0..i, so n(n+1)/2 cells are open', () => {
    const g = maskGrid('causal', 8);
    expect(countAllowed(g)).toBe(36);
    expect(visibleFrom(g, 0)).toEqual([0]);
    expect(visibleFrom(g, 3)).toEqual([0, 1, 2, 3]);
  });
  it('prefix: the first k see each other, later tokens see the prefix and what came before them', () => {
    const g = maskGrid('prefix', 6, 3);
    expect(visibleFrom(g, 0)).toEqual([0, 1, 2]);
    expect(visibleFrom(g, 2)).toEqual([0, 1, 2]);
    expect(visibleFrom(g, 4)).toEqual([0, 1, 2, 3, 4]);
    // 3 rows of 3, then rows seeing 4, 5, 6 keys
    expect(countAllowed(g)).toBe(9 + 4 + 5 + 6);
  });
  it('prefix with length 0 is causal and with length n is bidirectional', () => {
    expect(countAllowed(maskGrid('prefix', 5, 0))).toBe(countAllowed(maskGrid('causal', 5)));
    expect(countAllowed(maskGrid('prefix', 5, 5))).toBe(25);
  });
  it('full (cross-attention) is m rows by n columns, all open', () => {
    const g = maskGrid('full', 5, 0, 3);
    expect(g).toHaveLength(3);
    expect(countAllowed(g)).toBe(15);
  });
});

describe('training examples', () => {
  it('masked LM hides the chosen tokens and predicts only those', () => {
    const r = maskedLM(SENTENCE, [2, 6]);
    expect(r.input).toEqual(['The', 'cat', '[MASK]', 'on', 'the', 'warm', '[MASK]', '.']);
    expect(r.targets).toEqual([{ pos: 2, token: 'sat' }, { pos: 6, token: 'mat' }]);
  });
  it('next-token prediction shifts by one', () => {
    const r = nextToken(['a', 'b', 'c']);
    expect(r.input).toEqual(['a', 'b']);
    expect(r.target).toEqual(['b', 'c']);
  });
  it('span corruption matches the T5 paper example shape', () => {
    // "Thank you for inviting me to your party last week ." with "for inviting" and "last" hidden
    const t = ['Thank', 'you', 'for', 'inviting', 'me', 'to', 'your', 'party', 'last', 'week', '.'];
    const r = spanCorrupt(t, [2, 3, 8]);
    expect(r.input).toEqual(['Thank', 'you', '<X>', 'me', 'to', 'your', 'party', '<Y>', 'week', '.']);
    expect(r.target).toEqual(['<X>', 'for', 'inviting', '<Y>', 'last', '<Z>']);
    expect(r.spans).toBe(2);
  });
  it('with nothing hidden there is nothing to predict for the encoder-decoder', () => {
    const r = spanCorrupt(SENTENCE, []);
    expect(r.target).toEqual([]);
    expect(explain('encdec', SENTENCE, [], 3).signal).toBe(0);
  });
});

describe('describe()', () => {
  it('the decoder-only model gets a training signal at every position', () => {
    const d = explain('decoder', SENTENCE, [], 3);
    expect(d.signal).toBe(7);
    expect(d.of).toBe(7);
  });
  it('the encoder-only model gets a signal only where tokens are hidden', () => {
    const d = explain('encoder', SENTENCE, [1, 6], 3);
    expect(d.signal).toBe(2);
    expect(d.of).toBe(8);
  });
  it('the encoder-decoder shortens the encoder input when spans are merged', () => {
    const d = explain('encdec', SENTENCE, [1, 2, 6], 3);
    expect(d.input).toHaveLength(8 - 3 + 2);
    expect(d.grids).toHaveLength(2);
  });
});
