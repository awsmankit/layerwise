import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useStore, KEYS, type GameScores, type GameRecord } from '../../lib/store';
import { withBase } from '../../lib/url';
import { EASE } from '../viz/shared';

export function useRecords() {
  const [records] = useStore<GameScores>(KEYS.games, {});
  return records;
}

export function useRecord(id: string): GameRecord | undefined {
  return useRecords()[id];
}

/** Level picker for a game. Shows the best result next to each level. */
export function LevelTabs({
  items,
  value,
  onChange,
  records,
  prefix,
}: {
  items: { id: string; title: string; level: number }[];
  value: string;
  onChange: (id: string) => void;
  records: GameScores;
  prefix: string;
}) {
  return (
    <div className="gm-levels" role="tablist" aria-label="Levels">
      {items.map((it) => {
        const rec = records[`${prefix}:${it.id}`];
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={it.id === value}
            className={`gm-level${it.id === value ? ' is-active' : ''}`}
            onClick={() => onChange(it.id)}
          >
            <span className="gm-level-n num">Level {it.level}</span>
            <span className="gm-level-t">{it.title}</span>
            {rec && (
              <span className="gm-level-best num">
                {rec.stars ? <Stars n={rec.stars} /> : `best ${rec.best}`}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Stars({ n, max = 3 }: { n: number; max?: number }) {
  return (
    <span className="gm-stars" role="img" aria-label={`${n} of ${max} stars`}>
      {Array.from({ length: max }).map((_, i) => (
        <svg key={i} viewBox="0 0 20 20" width="14" height="14" className={i < n ? 'on' : ''} aria-hidden="true">
          <path d="M10 1.8l2.5 5.4 5.9.7-4.4 4 1.2 5.8L10 14.8l-5.2 2.9 1.2-5.8-4.4-4 5.9-.7z" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
}

/** A value against a limit. mode "max": stay under it. mode "min": stay above it. */
export function Meter({
  label,
  value,
  limit,
  mode,
  display,
  limitDisplay,
  scaleMax,
}: {
  label: string;
  value: number;
  limit: number;
  mode: 'max' | 'min';
  display: string;
  limitDisplay: string;
  scaleMax?: number;
}) {
  const ok = mode === 'max' ? value <= limit : value >= limit;
  const scale = scaleMax ?? Math.max(value, limit) * 1.15;
  const pct = (v: number) => Math.max(0, Math.min(100, (v / scale) * 100));
  return (
    <div className={`gm-meter ${ok ? 'ok' : 'bad'}`}>
      <div className="gm-meter-head">
        <span>{label}</span>
        <b className="num">{display}</b>
      </div>
      <div className="gm-meter-track">
        <motion.span
          className="gm-meter-fill"
          initial={false}
          animate={{ width: `${pct(value)}%` }}
          transition={{ duration: 0.35, ease: EASE }}
        />
        <span className="gm-meter-tick" style={{ left: `${pct(limit)}%` }} aria-hidden="true" />
      </div>
      <div className="gm-meter-foot num">
        {mode === 'max' ? 'limit' : 'needs'} {limitDisplay}
      </div>
    </div>
  );
}

export type DockItem = { label: string; value: string; target: string; ok: boolean };

/**
 * Phones only: a slim bar stuck to the bottom of the screen while the choices scroll past,
 * with the numbers that decide the level, so each tap shows its effect without scrolling
 * down to the full panel. A missed target is shown next to its number; a met one gets a tick.
 * It sits at the end of the choices, so it settles in place just
 * above that panel. Hidden from screen readers: the panel says the same thing.
 */
export function GameDock({ items }: { items: DockItem[] }) {
  return (
    <div className="gm-dock" aria-hidden="true">
      {items.map((it) => (
        <span key={it.label} className={`gm-dock-i ${it.ok ? 'ok' : 'bad'}`}>
          <i>{it.ok ? '✓' : '✕'}</i>
          {it.label}{' '}
          <b key={it.value} className="num">
            {it.value}
          </b>
          <small className="num">{it.target}</small>
        </span>
      ))}
    </div>
  );
}

export function LessonLinks({ links, title = 'Go deeper' }: { links: { label: string; href: string }[]; title?: string }) {
  if (links.length === 0) return null;
  const seen = new Set<string>();
  const unique = links.filter((l) => (seen.has(l.href) ? false : (seen.add(l.href), true)));
  return (
    <p className="gm-lessons">
      <b>{title}:</b>{' '}
      {unique.map((l) => (
        <a key={l.href} href={withBase(l.href)}>
          {l.label}
        </a>
      ))}
    </p>
  );
}

export function Check({ pass }: { pass: boolean }) {
  return (
    <svg className={`gm-check ${pass ? 'ok' : 'bad'}`} viewBox="0 0 20 20" width="18" height="18" fill="none" strokeWidth="1.6" strokeLinecap="round" aria-label={pass ? 'Met' : 'Not met'} role="img">
      <circle cx="10" cy="10" r="8.5" />
      {pass ? (
        <motion.path d="M6 10.4l2.6 2.6 5-5.4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, ease: EASE }} />
      ) : (
        <>
          <motion.path d="M7 7l6 6" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.25 }} />
          <motion.path d="M13 7l-6 6" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.25, delay: 0.1 }} />
        </>
      )}
    </svg>
  );
}

/** Scrolls an element into view when it first appears, so results are never off-screen. */
export function useScrollIntoView<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!active) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const id = requestAnimationFrame(() =>
      ref.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }),
    );
    return () => cancelAnimationFrame(id);
  }, [active]);
  return ref;
}
