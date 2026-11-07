import { describe, expect, it } from 'vitest';
import { DOCS, QUESTION, TOP_K, USERS, countsFor, kindOf, matches, pool, score, search, stem, tokens } from './no-metadata-filters';

const user = (id: string) => USERS.find((u) => u.id === id)!;
const doc = (id: string) => DOCS.find((d) => d.id === id)!;

describe('no metadata filters what-if', () => {
  it('has 18 toy documents with unique ids, three tenants and three versions', () => {
    expect(DOCS).toHaveLength(18);
    expect(new Set(DOCS.map((d) => d.id)).size).toBe(18);
    expect(new Set(DOCS.map((d) => d.tenant)).size).toBe(3);
    expect(new Set(DOCS.map((d) => d.version)).size).toBe(3);
  });
  it('tokenises with stop words and plural stemming', () => {
    expect(tokens(QUESTION)).toEqual(['reset', 'admin', 'password']);
    expect(stem('arrives')).toBe('arrive');
    expect(stem('glass')).toBe('glass');
  });
  it('scores by cosine of word counts (hand-checked)', () => {
    // Acme v3 doc: counts acme1 admin4->2 password2 v3 reset settings security link arrive email: dot = 1+2+2 = 5, |q|^2 = 3, |d|^2 = 16
    expect(score(QUESTION, doc('ac3'))).toBeCloseTo(5 / Math.sqrt(3 * 16), 3);
    expect(score(QUESTION, doc('ac2x'))).toBe(0);
  });
  it('the filter keeps only the user tenant and version before ranking', () => {
    for (const u of USERS) {
      const p = pool(u, true);
      expect(p.length).toBeGreaterThan(0);
      expect(p.every((d) => matches(d, u))).toBe(true);
      expect(pool(u, false)).toHaveLength(18);
    }
    expect(pool(user('acme'), true).map((d) => d.id).sort()).toEqual(['ac3', 'ac3x']);
  });
  it('classifies leaks before wrong versions', () => {
    const a = user('acme');
    expect(kindOf(doc('bi2'), a)).toBe('leak');
    expect(kindOf(doc('bi3'), a)).toBe('leak'); // another customer AND the right version: still a leak
    expect(kindOf(doc('ac2'), a)).toBe('version');
    expect(kindOf(doc('ac3'), a)).toBe('safe');
  });
  it('without a filter, Acme v3 gets 2 leaks, 2 wrong versions and 1 safe result in the top 5', () => {
    const c = countsFor(user('acme'), false);
    expect(c).toMatchObject({ shown: 5, leaks: 2, wrongVersion: 2, safe: 1, topIsSafe: false, searched: 18 });
    expect(search(user('acme'), false).map((h) => h.doc.id)).toEqual(['bi2', 'ac2', 'ac1', 'ac3', 'co1']);
  });
  it('with the filter there are no leaks and no wrong versions for any user', () => {
    for (const u of USERS) {
      const c = countsFor(u, true);
      expect(c.leaks).toBe(0);
      expect(c.wrongVersion).toBe(0);
      expect(c.safe).toBe(c.shown);
      expect(c.topIsSafe).toBe(true);
      expect(c.searched).toBeLessThan(18);
    }
  });
  it('without a filter every user sees at least 3 unsafe results out of 5', () => {
    for (const u of USERS) {
      const c = countsFor(u, false);
      expect(c.leaks + c.wrongVersion).toBeGreaterThanOrEqual(3);
      expect(c.shown).toBe(TOP_K);
    }
  });
  it('results are sorted by score and stable', () => {
    for (const u of USERS) {
      const s = search(u, false).map((h) => h.score);
      expect([...s].sort((a, b) => b - a)).toEqual(s);
    }
    expect(search(user('cobalt'), false)).toEqual(search(user('cobalt'), false));
  });
});
