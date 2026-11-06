import { describe, expect, it } from 'vitest';
import { cosine, DOCS, embed, keywordScore, QUERIES, rank, sharedWords, success, successCount, tokens } from './no-embeddings';

const q = (id: string) => QUERIES.find((x) => x.id === id)!;

describe('no embeddings what-if', () => {
  it('drops stop words and lowercases', () => {
    expect(tokens('Where is MY package?')).toEqual(['where', 'package']);
  });
  it('keyword search needs the same spelling', () => {
    expect(keywordScore('get my cash back', DOCS[0].text)).toBe(0);
    expect(keywordScore('refund policy', DOCS[0].text)).toBe(2);
    // "screen" is not "screens"
    expect(keywordScore('my phone screen is smashed', DOCS[3].text)).toBe(0);
    expect(sharedWords('refund policy', DOCS[0].text)).toEqual(['refund', 'policy']);
  });
  it('cosine is 1 for the same direction, 0 for nothing in common', () => {
    expect(cosine([1, 2, 0], [2, 4, 0])).toBeCloseTo(1, 10);
    expect(cosine([1, 0], [0, 1])).toBe(0);
    expect(cosine([0, 0], [1, 1])).toBe(0);
  });
  it('embeds by adding word vectors (hand-checked)', () => {
    // refund 1 + return 0.7 + money 1 on the money axis; return 0.3 + days 0.3 on the shipping axis
    const v = embed(DOCS[0].text);
    expect(v[0]).toBeCloseTo(2.7, 10);
    expect(v[1]).toBeCloseTo(0.6, 10);
    // cosine with a pure refund query: 2.7 / sqrt(2.7^2 + 0.6^2)
    expect(cosine(embed('refund'), v)).toBeCloseTo(2.7 / Math.sqrt(2.7 ** 2 + 0.6 ** 2), 10);
  });
  it('keyword search misses every reworded question but finds the one that reuses the document words', () => {
    for (const id of ['cash', 'package', 'signin', 'smashed']) {
      expect(rank(q(id).text, 'keyword').every((r) => !r.hit), id).toBe(true);
      expect(success(q(id), 'keyword'), id).toBe(false);
    }
    expect(success(q('refund'), 'keyword')).toBe(true);
    expect(successCount('keyword')).toBe(1);
  });
  it('meaning search finds the right document for all five', () => {
    expect(successCount('meaning')).toBe(5);
    const r = rank('get my cash back', 'meaning');
    expect(r[0].id).toBe('refunds');
    expect(r[0].score).toBeGreaterThan(0.9);
  });
  it('ranks all documents, ties keep the original order', () => {
    const r = rank('where is my package', 'keyword');
    expect(r.map((x) => x.id)).toEqual(DOCS.map((d) => d.id));
  });
});
