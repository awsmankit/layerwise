// Not type-checked: this file is pasted as text into the worker (see sw-build.ts), so it stays plain JavaScript.
/**
 * Pure logic for the service worker (src/pages/sw.js.ts builds the worker from this file and
 * src/lib/sw-worker.js, so there is one copy and the tests exercise the code that ships).
 *
 * Plain JavaScript on purpose: the worker source is assembled at build time from the raw text of
 * this file, which cannot be done with TypeScript without a compile step. Keep it free of imports,
 * and write every exported binding as `export const` or `export function` at the start of a line
 * (the builder strips the `export` keyword and pastes the rest into the worker).
 */

export const CACHE_PREFIX = 'layerwise-';

/** Make a base path look like "/" or "/layerwise/". */
export function normaliseBase(base) {
  let b = base || '/';
  if (!b.startsWith('/')) b = '/' + b;
  if (!b.endsWith('/')) b += '/';
  return b;
}

/** Cache names carry the site release, so every release can drop the caches of the one before. */
export function cacheNames(version) {
  const v = `${CACHE_PREFIX}v${version}`;
  return { pages: `${v}-pages`, assets: `${v}-assets`, data: `${v}-data` };
}

/** Caches made by this site for another release. Anything that is not ours is left alone. */
export function staleCacheNames(all, version) {
  const keep = Object.values(cacheNames(version));
  return all.filter((n) => n.startsWith(CACHE_PREFIX) && !keep.includes(n));
}

/** The pages stored at install, the first one being the home page. */
export function shellPages(base) {
  return [base, base + 'start/', base + 'learn/', base + 'offline/'];
}

/** Generated data files: always tried on the network first, one stored copy each. */
export const DATA_FILES = ['search.json', 'rss.xml'];

/**
 * Decide what the worker does with a request.
 *   'skip'  leave it to the browser (cross-origin, not GET, ranges, the worker and manifest themselves)
 *   'page'  a navigation: network first with a timeout, stored copy as fallback, offline page last
 *   'data'  search index and feed: network first with a timeout, last stored copy as fallback
 *   'asset' hashed scripts, styles, fonts and images: stale while revalidate
 *   'dev'   development server modules: network first (so hot reload stays fresh), stored copy as fallback
 * @param {{url: string, origin: string, base: string, method: string, mode?: string, destination?: string, hasRange?: boolean, dev?: boolean}} r
 */
export function classify(r) {
  if (r.method !== 'GET' || r.hasRange) return 'skip';
  let u;
  try {
    u = new URL(r.url);
  } catch {
    return 'skip';
  }
  if (u.origin !== r.origin) return 'skip';
  if (!u.pathname.startsWith(r.base)) return 'skip';
  const rel = u.pathname.slice(r.base.length);
  if (rel === 'sw.js' || rel === 'manifest.webmanifest') return 'skip';
  if (DATA_FILES.includes(rel)) return 'data';
  if (r.mode === 'navigate' || r.destination === 'document') return 'page';
  if (r.dev) return 'dev';
  if (rel.startsWith('_astro/')) return 'asset';
  if (/\.(?:m?js|css|woff2?|ttf|otf|png|jpe?g|gif|webp|avif|svg|ico)$/i.test(rel)) return 'asset';
  return 'skip';
}

/** A response is stored only when it is a plain 200 from our own origin, and for pages only when it is HTML. */
export function isCacheableResponse(r, kind) {
  if (r.status !== 200) return false;
  if (r.type !== 'basic' && r.type !== 'default') return false;
  if (r.redirected) return false;
  if (kind === 'page') return /text\/html/i.test(r.contentType || '');
  return true;
}

/** Pages and data are stored under their path alone, so ?query and #hash variants share one copy. */
export function pathKey(url) {
  const u = new URL(url);
  return u.origin + u.pathname;
}

/**
 * Which entries to delete so that at most `max` remain. `keys` run oldest first (the order
 * Cache.keys() returns); entries whose path is listed in `keep` are never chosen.
 */
export function evictionList(keys, max, keep = []) {
  let excess = keys.length - max;
  /** @type {string[]} */
  const out = [];
  if (excess <= 0) return out;
  const keepSet = new Set(keep);
  for (const k of keys) {
    if (excess <= 0) break;
    let p = k;
    try {
      p = new URL(k).pathname;
    } catch {
      /* a bare path: compare as it is */
    }
    if (keepSet.has(p)) continue;
    out.push(k);
    excess -= 1;
  }
  return out;
}

/** When the origin uses more than the budget, drop a quarter of what a cache holds. */
export function budgetTrimCount(usage, budget, count) {
  if (!(usage > budget) || count <= 0) return 0;
  return Math.max(1, Math.ceil(count * 0.25));
}

/* ---------- reading URLs out of pages, styles and scripts ---------- */

function decodeAmp(s) {
  return s.replace(/&amp;/g, '&');
}

/** Value of an attribute inside one start tag, or null. */
function attr(tag, name) {
  const m = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i').exec(tag);
  if (!m) return null;
  return decodeAmp(m[1] ?? m[2] ?? m[3] ?? '');
}

/** Same-origin absolute URL without a #hash, or null. */
export function sameOriginUrl(href, from) {
  if (!href) return null;
  try {
    const f = new URL(from);
    const u = new URL(href, f);
    if (u.origin !== f.origin) return null;
    return u.origin + u.pathname + u.search;
  } catch {
    return null;
  }
}

const TAG = /<(?:link|script|astro-island)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;

/**
 * Styles, scripts, module preloads and island entry points a page refers to, as absolute
 * same-origin URLs. Islands load their code late (client:visible, client:idle), so listing
 * them lets the worker keep a visited page usable offline even if the learner never scrolled.
 */
export function extractAssetUrls(html, pageUrl) {
  const out = new Set();
  const add = (href) => {
    const u = sameOriginUrl(href, pageUrl);
    if (u) out.add(u);
  };
  for (const m of html.matchAll(TAG)) {
    const tag = m[0];
    const name = /^<([a-z-]+)/i.exec(tag)?.[1].toLowerCase();
    if (name === 'link') {
      const rel = (attr(tag, 'rel') || '').toLowerCase().split(/\s+/);
      if (rel.includes('stylesheet') || rel.includes('modulepreload')) add(attr(tag, 'href'));
    } else if (name === 'script') {
      add(attr(tag, 'src'));
    } else if (name === 'astro-island') {
      add(attr(tag, 'component-url'));
      add(attr(tag, 'renderer-url'));
    }
  }
  return [...out];
}

/** The Latin font files a stylesheet names (other scripts load only when a page needs them). */
export function extractFontUrls(css, cssUrl) {
  const out = new Set();
  for (const m of css.matchAll(/url\(\s*["']?([^)"']+?\.woff2(?:\?[^)"']*)?)["']?\s*\)/gi)) {
    if (!/-latin-(?!ext)/.test(m[1])) continue;
    const u = sameOriginUrl(m[1], cssUrl);
    if (u) out.add(u);
  }
  return [...out];
}

/** Scripts a script imports by a path (static or dynamic), as absolute same-origin URLs. */
export function extractImportUrls(js, fileUrl) {
  const out = new Set();
  const re = /(?:\bfrom\s*|\bimport\s*\(?\s*)["']((?:\.{1,2}\/|\/)[^"']+?\.(?:m?js|jsx|tsx?|css))(?:\?[^"']*)?["']/g;
  for (const m of js.matchAll(re)) {
    const u = sameOriginUrl(m[1], fileUrl);
    if (u) out.add(u);
  }
  return [...out];
}

/** Whether a URL names a script (so its own imports are worth following). */
export function isScriptUrl(url) {
  try {
    return /\.(?:m?js|jsx|tsx?)$/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

export function isStyleUrl(url) {
  try {
    return /\.css$/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}
