import { MotionConfig } from 'motion/react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { stampCompletions } from '../../lib/certificate';

/** Every island is wrapped in this so reduced-motion preferences are honoured. */
export function Root({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

export const EASE = [0.22, 1, 0.36, 1] as const;

/** True on phone-sized screens, so a figure can swap to a stacked layout. False on the server. */
export function useNarrow(query = '(max-width: 560px)') {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setNarrow(m.matches);
    on();
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return narrow;
}

export const fmt = {
  usd(n: number): string {
    if (!isFinite(n)) return '-';
    if (n >= 100) return '$' + Math.round(n).toLocaleString('en-US');
    if (n >= 1) return '$' + n.toFixed(2);
    if (n >= 0.01) return '$' + n.toFixed(3);
    return '$' + n.toFixed(4);
  },
  int(n: number): string {
    return Math.round(n).toLocaleString('en-US');
  },
  gb(n: number): string {
    if (n >= 100) return Math.round(n) + ' GB';
    if (n >= 10) return n.toFixed(1) + ' GB';
    return n.toFixed(2) + ' GB';
  },
  ms(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(2) + ' s';
    return Math.round(n) + ' ms';
  },
};

/* ---------- lesson completion, stored in the browser only ---------- */

const KEY = 'layerwise:done';
const EVENT = 'layerwise:done-change';

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Add a lesson to the done list without toggling it off. Used when a quiz is passed. */
export function markDone(id: string) {
  const current = read();
  if (current.includes(id)) return;
  try {
    localStorage.setItem(KEY, JSON.stringify([...current, id]));
  } catch {
    /* storage can be blocked; the UI simply will not persist */
  }
  stampCompletions([...current, id]); // dates a path certificate on the day the path is finished
  window.dispatchEvent(new Event(EVENT));
}

export function useDone() {
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setDone(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const current = read();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage can be blocked; the UI simply will not persist */
    }
    stampCompletions(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { done, toggle };
}
