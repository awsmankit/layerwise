import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDone } from '../viz/shared';
import { KEYS, readStore, useStore, writeStore } from '../../lib/store';
import { EMPTY_REVIEW, buildPool, dayKey, eligibleKeys, parseId, recordAnswer, sanitise, type PoolItem } from '../../lib/review';
import type { QuizItem } from '../../data/lesson-extras';

/**
 * What both review islands need: the learner's stored review state, today's day key, and the
 * question bank. The bank is the quiz of every lesson, which is large, so it is imported only
 * once the learner has a lesson that could put questions in the pool.
 */
export function useReview(titles?: Record<string, string>) {
  const { done } = useDone();
  const [quiz] = useStore<Record<string, unknown>>(KEYS.quiz, {});
  const [raw] = useStore<unknown>(KEYS.review, null);
  const [today, setToday] = useState<string | null>(null);
  const [bank, setBank] = useState<Record<string, QuizItem[]> | null>(null);
  const [failed, setFailed] = useState(false);

  // "Today" is only known in the browser, so the server render and first paint agree, and it
  // is read again when the tab comes back, in case midnight passed while it was open.
  useEffect(() => {
    const sync = () => setToday(dayKey(new Date()));
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  const state = useMemo(() => sanitise(raw), [raw]);
  const keys = useMemo(() => eligibleKeys(done, quiz), [done, quiz]);
  const wantBank = today !== null && keys.length > 0;

  useEffect(() => {
    if (!wantBank || bank) return;
    let live = true;
    import('../../data/lesson-extras').then(
      (m) => live && setBank(Object.fromEntries(Object.entries(m.extras).map(([k, e]) => [k, e.quiz]))),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [wantBank, bank]);

  const pool: PoolItem[] = useMemo(() => {
    if (!bank) return [];
    const usable = keys.filter((k) => bank[k]?.length && (!titles || titles[k]));
    return buildPool(usable, Object.fromEntries(usable.map((k) => [k, bank[k].length])));
  }, [bank, keys, titles]);

  const item = useCallback(
    (id: string): QuizItem | null => {
      const p = parseId(id);
      return (p && bank?.[p.key]?.[p.index]) || null;
    },
    [bank],
  );

  /** Save an answer straight away, from the freshest stored state, so a half-finished session still counts. */
  const answer = useCallback((id: string, correct: boolean) => {
    const now = dayKey(new Date());
    setToday(now);
    writeStore(KEYS.review, recordAnswer(sanitise(readStore(KEYS.review, null)), id, correct, now));
  }, []);

  const setHideStreak = useCallback((hide: boolean) => {
    writeStore(KEYS.review, { ...sanitise(readStore(KEYS.review, null)), hideStreak: hide });
  }, []);

  const clear = useCallback(() => writeStore(KEYS.review, EMPTY_REVIEW), []);

  return {
    /** False until the browser has been read; render nothing decisive before then. */
    ready: today !== null,
    today: today ?? '',
    state,
    /** Lessons that may contribute questions. */
    hasLessons: keys.length > 0,
    /** True once the question bank has loaded (or when there are no lessons, so nothing to load). */
    loaded: !wantBank || bank !== null,
    failed,
    pool,
    item,
    answer,
    setHideStreak,
    clear,
  };
}
