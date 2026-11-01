import { describe, expect, it } from 'vitest';
import { CORPUS, QUESTIONS, STRATEGIES, bm25, embed, embeddingScores, grid, rankBy, retrieve, roundRobin, rrf, search, searchFree, stem, tokenise } from './query-lab';

const q = (id: string) => QUESTIONS.find((x) => x.id === id)!;
const idx = (id: string) => CORPUS.findIndex((p) => p.id === id);

describe('data', () => {
  it('has unique passage ids and gold passages that exist', () => {
    expect(new Set(CORPUS.map((p) => p.id)).size).toBe(CORPUS.length);
    for (const x of QUESTIONS) for (const g of x.gold) expect(CORPUS.some((p) => p.id === g)).toBe(true);
  });
  it('has every scripted field filled in', () => {
    for (const x of QUESTIONS) {
      expect(x.rewrite.length).toBeGreaterThan(5);
      expect(x.multi.length).toBe(3);
      expect(x.split.length).toBeGreaterThanOrEqual(1);
      expect(x.hyde.length).toBeGreaterThan(40);
    }
  });
});

describe('text handling', () => {
  it('stems the plural and verb forms that the corpus uses', () => {
    expect(stem('bikes')).toBe(stem('bike'));
    expect(stem('unlocks')).toBe(stem('unlock'));
    expect(stem('released')).toBe(stem('release'));
    expect(stem('passes')).toBe(stem('pass'));
    expect(stem('ride')).toBe(stem('riding'));
  });
  it('treats e-bike as one word and drops stop words', () => {
    expect(tokenise('The e-bike battery')).toEqual([stem('ebike'), 'battery']);
  });
});

describe('scorers', () => {
  it('BM25 puts a passage with the query words first', () => {
    const s = bm25('Night Pass price');
    expect(rankBy(s)[0]).toBe(idx('night-pass'));
  });
  it('keyword search misses "dog" because the page says "pet"; the embedding stand-in does not', () => {
    expect(search('dog', 'keyword')).not.toContain(idx('carry'));
    expect(rankBy(embeddingScores('dog'))[0]).toBe(idx('carry'));
  });
  it('the embedding stand-in is deterministic and scores identical text as 1', () => {
    expect(embed('a dog in a basket')).toEqual(embed('a dog in a basket'));
    const e = embeddingScores(`${CORPUS[0].title} ${CORPUS[0].text}`);
    expect(e[0]).toBeCloseTo(1, 10);
  });
});

describe('fusion helpers', () => {
  it('RRF with k = 60 matches the worked example in the vector search lesson (A B C and C A D give A C B D)', () => {
    // A=0, B=1, C=2, D=3
    expect(rrf([[0, 1, 2], [2, 0, 3]])).toEqual([0, 2, 1, 3]);
  });
  it('round robin takes one from each list in turn without repeats', () => {
    expect(roundRobin([[1, 2, 3], [2, 4, 5]], 4)).toEqual([1, 2, 4, 3]);
    expect(roundRobin([[1], [1]], 3)).toEqual([1]);
  });
});

describe('the lab results quoted in the lesson (keyword search, keep top 2)', () => {
  const g = grid('keyword', 2);
  const mean = Object.fromEntries(STRATEGIES.map((s, i) => [s.id, Math.round(g.means[i] * 100)]));
  it('means', () => {
    expect(mean).toEqual({ raw: 30, rewrite: 90, multi: 70, split: 60, hyde: 90 });
  });
  it('a rewrite that only tidies the wording does not fix the two-passage question; splitting does', () => {
    expect(retrieve(q('worth'), 'raw', 'keyword', 2).recall).toBe(0.5);
    expect(retrieve(q('worth'), 'rewrite', 'keyword', 2).recall).toBe(0.5);
    expect(retrieve(q('worth'), 'split', 'keyword', 2).recall).toBe(1);
  });
  it('splitting a single-hop question changes nothing', () => {
    expect(retrieve(q('stuck'), 'split', 'keyword', 2).queries).toEqual([q('stuck').question]);
    expect(retrieve(q('stuck'), 'split', 'keyword', 2).ids).toEqual(retrieve(q('stuck'), 'raw', 'keyword', 2).ids);
  });
  it('the follow-up needs the history: raw misses, the rewrite finds it', () => {
    expect(retrieve(q('battery'), 'raw', 'keyword', 2).recall).toBe(0);
    expect(retrieve(q('battery'), 'rewrite', 'keyword', 2).recall).toBe(1);
  });
  it('multi-query does not rescue the follow-up when the paraphrases keep the word "battery"', () => {
    expect(retrieve(q('battery'), 'multi', 'keyword', 2).recall).toBe(0);
  });
  it('HyDE with an invented price pushes the Night Pass page down: found at top 2, lost at top 1 (raw finds it first)', () => {
    expect(retrieve(q('night'), 'raw', 'keyword', 1).recall).toBe(1);
    expect(retrieve(q('night'), 'hyde', 'keyword', 1).recall).toBe(0);
    expect(retrieve(q('night'), 'hyde', 'keyword', 2).recall).toBe(1);
  });
  it('the dog question is found raw by the embedding stand-in but not by keyword search', () => {
    expect(retrieve(q('dog'), 'raw', 'keyword', 2).recall).toBe(0);
    expect(retrieve(q('dog'), 'raw', 'embedding', 2).recall).toBe(1);
  });
  it('no strategy is best on every question', () => {
    for (const s of STRATEGIES) {
      const col = STRATEGIES.findIndex((x) => x.id === s.id);
      const winsEverywhere = g.rows.every((r) => r.cells[col] === Math.max(...r.cells));
      expect(winsEverywhere, s.id).toBe(false);
    }
  });
});

describe('retrieve', () => {
  it('counts the searches and model calls', () => {
    expect(retrieve(q('stuck'), 'raw', 'keyword', 2)).toMatchObject({ llmCalls: 0, queries: [q('stuck').question] });
    expect(retrieve(q('stuck'), 'multi', 'keyword', 2).queries).toHaveLength(4);
    expect(retrieve(q('worth'), 'split', 'keyword', 2)).toMatchObject({ llmCalls: 1 });
  });
  it('never returns more than k passages', () => {
    for (const x of QUESTIONS) for (const s of STRATEGIES) expect(retrieve(x, s.id, 'hybrid', 3).ids.length).toBeLessThanOrEqual(3);
    expect(searchFree('where do I leave the bike', 'keyword', 2)).toHaveLength(2);
  });
});
