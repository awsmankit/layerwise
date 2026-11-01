import { describe, expect, it } from 'vitest';
import { AD_SLOT, POSTS, START_LIKED, distinctTopics, organicCount, rankFeed, signalValues } from './feed-builder';

const liked = new Set(START_LIKED);
const ids = (f: ReturnType<typeof rankFeed>) => f.map((r) => r.post.id);

describe('rankFeed', () => {
  it('keeps the posted order when no signals are on, with the ad in slot 3', () => {
    const f = rankFeed([], liked);
    expect(f).toHaveLength(POSTS.length);
    expect(f[AD_SLOT].post.ad).toBe(true);
    expect(ids(f).filter((i) => i !== 'p10')).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p11', 'p12']);
    expect(f[0].why).toMatch(/No signals/);
  });

  it('sorts newest first by hours since posting', () => {
    const f = rankFeed(['newest'], liked).filter((r) => !r.post.ad);
    expect(f[0].post.id).toBe('p7');
    expect(f[1].post.id).toBe('p4');
    for (let i = 1; i < f.length; i++) expect(f[i - 1].post.hoursAgo).toBeLessThanOrEqual(f[i].post.hoursAgo);
  });

  it('puts friends first, in posted order', () => {
    const f = rankFeed(['friend'], liked);
    expect(ids(f).filter((i) => i !== 'p10').slice(0, 3)).toEqual(['p4', 'p7', 'p9']);
  });

  it('adds scores when several signals are on', () => {
    const v = signalValues(POSTS[0], liked);
    const f = rankFeed(['popular', 'watch'], liked).find((r) => r.post.id === 'p1')!;
    expect(f.score).toBeCloseTo(v.popular + v.watch, 10);
  });

  it('always shows the ad in slot 3 and labels it', () => {
    for (const on of [[], ['popular'], ['topic', 'friend']] as const) {
      const f = rankFeed([...on], liked);
      expect(f[AD_SLOT].post.ad).toBe(true);
      expect(f[AD_SLOT].why).toMatch(/paid/);
    }
  });
});

describe('filter bubble and the mix-it-up button', () => {
  it('fills the top of the feed with the two liked topics when only "what you liked" is on', () => {
    const f = rankFeed(['topic'], liked);
    expect(organicCount(f)).toBe(5);
    expect(distinctTopics(f)).toBe(2);
    expect(f[0].why).toBe('Because you liked football posts before.');
  });

  it('narrows to one topic after liking more football posts', () => {
    const more = new Set([...START_LIKED, 'p5', 'p9']);
    const f = rankFeed(['topic'], more);
    expect(distinctTopics(f, 4)).toBe(1);
  });

  it('shows more topics once the feed is mixed', () => {
    const plain = rankFeed(['topic'], liked);
    const mixed = rankFeed(['topic'], liked, true);
    expect(distinctTopics(mixed)).toBeGreaterThanOrEqual(4);
    expect(distinctTopics(mixed)).toBeGreaterThan(distinctTopics(plain));
    expect(mixed.some((r) => r.fresh)).toBe(true);
  });

  it('still contains every post exactly once when mixed', () => {
    const mixed = rankFeed(['popular', 'watch', 'topic', 'friend', 'newest'], liked, true);
    expect(new Set(ids(mixed)).size).toBe(POSTS.length);
    expect(mixed[AD_SLOT].post.ad).toBe(true);
  });
});
