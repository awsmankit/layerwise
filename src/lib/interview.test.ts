import { describe, expect, it } from 'vitest';
import { buildSet, scorecardMarkdown, shuffle, suggestScore, suitable, totalMinutes } from './interview';
import type { Question } from '../data/interview/types';

const q = (id: string, over: Partial<Question> = {}): Question => ({
  id,
  prompt: `Question ${id} prompt text that is long enough`,
  roles: ['ai-eng'],
  level: 'mid',
  kind: 'concept',
  topics: [id],
  minutes: 10,
  strong: ['a point one', 'a point two', 'a point three', 'a point four'],
  followUps: [
    { q: 'follow up one?', lookFor: 'something good' },
    { q: 'follow up two?', lookFor: 'something better' },
  ],
  redFlags: ['flag one', 'flag two'],
  lessons: [],
  ...over,
});

const bank: Question[] = [
  q('a'),
  q('b', { level: 'junior' }),
  q('c', { level: 'senior', kind: 'design', minutes: 35 }),
  q('d', { level: 'senior', kind: 'design', minutes: 35 }),
  q('e', { level: 'senior', kind: 'behavioural', minutes: 10 }),
  q('f', { level: 'senior', kind: 'behavioural', minutes: 10 }),
  q('g', { roles: ['ml-platform'], level: 'senior', kind: 'estimation', minutes: 15 }),
  q('h', { level: 'senior' }),
  q('i', { level: 'senior', topics: ['shared'] }),
  q('j', { level: 'senior', topics: ['shared'] }),
  q('k', { level: 'senior', topics: ['shared'] }),
];

describe('shuffle and seeds', () => {
  it('is deterministic for a seed and differs across seeds', () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(shuffle(x, 's1')).toEqual(shuffle(x, 's1'));
    expect(shuffle(x, 's1')).not.toEqual(shuffle(x, 's2'));
    expect([...shuffle(x, 's1')].sort()).toEqual(x);
  });
});

describe('suitable', () => {
  it('filters by role and allows the level below', () => {
    expect(suitable(bank[0], 'ml-platform', 'any')).toBe(false);
    expect(suitable(bank[0], 'ai-eng', 'senior')).toBe(true); // mid is one below senior
    expect(suitable(bank[1], 'ai-eng', 'senior')).toBe(false); // junior is two below
    expect(suitable(bank[2], 'ai-eng', 'junior')).toBe(false); // never above the level
  });
});

describe('buildSet', () => {
  it('fits the time box, leaving five minutes for the candidate', () => {
    for (const m of [30, 45, 60]) {
      const set = buildSet(bank, 'ai-eng', 'senior', m, 'seed');
      expect(totalMinutes(set)).toBeLessThanOrEqual(m - 5);
      expect(set.length).toBeGreaterThan(0);
    }
  });

  it('uses at most one design and one behavioural question', () => {
    const set = buildSet(bank, 'ai-eng', 'senior', 120, 'seed');
    expect(set.filter((x) => x.kind === 'design').length).toBeLessThanOrEqual(1);
    expect(set.filter((x) => x.kind === 'behavioural').length).toBeLessThanOrEqual(1);
  });

  it('anchors a long senior interview with a design question', () => {
    expect(buildSet(bank, 'ai-eng', 'senior', 60, 'x').some((x) => x.kind === 'design')).toBe(true);
  });

  it('never lets one design question crowd out the rest of the interview', () => {
    const longDesign = [...bank, q('long', { level: 'senior', kind: 'design', minutes: 45 })].filter((x) => x.kind !== 'design' || x.id === 'long');
    const set = buildSet(longDesign, 'ai-eng', 'senior', 60, 'z');
    expect(set.some((x) => x.id === 'long')).toBe(false);
    expect(set.length).toBeGreaterThanOrEqual(3);
    const big = buildSet(longDesign, 'ai-eng', 'senior', 90, 'z');
    expect(big.some((x) => x.id === 'long')).toBe(true);
    expect(big.length).toBeGreaterThanOrEqual(3);
  });

  it('never repeats a question and avoids three on the same topic', () => {
    const set = buildSet(bank, 'ai-eng', 'senior', 120, 'y');
    expect(new Set(set.map((x) => x.id)).size).toBe(set.length);
    expect(set.filter((x) => x.topics[0] === 'shared').length).toBeLessThanOrEqual(2);
  });

  it('gives every candidate the same set for the same seed', () => {
    expect(buildSet(bank, 'ai-eng', 'senior', 60, 'role-x').map((x) => x.id)).toEqual(buildSet(bank, 'ai-eng', 'senior', 60, 'role-x').map((x) => x.id));
  });

  it('prefers the role, and tops up from other roles only when the role runs short', () => {
    const platformRich = [...bank, ...['p1', 'p2', 'p3', 'p4', 'p5'].map((id) => q(id, { roles: ['ml-platform'], level: 'senior', topics: [id] }))];
    const set = buildSet(platformRich, 'ml-platform', 'senior', 60, 'z');
    expect(set.every((x) => x.roles.includes('ml-platform'))).toBe(true);
    const sparse = buildSet(bank, 'ml-platform', 'senior', 60, 'z'); // only one platform question exists
    expect(sparse.some((x) => x.roles.includes('ml-platform'))).toBe(true);
    expect(totalMinutes(sparse)).toBeGreaterThan(30);
  });
});

describe('suggestScore', () => {
  it('maps coverage and follow-ups onto the 1 to 4 scale', () => {
    expect(suggestScore(0, 5, 0, false)).toBe(1);
    expect(suggestScore(2, 5, 0, false)).toBe(2);
    expect(suggestScore(4, 5, 1, false)).toBe(3);
    expect(suggestScore(5, 5, 2, false)).toBe(4);
  });
  it('a harmful red flag caps the score at 1', () => {
    expect(suggestScore(5, 5, 3, true)).toBe(1);
  });
});

describe('scorecardMarkdown', () => {
  it('summarises scores and lists covered and missed points', () => {
    const md = scorecardMarkdown('Interview', [
      { id: 'a', prompt: 'Prompt A', score: 3, covered: ['x'], missed: ['y'], flags: [], notes: 'good' },
      { id: 'b', prompt: 'Prompt B', score: null, covered: [], missed: [], flags: ['z'], notes: '' },
    ]);
    expect(md).toContain('Average score: 3.0');
    expect(md).toContain('1 of 2 questions scored');
    expect(md).toContain('- x');
    expect(md).toContain('Not covered:');
    expect(md).toContain('Red flags seen:');
  });
});
