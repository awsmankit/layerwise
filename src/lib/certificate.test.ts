import { describe, expect, it } from 'vitest';
import { averageQuizScore, cleanName, formatDay, pathCompletion, pathFromUrl, pathLessons, withCompletionDates, wrapText } from './certificate';
import { paths, pathIds } from '../data/paths';

const newcomer = pathLessons('newcomer');

describe('pathCompletion', () => {
  it('counts only lesson steps, never games', () => {
    const games = paths.builder.steps.filter((s) => s.kind === 'game').length;
    expect(games).toBeGreaterThan(0);
    expect(pathCompletion('builder', []).total).toBe(paths.builder.steps.length - games);
  });

  it('is incomplete with nothing done, and lists every lesson as remaining in order', () => {
    const c = pathCompletion('newcomer', []);
    expect(c).toEqual({ done: 0, total: newcomer.length, complete: false, remaining: newcomer });
  });

  it('is complete when every lesson is done, whatever else is in the list', () => {
    const c = pathCompletion('newcomer', ['llm/something-else', ...newcomer]);
    expect(c.complete).toBe(true);
    expect(c.done).toBe(c.total);
    expect(c.remaining).toEqual([]);
  });

  it('reports what is left when one lesson is missing', () => {
    const c = pathCompletion('newcomer', newcomer.slice(1));
    expect(c.complete).toBe(false);
    expect(c.done).toBe(newcomer.length - 1);
    expect(c.remaining).toEqual([newcomer[0]]);
  });

  it('every path has lessons and no repeated lesson', () => {
    for (const id of pathIds) {
      const keys = pathLessons(id);
      expect(keys.length).toBeGreaterThan(0);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});

describe('averageQuizScore', () => {
  it('is null when no quiz in the path was taken', () => {
    expect(averageQuizScore(newcomer, {})).toBeNull();
    expect(averageQuizScore(newcomer, { 'llm/other': { score: 3, total: 3 } })).toBeNull();
  });

  it('averages the per-lesson percentages of the quizzes taken', () => {
    const quiz = { [newcomer[0]]: { score: 3, total: 3 }, [newcomer[1]]: { score: 1, total: 2 }, 'llm/other': { score: 0, total: 4 } };
    expect(averageQuizScore(newcomer, quiz)).toBe(75);
  });

  it('rounds to a whole percent and ignores broken records', () => {
    const quiz = { [newcomer[0]]: { score: 2, total: 3 }, [newcomer[1]]: { score: 1, total: 0 } };
    expect(averageQuizScore(newcomer, quiz)).toBe(67);
  });
});

describe('pathFromUrl', () => {
  it('reads the hash, then the query', () => {
    expect(pathFromUrl('#newcomer', '')).toBe('newcomer');
    expect(pathFromUrl('', '?path=infra')).toBe('infra');
    expect(pathFromUrl('', '?builder')).toBe('builder');
    expect(pathFromUrl('#nope', '?path=also-nope')).toBeNull();
    expect(pathFromUrl('', '')).toBeNull();
  });
});

describe('completion dates', () => {
  it('stamps a newly complete path once and keeps the first date', () => {
    const first = withCompletionDates({}, newcomer, '2026-10-29');
    expect(first).toEqual({ newcomer: '2026-10-29' });
    expect(withCompletionDates(first, newcomer, '2026-12-01')).toBe(first);
    expect(withCompletionDates({}, newcomer.slice(1), '2026-10-29')).toEqual({});
  });

  it('formats a day in words', () => {
    expect(formatDay('2026-10-29')).toBe('29 October 2026');
  });
});

describe('text helpers', () => {
  it('wraps words to a width', () => {
    const measure = (s: string) => s.length;
    expect(wrapText('one two three four', 9, measure)).toEqual(['one two', 'three', 'four']);
    expect(wrapText('averyveryverylongword x', 5, measure)).toEqual(['averyveryverylongword', 'x']);
    expect(wrapText('', 10, measure)).toEqual([]);
  });

  it('tidies a name', () => {
    expect(cleanName('  Ada    Lovelace')).toBe('Ada Lovelace');
    expect(cleanName('x'.repeat(80))).toHaveLength(60);
  });
});
