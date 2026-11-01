import { describe, expect, it } from 'vitest';
import { decodeSnapshot, encodeSnapshot, mergeSnapshots, perItemKeys } from './transfer';

const snap = {
  site: 'Layerwise',
  'layerwise:done': ['start/what-is-ai-in-plain-english', 'llm/prompting-and-structured-output'],
  'layerwise:quiz': { 'start/what-is-ai-in-plain-english': { score: 2, total: 3 } },
  'layerwise:games': { blueprint: { best: 70, plays: 3 } },
  'layerwise:path': 'builder',
};

describe('moving progress between browsers', () => {
  it('round-trips a snapshot through a link code, and keeps the code short', async () => {
    const many = { ...snap, 'layerwise:done': Array.from({ length: 60 }, (_, i) => `track/lesson-number-${i}`) };
    const code = await encodeSnapshot(many);
    expect(code.length).toBeLessThan(JSON.stringify(many).length);
    expect(await decodeSnapshot(code)).toEqual(many);
  });

  it('joins the labs done on both sides', () => {
    const m = mergeSnapshots({ site: 'Layerwise', 'layerwise:labs': ['cosine-search'] }, { site: 'Layerwise', 'layerwise:labs': ['cosine-search', 'chunking'] });
    expect(m['layerwise:labs']).toEqual(['cosine-search', 'chunking']);
    expect(mergeSnapshots({ site: 'Layerwise' }, { site: 'Layerwise', 'layerwise:labs': ['x'] })['layerwise:labs']).toEqual(['x']);
  });

  it('merges review cards, keeping the later answer and the higher box on a tie', () => {
    const card = (box: number, lastSeen: string) => ({ box, due: '2026-04-01', lastSeen });
    const local = { site: 'Layerwise', 'layerwise:review': { items: { 'a/1#0': card(2, '2026-03-02'), 'a/1#1': card(3, '2026-03-05') }, days: ['2026-03-02'], hideStreak: true } };
    const incoming = { site: 'Layerwise', 'layerwise:review': { items: { 'a/1#0': card(5, '2026-03-04'), 'a/1#1': card(4, '2026-03-05'), 'b/2#0': card(1, '2026-03-01') }, days: ['2026-03-04'] } };
    const m = mergeSnapshots(local, incoming)['layerwise:review'] as { items: Record<string, { box: number }>; days: string[]; hideStreak?: boolean };
    expect(m.items['a/1#0'].box).toBe(5);
    expect(m.items['a/1#1'].box).toBe(4);
    expect(m.items['b/2#0'].box).toBe(1);
    expect(m.days).toEqual(['2026-03-02', '2026-03-04']);
    expect(m.hideStreak).toBe(true);
    expect(mergeSnapshots({ site: 'Layerwise' }, incoming)['layerwise:review']).toEqual(incoming['layerwise:review']);
  });

  it('round-trips review cards through a link code', async () => {
    const withReview = { ...snap, 'layerwise:review': { items: { 'a/1#0': { box: 2, due: '2026-04-01', lastSeen: '2026-03-02' } }, days: ['2026-03-02'] } };
    expect(await decodeSnapshot(await encodeSnapshot(withReview))).toEqual(withReview);
  });

  it('refuses a code that is not a Layerwise snapshot', async () => {
    await expect(decodeSnapshot('x.abc')).rejects.toThrow();
    await expect(decodeSnapshot('p.' + btoa('{"site":"other"}'))).rejects.toThrow();
  });

  it('merges without losing anything', () => {
    const local = { site: 'Layerwise', 'layerwise:done': ['a'], 'layerwise:quiz': { a: { score: 3, total: 3 }, b: { score: 1, total: 3 } }, 'layerwise:games': { blueprint: { best: 90, plays: 2 } }, 'layerwise:path': 'infra' };
    const incoming = { site: 'Layerwise', 'layerwise:done': ['a', 'b'], 'layerwise:quiz': { a: { score: 1, total: 3 }, b: { score: 3, total: 3 } }, 'layerwise:games': { blueprint: { best: 70, plays: 5 }, 'cost-crunch': { best: 40, plays: 1 } }, 'layerwise:path': 'builder', 'layerwise:theme': 'dark' };
    const m = mergeSnapshots(local, incoming);
    expect(m['layerwise:done']).toEqual(['a', 'b']);
    expect(m['layerwise:quiz']).toEqual({ a: { score: 3, total: 3 }, b: { score: 3, total: 3 } });
    expect(m['layerwise:games']).toEqual({ blueprint: { best: 90, plays: 5 }, 'cost-crunch': { best: 40, plays: 1 } });
    expect(m['layerwise:path']).toBe('infra'); // a setting already chosen here wins
    expect(m['layerwise:theme']).toBe('dark'); // one not chosen here is taken
  });
});

describe('per-lab and per-project keys', () => {
  const fake = (keys: string[]) => ({ length: keys.length, key: (i: number) => keys[i] ?? null });
  const keys = ['layerwise:done', 'layerwise:lab-code:cosine-search', 'layerwise:project:rag-notes', 'unrelated'];

  it('lists project ticks always and lab code only on request', () => {
    expect(perItemKeys(fake(keys), true)).toEqual(['layerwise:lab-code:cosine-search', 'layerwise:project:rag-notes']);
    expect(perItemKeys(fake(keys), false)).toEqual(['layerwise:project:rag-notes']);
  });
});
