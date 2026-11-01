import { describe, expect, it } from 'vitest';
import {
  CHUNKS,
  COMMUNITY_REPORTS,
  EDGES,
  ENTITIES,
  QUESTIONS,
  answerable,
  approxTokens,
  chunkCommunity,
  chunkTokens,
  collapseEdges,
  communities,
  graphRetrieve,
  linkEntities,
  rank,
  themesOf,
  tokens,
  vectorTopK,
} from './graph-retrieval';

const Q = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));

describe('the invented data is consistent', () => {
  it('every edge and chunk entity exists, and every edge points at a real chunk', () => {
    const ids = new Set(ENTITIES.map((e) => e.id));
    const chunkIds = new Set(CHUNKS.map((c) => c.id));
    for (const e of EDGES) {
      expect(ids.has(e.from) && ids.has(e.to)).toBe(true);
      expect(chunkIds.has(e.chunk)).toBe(true);
    }
    for (const c of CHUNKS) for (const x of c.entities) expect(ids.has(x)).toBe(true);
  });
  it('every needed passage exists and every theme asked for appears in the collection', () => {
    for (const q of QUESTIONS) for (const n of q.needed) expect(CHUNKS.some((c) => c.id === n)).toBe(true);
    const all = themesOf(CHUNKS.map((c) => c.id));
    for (const t of Q.all.themes!) expect(all).toContain(t);
  });
});

describe('toy embedding', () => {
  it('merges synonyms into concepts and drops stop words', () => {
    expect(tokens('Which supplier makes the sensor?')).toEqual(['supplier', 'supplier', 'sensor']);
    expect(tokens('The sensor is manufactured by Norvane')).toEqual(['sensor', 'supplier', 'norvane']);
  });
  it('ranks the single-fact passage first for the single-fact question', () => {
    expect(rank(Q.fact.text)[0].id).toBe('c6');
    expect(vectorTopK(Q.fact.text, 1)).toEqual(['c6']);
  });
  it('is deterministic and sorted', () => {
    const a = rank(Q.hop.text);
    expect(a).toEqual(rank(Q.hop.text));
    for (let i = 1; i < a.length; i++) expect(a[i - 1].score).toBeGreaterThanOrEqual(a[i].score);
  });
});

describe('multi-hop question: vector search finds the end of the chain, not the whole chain', () => {
  const order = rank(Q.hop.text).map((s) => s.id);
  it('has the ranking pinned', () => {
    expect(order.slice(0, 5)).toEqual(['c3', 'c5', 'c7', 'c1', 'c2']);
  });
  it('is not answerable until k reaches 5', () => {
    for (const k of [1, 2, 3, 4]) expect(answerable(Q.hop, vectorTopK(Q.hop.text, k))).toBe(false);
    expect(answerable(Q.hop, vectorTopK(Q.hop.text, 5))).toBe(true);
  });
});

describe('graph retrieval', () => {
  it('links entities by name', () => {
    expect(linkEntities(Q.hop.text)).toEqual(['priya']);
    expect(linkEntities(Q.fact.text)).toEqual(['kestrel']);
    expect(linkEntities(Q.all.text)).toEqual([]);
  });
  it('needs three hops to reach the supplier from Priya', () => {
    expect(graphRetrieve(Q.hop.text, 1).chunks).toEqual(['c1']);
    expect(graphRetrieve(Q.hop.text, 2).chunks).toEqual(['c1', 'c2', 'c11']);
    const three = graphRetrieve(Q.hop.text, 3);
    expect(three.chunks).toEqual(['c1', 'c2', 'c3', 'c11']);
    expect(answerable(Q.hop, three.chunks)).toBe(true);
    expect(answerable(Q.hop, graphRetrieve(Q.hop.text, 2).chunks)).toBe(false);
    expect(three.reached.get('norvane')).toBe(3);
  });
  it('finds the single fact too, but drags in neighbours', () => {
    const g = graphRetrieve(Q.fact.text, 1);
    expect(answerable(Q.fact, g.chunks)).toBe(true);
    expect(g.chunks.length).toBe(4);
    const tokensGraph = g.chunks.reduce((s, id) => s + chunkTokens(id), 0);
    expect(tokensGraph).toBeGreaterThan(chunkTokens('c6') * 3);
  });
  it('returns nothing from a question that names no entity', () => {
    expect(graphRetrieve(Q.all.text, 3).chunks).toEqual([]);
  });
});

describe('communities', () => {
  const g = communities();
  it('finds three groups', () => {
    expect(g).toEqual([
      ['priya', 'kestrel', 'lisbon', 'lidar', 'norvane'],
      ['ines', 'percep'],
      ['tomas', 'osprey', 'leeds', 'cobalt', 'calder'],
    ]);
  });
  it('has a report for each group, keyed by its first member', () => {
    for (const grp of g) expect(COMMUNITY_REPORTS[grp[0]]).toBeDefined();
    expect(Object.keys(COMMUNITY_REPORTS).length).toBe(g.length);
  });
  it('recovers two obvious clusters in a toy graph with a bridge', () => {
    const edges = [
      { from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'a', to: 'c' },
      { from: 'x', to: 'y' }, { from: 'y', to: 'z' }, { from: 'x', to: 'z' },
      { from: 'c', to: 'x' },
    ];
    expect(communities(['a', 'b', 'c', 'x', 'y', 'z'], edges)).toEqual([['a', 'b', 'c'], ['x', 'y', 'z']]);
  });
  it('collapses parallel edges', () => {
    expect(collapseEdges().length).toBe(EDGES.length);
  });
  it('the reports cover every theme the whole-collection question asks for; top-k passages do not', () => {
    const covered = new Set<string>();
    for (const c of CHUNKS) {
      const idx = chunkCommunity(c, g);
      if (idx !== null) covered.add(c.theme);
    }
    for (const t of Q.all.themes!) expect(covered.has(t)).toBe(true);
    const vecThemes = themesOf(vectorTopK(Q.all.text, 5));
    expect(vecThemes.filter((t) => Q.all.themes!.includes(t))).toEqual(['People', 'Parts and suppliers']);
    expect(themesOf(vectorTopK(Q.all.text, 13)).filter((t) => Q.all.themes!.includes(t)).length).toBe(2);
  });
});

describe('token estimate', () => {
  it('is words times 1.3, rounded', () => {
    expect(approxTokens('one two three four five')).toBe(7);
    expect(chunkTokens('c6')).toBe(10);
  });
});
