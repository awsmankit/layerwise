import { useCallback, useEffect, useState } from 'react';

/**
 * Tiny localStorage-backed store. Every value is JSON, every write notifies
 * other hooks on the page (and other tabs via the storage event), and reads
 * never throw, so private-browsing or blocked storage just means "no memory".
 */

const EVENT = 'layerwise:store';

export function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeStore<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: the UI keeps working, it just will not persist */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
}

export function useStore<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    const sync = () => setValue(readStore(key, fallback));
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
    // fallback is intentionally not a dependency: callers pass literals
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = readStore(key, fallback);
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      writeStore(key, resolved);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  return [value, set] as const;
}

/* ---------- named keys ---------- */

export const KEYS = {
  done: 'layerwise:done',
  games: 'layerwise:games',
  path: 'layerwise:path',
  last: 'layerwise:last',
  depth: 'layerwise:depth',
  theme: 'layerwise:theme',
  quiz: 'layerwise:quiz',
  labs: 'layerwise:labs',
} as const;

export type GameRecord = { best: number; plays: number; stars?: number };
export type GameScores = Record<string, GameRecord>;

export function recordGame(id: string, score: number, stars?: number) {
  const all = readStore<GameScores>(KEYS.games, {});
  const prev = all[id];
  writeStore(KEYS.games, {
    ...all,
    [id]: {
      best: Math.max(prev?.best ?? 0, score),
      plays: (prev?.plays ?? 0) + 1,
      stars: Math.max(prev?.stars ?? 0, stars ?? 0) || undefined,
    },
  });
}
