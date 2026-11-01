/**
 * Offline mode, the parts that run in the page: when to register the worker, when (if ever) to
 * mention installing the site, and how to list the pages kept on this device. Pure functions
 * take the clock and the context as arguments; the DOM wiring is in pwa-client.ts.
 */

/** Local, per-device state. Not part of the export file: it describes this browser, not the learner. */
export const PWA_KEY = 'layerwise:pwa';

export type PwaState = {
  /** The one-off "now works offline" note has been shown. */
  noted?: boolean;
  /** Days (YYYY-MM-DD, UTC) on which the learner opened the site, newest last, at most 10. */
  days?: string[];
  /** When the install hint was last shown, and when it was last dismissed (ms since 1970). */
  shownAt?: number;
  dismissedAt?: number;
  installed?: boolean;
};

const DAY = 24 * 60 * 60 * 1000;
/** After "Not now" the hint stays away for about six months; after merely showing, for three. */
export const HINT_DISMISSED_DAYS = 180;
export const HINT_SHOWN_DAYS = 90;
/** The hint waits until the learner has come back on this many different days. */
export const HINT_MIN_DAYS = 3;

export function shouldRegister(c: { prod: boolean; devOptIn: boolean; secure: boolean; supported: boolean }): boolean {
  if (!c.supported || !c.secure) return false;
  return c.prod || c.devOptIn;
}

export function dayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function recordVisit(state: PwaState, now: number): PwaState {
  const today = dayKey(now);
  const days = state.days ?? [];
  if (days[days.length - 1] === today) return state;
  return { ...state, days: [...days.filter((d) => d !== today), today].slice(-10) };
}

/**
 * Whether to offer the install hint. It is rare on purpose: only where the browser can install the
 * site (or on iPhone and iPad, where the steps are told), only after several visits, never while
 * installed, and not again for months after it was shown or dismissed.
 */
export function installHintDue(state: PwaState, now: number, ctx: { standalone: boolean; canPrompt: boolean; ios: boolean }): boolean {
  if (state.installed || ctx.standalone) return false;
  if (!ctx.canPrompt && !ctx.ios) return false;
  if ((state.days?.length ?? 0) < HINT_MIN_DAYS) return false;
  if (state.dismissedAt !== undefined && now - state.dismissedAt < HINT_DISMISSED_DAYS * DAY) return false;
  if (state.shownAt !== undefined && now - state.shownAt < HINT_SHOWN_DAYS * DAY) return false;
  return true;
}

/** Pages where an install hint is not an interruption: the front door, not a lesson being read. */
export function hintPage(pathname: string, base: string): boolean {
  const rel = pathname.startsWith(base) ? pathname.slice(base.length) : pathname.slice(1);
  return ['', 'start/', 'learn/', 'progress/'].includes(rel);
}

/** "learn/ai-basics/" becomes "Learn, ai basics": a fallback label when a stored page has no title. */
export function humanisePath(pathname: string, base: string): string {
  const rel = (pathname.startsWith(base) ? pathname.slice(base.length) : pathname.replace(/^\//, '')).replace(/\/$/, '');
  if (!rel) return 'Home';
  const parts = rel.split('/').map((p) => decodeURIComponent(p).replace(/[-_]+/g, ' '));
  const text = parts.join(', ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The page title from stored HTML, without the site name. */
export function titleFromHtml(html: string): string | null {
  const m = /<title>([\s\S]*?)<\/title>/i.exec(html);
  if (!m) return null;
  const t = m[1]
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(?:39|x27);/g, "'")
    .replace(/\s*\|\s*Layerwise\s*$/, '')
    .trim();
  return t || null;
}

/** Stored page URLs as paths, newest first, without the home page and the offline page. */
export function savedPagePaths(urls: string[], base: string): string[] {
  const skip = new Set([base, base + 'offline/']);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of [...urls].reverse()) {
    let p: string;
    try {
      p = new URL(u).pathname;
    } catch {
      p = u;
    }
    if (skip.has(p) || seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}
