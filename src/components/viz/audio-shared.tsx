import { useEffect, useRef, useState, type RefObject } from 'react';

/** Bumps a counter whenever the site theme (html[data-theme]) changes, so canvases can redraw in the new colours. */
export function useThemeTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const obs = new MutationObserver(() => setTick((t) => t + 1));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => setTick((t) => t + 1);
    mq.addEventListener('change', on);
    return () => {
      obs.disconnect();
      mq.removeEventListener('change', on);
    };
  }, []);
  return tick;
}

/** Colours read from the site's CSS variables, so canvas drawings follow light and dark mode. */
export type Palette = { ink: string; ink2: string; ink3: string; line: string; signal: string; ok: string; warn: string; surface: string };

export function readPalette(): Palette {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string, d: string) => cs.getPropertyValue(n).trim() || d;
  return {
    ink: v('--ink', '#15123d'),
    ink2: v('--ink-2', '#403c6b'),
    ink3: v('--ink-3', '#66628d'),
    line: v('--line', 'rgba(21,18,61,0.3)'),
    signal: v('--signal', '#5b3dff'),
    ok: v('--ok', '#08775a'),
    warn: v('--warn', '#d0321d'),
    surface: v('--surface', '#ffffff'),
  };
}

/** The pixel width of an element, kept up to date. 0 until measured. */
export function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setW(Math.round(el.getBoundingClientRect().width));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

/** Calls `onLeave` when the element scrolls out of view, and `onHide` when the tab is hidden. Used to stop sound and animation. */
export function useStopWhenAway(ref: RefObject<HTMLElement | null>, onLeave: () => void) {
  const cb = useRef(onLeave);
  cb.current = onLeave;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) cb.current();
    });
    io.observe(el);
    const hidden = () => {
      if (document.hidden) cb.current();
    };
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', hidden);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('pagehide', hidden);
    };
  }, [ref]);
}

/** Size a canvas to its CSS box at the device pixel ratio (capped at 2) and return a 2D context scaled to CSS pixels. */
export function prepareCanvas(canvas: HTMLCanvasElement, cssW: number, cssH: number): CanvasRenderingContext2D | null {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(cssW * dpr));
  const h = Math.max(1, Math.round(cssH * dpr));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}
