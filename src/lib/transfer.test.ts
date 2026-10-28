import { describe, expect, it } from 'vitest';
import { decodeSnapshot, encodeSnapshot, mergeSnapshots } from './transfer';

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
