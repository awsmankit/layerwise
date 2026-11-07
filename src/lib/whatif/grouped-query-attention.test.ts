import { describe, expect, it } from 'vitest';
import { bytesPerUser, contextChoices, groupOf, groupSize, kibPerToken, kind, kvBytesPerToken, kvHeadChoices, usersThatFit } from './grouped-query-attention';

describe('grouped-query attention what-if', () => {
  it('cache per token, checked by hand: 2 x 32 layers x heads x 128 x 2 bytes', () => {
    expect(kvBytesPerToken(32)).toBe(524288); // 512 KiB
    expect(kibPerToken(32)).toBe(512);
    expect(kibPerToken(8)).toBe(128);
    expect(kibPerToken(1)).toBe(16);
  });
  it('is linear in the number of KV heads and shrinks as heads share', () => {
    for (let i = 1; i < kvHeadChoices.length; i++) {
      expect(kvBytesPerToken(kvHeadChoices[i])).toBe(2 * kvBytesPerToken(kvHeadChoices[i - 1]));
    }
  });
  it('per conversation: 8,192 tokens at 512 KiB is exactly 4 GiB', () => {
    expect(bytesPerUser(32, 8192)).toBe(4 * 1024 ** 3);
  });
  it('users that fit in 48 GiB at 8,192 tokens: 12, 48 and 384', () => {
    expect(usersThatFit(32, 8192)).toBe(12);
    expect(usersThatFit(8, 8192)).toBe(48);
    expect(usersThatFit(1, 8192)).toBe(384);
  });
  it('users never decrease as heads share more, for every context length', () => {
    for (const c of contextChoices) {
      for (let i = 1; i < kvHeadChoices.length; i++) expect(usersThatFit(kvHeadChoices[i - 1], c)).toBeGreaterThanOrEqual(usersThatFit(kvHeadChoices[i], c));
    }
    expect(usersThatFit(32, 32768)).toBe(3);
  });
  it('names the three designs', () => {
    expect(kind(32)).toBe('multi-head');
    expect(kind(8)).toBe('grouped-query');
    expect(kind(1)).toBe('multi-query');
  });
  it('groups are equal neighbouring blocks', () => {
    expect(groupSize(8)).toBe(4);
    expect([0, 3, 4, 31].map((q) => groupOf(q, 8))).toEqual([0, 0, 1, 7]);
    expect(groupOf(31, 1)).toBe(0);
    expect(groupOf(31, 32)).toBe(31);
  });
});
