import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { buildManifest, buildWorkerSource, stripExports } from './sw-build';
import { cacheNames } from './sw-logic.js';
import { latestRelease } from '../data/releases';

const logic = readFileSync(new URL('./sw-logic.js', import.meta.url), 'utf8');
const template = readFileSync(new URL('./sw-worker.js', import.meta.url), 'utf8');
const ORIGIN = 'https://awsmankit.github.io';
const BASE = '/layerwise/';

describe('manifest', () => {
  it('keeps scope, start_url, id and every icon under the base path', () => {
    const m = buildManifest('/layerwise');
    expect(m.scope).toBe('/layerwise/');
    expect(m.start_url).toBe('/layerwise/');
    expect(m.id).toBe('/layerwise/');
    for (const i of m.icons) expect(i.src.startsWith('/layerwise/icons/')).toBe(true);
    for (const s of m.shortcuts) expect(s.url.startsWith('/layerwise/')).toBe(true);
    expect(m.icons.some((i) => i.purpose === 'maskable' && i.sizes === '512x512')).toBe(true);
    expect(m.icons.some((i) => i.sizes === '192x192')).toBe(true);
  });
  it('works at the root', () => {
    const m = buildManifest('/');
    expect(m.scope).toBe('/');
    expect(m.icons[0].src).toBe('/icons/icon-192.png');
  });
});

describe('worker source', () => {
  it('strips export keywords and nothing else', () => {
    expect(stripExports('export const a = 1;\nexport function f() {}\nexport async function g() {}\nconst b = "export const";')).toBe('const a = 1;\nfunction f() {}\nasync function g() {}\nconst b = "export const";');
  });

  it('is plain script text with the version, base and dev flag filled in', () => {
    const src = buildWorkerSource({ version: latestRelease.version, base: '/layerwise', dev: false }, logic, template);
    expect(src).toContain(`const VERSION = "${latestRelease.version}";`);
    expect(src).toContain('const BASE = "/layerwise/";');
    expect(src).toContain('const DEV = false;');
    expect(src).not.toMatch(/^export\s/m);
    expect(src).not.toMatch(/^import\s/m);
    expect(src.indexOf('CACHING STRATEGY')).toBeGreaterThan(-1);
    expect(src.indexOf('CACHING STRATEGY')).toBeLessThan(src.indexOf('const VERSION'));
    expect(() => new vm.Script(src)).not.toThrow();
  });
});

/* ---- run the generated worker against a fake network and a fake cache storage ---- */

type Site = Record<string, { body: string; type?: string; status?: number }>;

function makeWorld(site: Site, opts: { dev?: boolean; version?: string } = {}) {
  const state = { online: true, fetched: [] as string[], slow: 0 };
  const store = new Map<string, Map<string, Response>>();
  const norm = (k: string | Request) => (typeof k === 'string' ? new URL(k, ORIGIN).href : k.url);
  const makeCache = (name: string) => {
    const m = store.get(name) ?? new Map<string, Response>();
    store.set(name, m);
    return {
      async match(k: string | Request, o: { ignoreSearch?: boolean } = {}) {
        const key = norm(k);
        const hit = m.get(key) ?? (o.ignoreSearch ? [...m].find(([u]) => u.split('?')[0] === key.split('?')[0])?.[1] : undefined);
        return hit?.clone();
      },
      async put(k: string | Request, r: Response) {
        const key = norm(k);
        m.delete(key);
        m.set(key, new Response(await r.clone().arrayBuffer(), { status: r.status, headers: r.headers }));
      },
      async keys() {
        return [...m.keys()].map((u) => new Request(u));
      },
      async delete(k: string | Request) {
        return m.delete(norm(k));
      },
    };
  };
  const caches = {
    open: async (n: string) => makeCache(n),
    keys: async () => [...store.keys()],
    delete: async (n: string) => store.delete(n),
  };
  const fetcher = async (input: string | Request) => {
    const url = norm(input);
    state.fetched.push(url);
    if (!state.online) throw new TypeError('Failed to fetch');
    if (state.slow) await new Promise((r) => setTimeout(r, state.slow));
    const path = new URL(url).pathname;
    const hit = site[path];
    if (!hit) return new Response('missing', { status: 404, headers: { 'Content-Type': 'text/html' } });
    return new Response(hit.body, { status: hit.status ?? 200, headers: { 'Content-Type': hit.type ?? 'text/html; charset=utf-8' } });
  };
  const listeners: Record<string, ((e: any) => void)[]> = {};
  const self: any = {
    location: { origin: ORIGIN },
    navigator: {},
    clients: { claim: async () => {} },
    skipWaiting: async () => {},
    addEventListener: (t: string, f: (e: any) => void) => (listeners[t] ??= []).push(f),
  };
  const src = buildWorkerSource({ version: opts.version ?? '9.9.9', base: BASE, dev: !!opts.dev }, logic, template);
  vm.runInNewContext(src, { self, caches, fetch: fetcher, Request, Response, URL, Promise, setTimeout, clearTimeout, console });

  const dispatch = async (type: string, init: Record<string, unknown> = {}) => {
    const waits: Promise<unknown>[] = [];
    let answer: Promise<Response> | undefined;
    const event = { ...init, respondWith: (p: Promise<Response>) => (answer = p), waitUntil: (p: Promise<unknown>) => waits.push(p) };
    (listeners[type] ?? []).forEach((f) => f(event));
    const t0 = Date.now();
    const response = answer ? await answer : undefined;
    const ms = Date.now() - t0;
    await Promise.all(waits);
    return { response, handled: !!answer, ms };
  };
  return { state, store, dispatch, listeners, caches };
}

// Request objects cannot have `mode` or `destination` set to arbitrary values in Node, so the
// fetch event gets a small stand-in that has what the worker reads.
function fetchEvent(path: string, o: { mode?: string; destination?: string; method?: string; range?: boolean } = {}) {
  const headers = new Headers(o.range ? { Range: 'bytes=0-1' } : {});
  const url = ORIGIN + path;
  const base = new Request(url);
  return { url, method: o.method ?? 'GET', mode: o.mode ?? 'cors', destination: o.destination ?? '', headers, clone: () => base, signal: base.signal } as unknown as Request;
}

const page = (title: string, extra = '') => `<!doctype html><html><head><title>${title}</title><link rel="stylesheet" href="${BASE}_astro/site.css">${extra}</head><body>${title}</body></html>`;
const SITE: Site = {
  [BASE]: { body: page('Home') },
  [BASE + 'start/']: { body: page('Start') },
  [BASE + 'learn/']: { body: page('Learn') },
  [BASE + 'offline/']: { body: page('Offline') },
  [BASE + 'learn/ai/a/']: { body: page('Lesson A', `<script type="module" src="${BASE}_astro/page.js"></script><astro-island component-url="${BASE}_astro/Demo.js" renderer-url="${BASE}_astro/client.js"></astro-island>`) },
  [BASE + '_astro/site.css']: { body: '@font-face{src:url(./bricolage-latin-wght.woff2)} @font-face{src:url(./bricolage-latin-ext-wght.woff2)}', type: 'text/css' },
  [BASE + '_astro/bricolage-latin-wght.woff2']: { body: 'font', type: 'font/woff2' },
  [BASE + '_astro/page.js']: { body: 'import "./shared.js";', type: 'text/javascript' },
  [BASE + '_astro/Demo.js']: { body: 'import{x}from"./shared.js";export default 1', type: 'text/javascript' },
  [BASE + '_astro/client.js']: { body: 'export default 2', type: 'text/javascript' },
  [BASE + '_astro/shared.js']: { body: 'export const x=1', type: 'text/javascript' },
  [BASE + 'search.json']: { body: '[{"t":"one"}]', type: 'application/json' },
};

async function run(world: ReturnType<typeof makeWorld>, path: string, o: Parameters<typeof fetchEvent>[1] = {}) {
  return world.dispatch('fetch', { request: fetchEvent(path, o) });
}

describe('the generated worker, against a fake network', () => {
  it('installs the shell pages and the assets they use, and activates by removing old caches', async () => {
    const w = makeWorld(SITE, { version: '9.9.9' });
    await w.caches.open(cacheNames('9.9.8').pages);
    await w.caches.open('someone-elses-cache');
    await w.dispatch('install');
    const pages = [...(w.store.get(cacheNames('9.9.9').pages)?.keys() ?? [])].map((u) => new URL(u).pathname);
    expect(pages.sort()).toEqual([BASE, BASE + 'learn/', BASE + 'offline/', BASE + 'start/'].sort());
    const assets = [...(w.store.get(cacheNames('9.9.9').assets)?.keys() ?? [])].map((u) => new URL(u).pathname);
    expect(assets).toContain(BASE + '_astro/site.css');
    expect(assets).toContain(BASE + '_astro/bricolage-latin-wght.woff2');
    expect(assets).not.toContain(BASE + '_astro/bricolage-latin-ext-wght.woff2');
    await w.dispatch('activate');
    expect([...w.store.keys()].sort()).toEqual([...Object.values(cacheNames('9.9.9')).filter((n) => w.store.has(n)), 'someone-elses-cache'].sort());
  });

  it('fails the install when the offline page cannot be fetched', async () => {
    const w = makeWorld({ ...SITE, [BASE + 'offline/']: { body: 'gone', status: 500 } });
    await expect(w.dispatch('install')).rejects.toThrow();
  });

  it('stores a visited page with its island scripts, and serves it when the network is down', async () => {
    const w = makeWorld(SITE);
    await w.dispatch('install');
    const online = await run(w, BASE + 'learn/ai/a/', { mode: 'navigate', destination: 'document' });
    expect(await online.response!.text()).toContain('Lesson A');
    const assets = [...(w.store.get(cacheNames('9.9.9').assets)?.keys() ?? [])].map((u) => new URL(u).pathname);
    for (const f of ['page.js', 'Demo.js', 'client.js', 'shared.js']) expect(assets).toContain(BASE + '_astro/' + f);
    w.state.online = false;
    const offline = await run(w, BASE + 'learn/ai/a/?x=1', { mode: 'navigate', destination: 'document' });
    expect(await offline.response!.text()).toContain('Lesson A');
    const script = await run(w, BASE + '_astro/Demo.js', { destination: 'script' });
    expect(await script.response!.text()).toContain('export default 1');
  });

  it('shows the offline page for a page that was never visited', async () => {
    const w = makeWorld(SITE);
    await w.dispatch('install');
    w.state.online = false;
    const r = await run(w, BASE + 'learn/never/seen/', { mode: 'navigate', destination: 'document' });
    expect(await r.response!.text()).toContain('Offline');
  });

  it('serves the stored page when the network is slower than the timeout, and refreshes it for next time', async () => {
    const w = makeWorld(SITE);
    await w.dispatch('install');
    SITE[BASE + 'start/'] = { body: page('Start v2') };
    w.state.slow = 4500;
    const r = await run(w, BASE + 'start/', { mode: 'navigate', destination: 'document' });
    expect(r.ms).toBeLessThan(4400);
    expect(r.ms).toBeGreaterThanOrEqual(3900);
    expect(await r.response!.text()).toContain('Start<');
    w.state.slow = 0;
    const again = await run(w, BASE + 'start/', { mode: 'navigate', destination: 'document' });
    expect(await again.response!.text()).toContain('Start v2');
    SITE[BASE + 'start/'] = { body: page('Start') };
  }, 15000);

  it('does not store a 404 page, other origins or POSTs', async () => {
    const w = makeWorld(SITE);
    await w.dispatch('install');
    await run(w, BASE + 'nope/', { mode: 'navigate', destination: 'document' });
    const keys = [...(w.store.get(cacheNames('9.9.9').pages)?.keys() ?? [])];
    expect(keys.some((u) => u.includes('/nope/'))).toBe(false);
    expect((await run(w, BASE + 'learn/', { mode: 'navigate', method: 'POST' })).handled).toBe(false);
    const cross = await w.dispatch('fetch', { request: { ...fetchEvent('/x'), url: 'https://cdn.jsdelivr.net/pyodide/pyodide.mjs' } });
    expect(cross.handled).toBe(false);
  });

  it('keeps one stored copy of the search index and serves it offline', async () => {
    const w = makeWorld(SITE);
    await w.dispatch('install');
    await run(w, BASE + 'search.json');
    await run(w, BASE + 'search.json?v=2');
    expect(w.store.get(cacheNames('9.9.9').data)?.size).toBe(1);
    w.state.online = false;
    const r = await run(w, BASE + 'search.json');
    expect(await r.response!.text()).toContain('"one"');
  });

  it('stops storing pages at the limit and keeps the install pages', async () => {
    const big: Site = { ...SITE };
    for (let i = 0; i < 90; i++) big[`${BASE}learn/p${i}/`] = { body: page('P' + i) };
    const w = makeWorld(big);
    await w.dispatch('install');
    for (let i = 0; i < 90; i++) await run(w, `${BASE}learn/p${i}/`, { mode: 'navigate', destination: 'document' });
    const keys = [...(w.store.get(cacheNames('9.9.9').pages)?.keys() ?? [])].map((u) => new URL(u).pathname);
    expect(keys.length).toBeLessThanOrEqual(80);
    expect(keys).toContain(BASE + 'offline/');
    expect(keys).toContain(BASE);
    expect(keys).toContain(`${BASE}learn/p89/`);
    expect(keys).not.toContain(`${BASE}learn/p0/`);
  }, 20000);

  it('in development the network wins, so a changed module is never stale', async () => {
    const site: Site = { ...SITE, [BASE + 'src/a.ts']: { body: 'v1', type: 'text/javascript' } };
    const w = makeWorld(site, { dev: true });
    const first = await run(w, BASE + 'src/a.ts', { destination: 'script' });
    expect(await first.response!.text()).toBe('v1');
    site[BASE + 'src/a.ts'] = { body: 'v2', type: 'text/javascript' };
    const second = await run(w, BASE + 'src/a.ts', { destination: 'script' });
    expect(await second.response!.text()).toBe('v2');
    w.state.online = false;
    const offline = await run(w, BASE + 'src/a.ts', { destination: 'script' });
    expect(await offline.response!.text()).toBe('v2');
  });
});
