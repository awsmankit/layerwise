import { describe, expect, it } from 'vitest';
import { CHAT, PAGES, STANDALONE, answerRank, correctCount, idf, planIn, queryFor, resultsFor, rewriteChat, score, search, stem, tokens, topTies } from './no-query-rewriting';

describe('no query rewriting what-if', () => {
  it('tokenises and stems', () => {
    expect(tokens('How much does the Orbit plan cost?')).toEqual(['orbit', 'plan', 'cost']);
    expect(stem('plans')).toBe('plan');
    expect(stem('glass')).toBe('glass');
  });
  it('idf is higher for a word that appears on fewer pages (hand-checked)', () => {
    // "orbit" is on 3 of 9 pages: ln(1 + 9 / 3.5)
    expect(idf('orbit')).toBeCloseTo(Math.log(1 + 9 / 3.5), 10);
    expect(idf('orbit')).toBeGreaterThan(idf('plan'));
  });
  it('a page scores the sum of idf of the query words it contains', () => {
    const i = PAGES.findIndex((p) => p.id === 'orbit-cost');
    expect(score('How much does the Orbit plan cost?', i)).toBeCloseTo(idf('orbit') + idf('plan') + idf('cost'), 5);
    expect(score('weather today', i)).toBe(0);
  });
  it('the rewriter resolves "it" and "what about the X one" from the chat so far', () => {
    expect(STANDALONE).toEqual([
      'Tell me about the Orbit plan.',
      'How much does the Orbit plan cost?',
      'Does the Orbit plan work offline?',
      'Does the Lumen plan work offline?',
    ]);
  });
  it('the rewriter adds the plan when the message has neither a name nor "it"', () => {
    expect(rewriteChat(['Tell me about the Nimbus plan.', 'Is there a free month?'])[1]).toBe('Is there a free month for the Nimbus plan?');
    expect(rewriteChat(['Is there a free month?'])).toEqual(['Is there a free month?']);
    expect(planIn('does the NIMBUS plan work?')).toBe('Nimbus');
    expect(planIn('does it work?')).toBeNull();
  });
  it('the first message stands alone, so rewriting changes nothing', () => {
    expect(queryFor(0, true)).toBe(queryFor(0, false));
    expect(answerRank(0, false)).toBe(1);
    expect(answerRank(0, true)).toBe(1);
  });
  it('the raw follow-up "how much does it cost" gives all three price pages the same score', () => {
    expect(topTies(1, false)).toBe(3);
    expect(resultsFor(1, false).map((h) => h.id)).toEqual(['lumen-cost', 'nimbus-cost', 'orbit-cost']);
    expect(answerRank(1, false)).toBe(3);
  });
  it('the rewritten follow-up puts the Orbit price page alone at the top', () => {
    expect(resultsFor(1, true)[0].id).toBe('orbit-cost');
    expect(topTies(1, true)).toBe(1);
    expect(answerRank(1, true)).toBe(1);
  });
  it('"what about the Lumen one" raw finds Lumen pages but the wrong one', () => {
    expect(resultsFor(3, false)[0].id).toBe('lumen-about');
    expect(answerRank(3, false)).toBe(3);
    expect(answerRank(3, true)).toBe(1);
  });
  it('right page first: 1 of 4 raw, 4 of 4 rewritten, and only more turns can hurt', () => {
    expect(correctCount(false)).toBe(1);
    expect(correctCount(true)).toBe(4);
    expect(correctCount(false, 0)).toBe(1);
    expect(correctCount(true, 1)).toBe(2);
  });
  it('every chat turn names an existing page and search never returns zero-score pages', () => {
    for (const t of CHAT) expect(PAGES.some((p) => p.id === t.answer)).toBe(true);
    for (const h of search('and how much does it cost?')) expect(h.score).toBeGreaterThan(0);
    expect(search('zzz')).toEqual([]);
  });
});
