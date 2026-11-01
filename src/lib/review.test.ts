import { describe, expect, it } from 'vitest';
import {
  EMPTY_REVIEW,
  INTERVALS,
  addDays,
  boxCounts,
  buildPool,
  counts,
  dayKey,
  daysBetween,
  eligibleKeys,
  itemId,
  lastDays,
  mergeReview,
  nextCard,
  nextDueDay,
  optionOrder,
  parseId,
  pickAhead,
  pickSession,
  recordAnswer,
  sanitise,
  streak,
  withDay,
  type ReviewState,
} from './review';

const T = '2026-03-10';
const state = (items: ReviewState['items'] = {}, days: string[] = []): ReviewState => ({ items, days });

describe('days', () => {
  it('turns a local date into a key without a clock', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(dayKey(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31');
  });
  it('adds days across month, year and leap boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2026-03-01', '2026-03-10')).toBe(9);
  });
});

describe('ids and the pool', () => {
  it('builds and parses a stable id', () => {
    expect(itemId('llm/prompting', 2)).toBe('llm/prompting#2');
    expect(parseId('llm/prompting#2')).toEqual({ key: 'llm/prompting', index: 2 });
    expect(parseId('nohash')).toBeNull();
    expect(parseId('a/b#x')).toBeNull();
  });
  it('puts the newest finished lesson first, then scored-only lessons, without repeats', () => {
    expect(eligibleKeys(['a/1', 'b/2', 'c/3'], { 'b/2': {}, 'd/4': {}, 'e/5': {} })).toEqual(['c/3', 'b/2', 'a/1', 'e/5', 'd/4']);
    expect(eligibleKeys([], {})).toEqual([]);
  });
  it('lists every question of each lesson in order', () => {
    const pool = buildPool(['a/1', 'b/2'], { 'a/1': 2, 'b/2': 1, 'c/3': 4 });
    expect(pool.map((p) => p.id)).toEqual(['a/1#0', 'a/1#1', 'b/2#0']);
  });
});

describe('the Leitner schedule', () => {
  it('puts a new question that is answered right in box 1, due tomorrow', () => {
    expect(nextCard(undefined, true, T)).toEqual({ box: 1, due: '2026-03-11', lastSeen: T });
  });
  it('puts a new question that is answered wrong in box 1 as well', () => {
    expect(nextCard(undefined, false, T)).toEqual({ box: 1, due: '2026-03-11', lastSeen: T });
  });
  it('moves up one box a time, with the intervals 1, 2, 4, 8, 16, 32', () => {
    let card = nextCard(undefined, true, T);
    const gaps = [daysBetween(T, card.due)];
    for (let i = 0; i < 5; i++) {
      card = nextCard(card, true, T);
      gaps.push(daysBetween(T, card.due));
    }
    expect(gaps).toEqual([...INTERVALS]);
    expect(card.box).toBe(6);
  });
  it('stays in the top box on another right answer', () => {
    expect(nextCard({ box: 6, due: T, lastSeen: T }, true, T)).toEqual({ box: 6, due: '2026-04-11', lastSeen: T });
  });
  it('drops to box 1 from any box on a wrong answer', () => {
    expect(nextCard({ box: 5, due: T, lastSeen: T }, false, T)).toEqual({ box: 1, due: '2026-03-11', lastSeen: T });
  });
  it('records the answer and the day, and does not change the input', () => {
    const before = state({}, ['2026-03-09']);
    const after = recordAnswer(before, 'a/1#0', true, T);
    expect(after.items['a/1#0'].box).toBe(1);
    expect(after.days).toEqual(['2026-03-09', T]);
    expect(before.items).toEqual({});
    expect(withDay(['2026-03-10'], T)).toEqual(['2026-03-10']);
  });
});

describe('picking a session', () => {
  const pool = buildPool(['c/3', 'b/2', 'a/1'], { 'c/3': 3, 'b/2': 3, 'a/1': 3 });

  it('offers due questions first, the longest overdue first, then lower boxes first', () => {
    const s = state({
      'a/1#0': { box: 3, due: '2026-03-08', lastSeen: '2026-03-04' },
      'b/2#0': { box: 1, due: '2026-03-09', lastSeen: '2026-03-08' },
      'b/2#1': { box: 2, due: '2026-03-09', lastSeen: '2026-03-07' },
      'c/3#0': { box: 4, due: '2026-03-20', lastSeen: '2026-03-10' },
    });
    expect(pickSession(pool, s, T, 3)).toEqual(['a/1#0', 'b/2#0', 'b/2#1']);
  });
  it('fills the rest with new questions, one lesson at a time, newest lesson first', () => {
    const s = state({ 'a/1#0': { box: 1, due: T, lastSeen: '2026-03-09' } });
    expect(pickSession(pool, s, T, 5)).toEqual(['a/1#0', 'c/3#0', 'b/2#0', 'a/1#1', 'c/3#1']);
  });
  it('never offers a question that is not due', () => {
    const s = state({ 'a/1#0': { box: 2, due: '2026-03-12', lastSeen: T } });
    expect(pickSession(pool, s, T, 9)).not.toContain('a/1#0');
  });
  it('returns fewer than the size when there is not enough, and nothing for an empty pool', () => {
    expect(pickSession(buildPool(['a/1'], { 'a/1': 2 }), state(), T)).toEqual(['a/1#0', 'a/1#1']);
    expect(pickSession([], state(), T)).toEqual([]);
  });
  it('offers the soonest-due questions to a learner who is caught up', () => {
    const s = state({
      'a/1#0': { box: 3, due: '2026-03-14', lastSeen: T },
      'a/1#1': { box: 2, due: '2026-03-12', lastSeen: T },
      'b/2#0': { box: 1, due: '2026-03-10', lastSeen: '2026-03-09' },
    });
    expect(pickAhead(pool, s, T, 2)).toEqual(['a/1#1', 'a/1#0']);
  });
  it('counts due, new and answered, and the boxes', () => {
    const s = state({
      'a/1#0': { box: 6, due: '2026-04-01', lastSeen: T },
      'a/1#1': { box: 1, due: T, lastSeen: '2026-03-09' },
      'b/2#0': { box: 2, due: '2026-03-09', lastSeen: '2026-03-07' },
      'gone/9#0': { box: 3, due: T, lastSeen: T },
    });
    expect(counts(pool, s, T)).toEqual({ due: 2, fresh: 6, seen: 3, total: 9, settled: 1 });
    expect(boxCounts(pool, s)).toEqual([1, 1, 0, 0, 0, 1]);
    expect(nextDueDay(pool, s, T)).toBe('2026-04-01');
    expect(nextDueDay(pool, state(), T)).toBeNull();
  });
});

describe('option order', () => {
  it('is a permutation, fixed for a seed, and different across seeds', () => {
    const a = optionOrder(4, 'x#0:1');
    expect([...a].sort()).toEqual([0, 1, 2, 3]);
    expect(optionOrder(4, 'x#0:1')).toEqual(a);
    const seen = new Set(Array.from({ length: 30 }, (_, i) => optionOrder(4, `x#0:${i}`).join()));
    expect(seen.size).toBeGreaterThan(5);
  });
});

describe('the streak', () => {
  const d = (n: number) => addDays(T, -n); // d(0) is today
  it('is zero with no days', () => {
    expect(streak([], T)).toEqual({ count: 0, doneToday: false, restUsed: false });
  });
  it('counts consecutive days including today', () => {
    expect(streak([d(2), d(1), d(0)], T)).toEqual({ count: 3, doneToday: true, restUsed: false });
  });
  it('does not hold today against the run before today has ended', () => {
    expect(streak([d(3), d(2), d(1)], T)).toEqual({ count: 3, doneToday: false, restUsed: false });
  });
  it('lets one rest day in a week pass', () => {
    expect(streak([d(4), d(3), d(1), d(0)], T)).toEqual({ count: 4, doneToday: true, restUsed: true });
    // yesterday off, today not yet started
    expect(streak([d(4), d(3), d(2)], T).count).toBe(3);
  });
  it('ends the run at a second day off inside a week', () => {
    expect(streak([d(6), d(5), d(3), d(0)], T).count).toBe(1); // d(1) and d(2) both missed
    expect(streak([d(5), d(4), d(2), d(0)], T).count).toBe(2); // misses at d(1) and d(3), two days apart
  });
  it('allows a rest day in each separate week', () => {
    // misses at d(2) and d(9): seven days apart, so both are rest days
    const days = [0, 1, 3, 4, 5, 6, 7, 8, 10].map(d);
    expect(streak(days, T).count).toBe(9);
  });
  it('is zero after a long gap, and a day off yesterday still keeps the run', () => {
    expect(streak([d(30)], T).count).toBe(0);
    expect(streak([d(3)], T).count).toBe(0); // two days off in a row
    expect(streak([d(2)], T).count).toBe(1); // only yesterday off, and today is still open
  });
  it('lists the last 14 days oldest first', () => {
    const dots = lastDays([d(0), d(2)], T);
    expect(dots).toHaveLength(14);
    expect(dots[13]).toEqual({ day: T, active: true, isToday: true });
    expect(dots[11].active).toBe(true);
    expect(dots[12].active).toBe(false);
    expect(dots[0].day).toBe(addDays(T, -13));
  });
});

describe('stored shape and merging', () => {
  it('drops anything malformed and never throws', () => {
    expect(sanitise(null)).toEqual(EMPTY_REVIEW);
    expect(sanitise('x')).toEqual(EMPTY_REVIEW);
    const s = sanitise({
      items: { 'a/1#0': { box: 2, due: T, lastSeen: T }, 'a/1#1': { box: 9, due: T, lastSeen: T }, bad: { box: 1, due: T, lastSeen: T }, 'a/1#2': { box: 1, due: 'soon', lastSeen: T } },
      days: [T, 'nope', T, '2026-03-01'],
      hideStreak: 'yes',
    });
    expect(Object.keys(s.items)).toEqual(['a/1#0']);
    expect(s.days).toEqual(['2026-03-01', T]);
    expect(s.hideStreak).toBeUndefined();
  });
  it('keeps the later lastSeen per question, and the higher box on a tie', () => {
    const a = { items: { 'a/1#0': { box: 4, due: '2026-03-20', lastSeen: '2026-03-04' }, 'a/1#1': { box: 2, due: '2026-03-12', lastSeen: T }, 'a/1#2': { box: 3, due: '2026-03-13', lastSeen: T } }, days: ['2026-03-04', T] };
    const b = { items: { 'a/1#0': { box: 1, due: '2026-03-11', lastSeen: T }, 'a/1#1': { box: 5, due: '2026-03-30', lastSeen: T }, 'a/1#2': { box: 1, due: '2026-03-11', lastSeen: T }, 'b/2#0': { box: 2, due: T, lastSeen: T } }, days: ['2026-03-05', T] };
    const m = mergeReview(a, b);
    expect(m.items['a/1#0'].box).toBe(1); // later answer wins even with a lower box
    expect(m.items['a/1#1'].box).toBe(5); // same day: higher box
    expect(m.items['a/1#2'].box).toBe(3);
    expect(m.items['b/2#0'].box).toBe(2);
    expect(m.days).toEqual(['2026-03-04', '2026-03-05', T]);
    expect(mergeReview(b, a).items['a/1#1'].box).toBe(5); // order does not matter
  });
  it('takes the streak switch from this browser unless it is unset', () => {
    expect(mergeReview({ hideStreak: true }, { hideStreak: false }).hideStreak).toBe(true);
    expect(mergeReview({}, { hideStreak: true }).hideStreak).toBe(true);
    expect('hideStreak' in mergeReview({}, {})).toBe(false);
  });
});
