// @ts-nocheck
/*
 * Layerwise service worker. The site works offline for what a learner has already opened.
 * This file is a template: src/lib/sw-build.ts puts the release version, the base path and the
 * dev flag in front of it, followed by src/lib/sw-logic.js (the tested pure functions).
 *
 * CACHING STRATEGY
 *   Pages (navigations)   network first, with a 4 second timeout. If the network is slow or down, the
 *                         stored copy is used. A page never seen before and unreachable gets the offline
 *                         page. Only plain 200 HTML from this origin is stored, under its path alone.
 *   Hashed assets         stale while revalidate: scripts, styles, fonts and images are served from the
 *                         stored copy at once and refreshed in the background. Scripts load on demand, so
 *                         whatever a page fetches is stored as it is fetched, and when a page is stored the
 *                         island scripts it names (and what they import) are fetched too, so a visited
 *                         lesson works offline even for parts the learner never scrolled to.
 *   Data                  /search.json and /rss.xml: network first with a timeout, one stored copy each,
 *                         used when the network is down.
 *   Never stored          other origins (the Python runtime comes from a CDN and is left to the browser),
 *                         anything that is not GET, range requests, this worker and the manifest.
 *   Install               stores the home page, /start/, /learn/ and the offline page (the offline page
 *                         and the home page must succeed), then the styles, scripts and Latin fonts they use.
 *   Versioning            cache names include the site release, so each release deletes the caches of the
 *                         last one when it activates.
 *   Limits                a maximum number of entries per cache (oldest stored goes first; the four install
 *                         pages stay), and if the origin uses more than 150 MB a quarter of each cache goes.
 *                         Nothing is prefetched when the browser asks to save data.
 *   Dev (DEV is true)     every same-origin request is network first, so hot reload is never stale.
 */
// ---- code ----
const NAMES = cacheNames(VERSION);
const ORIGIN = self.location.origin;
const SHELL = shellPages(BASE);
const OFFLINE_PATH = BASE + 'offline/';
const LIMITS = { pages: 80, assets: 400, data: 6 };
// in development a slow first compile must not be mistaken for a dead network
const TIMEOUT_MS = DEV ? 60000 : 4000;
const BUDGET_BYTES = 150 * 1024 * 1024;
const PREFETCH_MAX = 40;
const PREFETCH_DEPTH = 3;

const describe = (res) => ({ status: res.status, type: res.type, redirected: res.redirected, contentType: res.headers.get('content-type') || '' });
const shellPaths = SHELL.map((p) => p);

function timeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

async function safePut(cache, key, res) {
  try {
    await cache.put(key, res);
    return true;
  } catch {
    return false; // quota or an aborted body: the page still works, it just is not kept
  }
}

async function trim(name, max) {
  const cache = await caches.open(name);
  const keys = (await cache.keys()).map((r) => r.url);
  const gone = evictionList(keys, max, name === NAMES.pages ? shellPaths : []);
  await Promise.all(gone.map((k) => cache.delete(k)));
}

async function enforceBudget() {
  try {
    const est = await self.navigator.storage?.estimate?.();
    if (!est || typeof est.usage !== 'number') return;
    for (const name of [NAMES.pages, NAMES.assets]) {
      const cache = await caches.open(name);
      const count = (await cache.keys()).length;
      const drop = budgetTrimCount(est.usage, BUDGET_BYTES, count);
      if (drop > 0) await trim(name, count - drop);
    }
  } catch {
    /* an estimate is a nicety */
  }
}

/* ---------- assets ---------- */

async function hasAsset(cache, url) {
  return !!(await cache.match(url, { ignoreVary: true }));
}

/**
 * Fetch and store scripts and styles, then follow what they import (scripts) or name (Latin fonts in
 * styles), a few levels deep. Failures are ignored: this is an extra, not a requirement.
 */
async function storeAssetTree(urls, depth, budget) {
  const cache = await caches.open(NAMES.assets);
  let next = [];
  const batch = urls.filter((u) => u.startsWith(ORIGIN + BASE));
  for (let i = 0; i < batch.length && budget.left > 0; i += 4) {
    await Promise.all(
      batch.slice(i, i + 4).map(async (url) => {
        if (budget.left <= 0 || (await hasAsset(cache, url))) return;
        budget.left -= 1;
        try {
          const res = await fetch(url);
          if (!isCacheableResponse(describe(res), 'asset')) return;
          const copy = res.clone();
          await safePut(cache, url, res);
          if (isScriptUrl(url)) next.push(...extractImportUrls(await copy.text(), url));
          else if (isStyleUrl(url)) next.push(...extractFontUrls(await copy.text(), url));
        } catch {
          /* offline or blocked */
        }
      }),
    );
  }
  next = [...new Set(next)];
  if (next.length && depth < PREFETCH_DEPTH && budget.left > 0) await storeAssetTree(next, depth + 1, budget);
}

async function prefetchFromPage(html, pageUrl) {
  if (self.navigator.connection && self.navigator.connection.saveData) return;
  await storeAssetTree(extractAssetUrls(html, pageUrl), 0, { left: PREFETCH_MAX });
  await trim(NAMES.assets, LIMITS.assets);
  await enforceBudget();
}

/* ---------- install and activate ---------- */

async function precache() {
  const pages = await caches.open(NAMES.pages);
  const assets = new Set();
  const required = [BASE, OFFLINE_PATH];
  const results = await Promise.allSettled(
    SHELL.map(async (path) => {
      const url = ORIGIN + path;
      const res = await fetch(new Request(url, { cache: 'reload' }));
      if (!isCacheableResponse(describe(res), 'page')) throw new Error('not storable: ' + path);
      const copy = res.clone();
      await pages.put(pathKey(url), res);
      for (const a of extractAssetUrls(await copy.text(), url)) assets.add(a);
    }),
  );
  results.forEach((r, i) => {
    if (r.status === 'rejected' && required.includes(SHELL[i])) throw r.reason; // install fails, and is tried again later
  });
  await storeAssetTree([...assets], 0, { left: 120 });
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(staleCacheNames(names, VERSION).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  // the offline page asks for this after a learner clears the saved pages
  if (event.data && event.data.type === 'precache') event.waitUntil(precache().catch(() => {}));
});

/* ---------- fetch ---------- */

async function offlinePage() {
  const cache = await caches.open(NAMES.pages);
  const stored = await cache.match(pathKey(ORIGIN + OFFLINE_PATH), { ignoreVary: true });
  return stored || new Response('You are offline, and this page was not saved on this device.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

async function pageResponse(event) {
  const req = event.request;
  const key = pathKey(req.url);
  const cache = await caches.open(NAMES.pages);
  let work = Promise.resolve();
  const network = fetch(req).then((res) => {
    if (isCacheableResponse(describe(res), 'page')) {
      const forCache = res.clone();
      const forText = res.clone();
      work = (async () => {
        if (await safePut(cache, key, forCache)) {
          await trim(NAMES.pages, LIMITS.pages);
          await prefetchFromPage(await forText.text(), req.url);
        }
      })().catch(() => {});
    }
    return res;
  });
  event.waitUntil(network.then(() => work, () => {}));
  const stored = await cache.match(key, { ignoreVary: true });
  if (!stored) {
    try {
      return await network;
    } catch {
      return offlinePage();
    }
  }
  try {
    const res = await timeout(network, TIMEOUT_MS);
    return !DEV && res.status >= 500 ? stored : res;
  } catch {
    return stored;
  }
}

async function dataResponse(event) {
  const req = event.request;
  const key = pathKey(req.url);
  const cache = await caches.open(NAMES.data);
  let work = Promise.resolve();
  const network = fetch(req).then((res) => {
    if (isCacheableResponse(describe(res), 'data')) {
      work = safePut(cache, key, res.clone()).then(() => trim(NAMES.data, LIMITS.data)).catch(() => {});
    }
    return res;
  });
  event.waitUntil(network.then(() => work, () => {}));
  const stored = await cache.match(key, { ignoreVary: true });
  if (!stored) return network;
  try {
    const res = await timeout(network, TIMEOUT_MS);
    return !DEV && res.status >= 500 ? stored : res;
  } catch {
    return stored;
  }
}

async function assetResponse(event) {
  const req = event.request;
  const cache = await caches.open(NAMES.assets);
  const stored = await cache.match(req, { ignoreVary: true });
  let work = Promise.resolve();
  const network = fetch(req).then((res) => {
    if (isCacheableResponse(describe(res), 'asset')) {
      work = safePut(cache, req.url, res.clone()).then(() => trim(NAMES.assets, LIMITS.assets)).catch(() => {});
    }
    return res;
  });
  event.waitUntil(network.then(() => work, () => {}));
  return stored || network;
}

/** Development: the network wins, so edits show at once; the stored copy only fills in when it is down. */
async function devResponse(event) {
  const req = event.request;
  const cache = await caches.open(NAMES.assets);
  try {
    const res = await fetch(req);
    if (isCacheableResponse(describe(res), 'asset')) {
      const copy = res.clone();
      event.waitUntil(safePut(cache, req.url, copy).then(() => trim(NAMES.assets, LIMITS.assets)));
    }
    return res;
  } catch (err) {
    const stored = (await cache.match(req, { ignoreVary: true })) || (await cache.match(req, { ignoreVary: true, ignoreSearch: true }));
    if (stored) return stored;
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const kind = classify({ url: req.url, origin: ORIGIN, base: BASE, method: req.method, mode: req.mode, destination: req.destination, hasRange: req.headers.has('range'), dev: DEV });
  if (kind === 'skip') return;
  const handler = { page: pageResponse, data: dataResponse, asset: assetResponse, dev: devResponse }[kind];
  event.respondWith(handler(event));
});
