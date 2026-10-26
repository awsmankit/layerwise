import { describe, expect, it } from 'vitest';
import { search, type SearchItem } from './search';

const items: SearchItem[] = [
  { t: 'KV cache and GPU memory', u: '/a', k: 'Lesson', s: 'Why generation needs a cache and how big it gets.' },
  { t: 'KV cache', u: '/b', k: 'Term', s: 'Stored keys and values of earlier tokens.' },
  { t: 'Fit the Model', u: '/c', k: 'Game', s: 'Pick a model and precision so it fits in memory.' },
  { t: 'Cost calculator', u: '/d', k: 'Tool', s: 'Estimate monthly spend from tokens.' },
  { t: 'Quantization', u: '/e', k: 'Lesson', s: 'Storing weights in fewer bits to save memory.' },
];

describe('search', () => {
  it('returns nothing for an empty query', () => {
    expect(search(items, '')).toEqual([]);
    expect(search(items, '   ')).toEqual([]);
  });

  it('ranks exact and prefix title matches first', () => {
    expect(search(items, 'kv cache')[0].u).toBe('/b');
    expect(search(items, 'quant')[0].u).toBe('/e');
  });

  it('ranks results matching every word first', () => {
    expect(search(items, 'cache gpu')[0].u).toBe('/a');
  });

  it('keeps partial matches for multi-word queries, below full matches', () => {
    const r = search(items, 'cache banana').map((i) => i.u);
    expect(r.length).toBeGreaterThan(0);
    expect(search(items, 'kv cache memory')[0].u).toBe('/a');
  });

  it('drops results matching too few words', () => {
    expect(search(items, 'banana mango cache')).toEqual([]);
    expect(search(items, 'banana')).toEqual([]);
  });

  it('also matches descriptions', () => {
    expect(search(items, 'spend').map((i) => i.u)).toEqual(['/d']);
  });

  it('is case-insensitive and safe with regex characters', () => {
    expect(search(items, 'KV CACHE').length).toBeGreaterThan(0);
    expect(() => search(items, '(cache[')).not.toThrow();
    expect(search(items, 'c++')).toEqual([]);
  });

  it('respects the limit', () => {
    expect(search(items, 'a', 2)).toHaveLength(2);
  });
});
