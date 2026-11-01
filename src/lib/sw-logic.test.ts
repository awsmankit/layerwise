import { describe, expect, it } from 'vitest';
import {
  budgetTrimCount,
  cacheNames,
  classify,
  evictionList,
  extractAssetUrls,
  extractFontUrls,
  extractImportUrls,
  isCacheableResponse,
  normaliseBase,
  pathKey,
  shellPages,
  staleCacheNames,
} from './sw-logic.js';

const ORIGIN = 'https://awsmankit.github.io';
const req = (path: string, extra: Record<string, unknown> = {}) => ({ url: ORIGIN + path, origin: ORIGIN, base: '/layerwise/', method: 'GET', ...extra });

describe('base path', () => {
  it('always starts and ends with a slash', () => {
    expect(normaliseBase('/layerwise')).toBe('/layerwise/');
    expect(normaliseBase('/layerwise/')).toBe('/layerwise/');
    expect(normaliseBase('layerwise')).toBe('/layerwise/');
    expect(normaliseBase('/')).toBe('/');
    expect(normaliseBase('')).toBe('/');
  });

  it('puts the install pages under the base', () => {
    expect(shellPages('/layerwise/')).toEqual(['/layerwise/', '/layerwise/start/', '/layerwise/learn/', '/layerwise/offline/']);
    expect(shellPages('/')[3]).toBe('/offline/');
  });
});

describe('cache names', () => {
  it('include the release, so a new release gets new caches', () => {
    expect(cacheNames('2.2.0').pages).toBe('layerwise-v2.2.0-pages');
    expect(cacheNames('2.2.0').pages).not.toBe(cacheNames('2.3.0').pages);
  });

  it('removes the caches of other releases and nothing that is not ours', () => {
    const all = [...Object.values(cacheNames('2.1.0')), ...Object.values(cacheNames('2.2.0')), 'other-app-v1', 'workbox-precache'];
    expect(staleCacheNames(all, '2.2.0').sort()).toEqual(Object.values(cacheNames('2.1.0')).sort());
    expect(staleCacheNames(Object.values(cacheNames('2.2.0')), '2.2.0')).toEqual([]);
  });
});

describe('classify', () => {
  it('serves navigations as pages', () => {
    expect(classify(req('/layerwise/learn/', { mode: 'navigate' }))).toBe('page');
    expect(classify(req('/layerwise/learn/ai-basics/', { destination: 'document' }))).toBe('page');
  });

  it('serves hashed assets and fonts stale while revalidate', () => {
    expect(classify(req('/layerwise/_astro/index.AbC123.js', { destination: 'script' }))).toBe('asset');
    expect(classify(req('/layerwise/_astro/bricolage-grotesque-latin-wght-normal.xyz.woff2', { destination: 'font' }))).toBe('asset');
    expect(classify(req('/layerwise/favicon.svg'))).toBe('asset');
    expect(classify(req('/layerwise/icons/icon-192.png'))).toBe('asset');
  });

  it('treats the search index and the feed as data', () => {
    expect(classify(req('/layerwise/search.json'))).toBe('data');
    expect(classify(req('/layerwise/search.json?v=2'))).toBe('data');
    expect(classify(req('/layerwise/rss.xml', { mode: 'navigate' }))).toBe('data');
  });

  it('leaves everything else to the browser', () => {
    expect(classify(req('/layerwise/learn/', { mode: 'navigate', method: 'POST' }))).toBe('skip');
    expect(classify({ ...req('/x'), url: 'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.mjs' })).toBe('skip');
    expect(classify(req('/layerwise/_astro/clip.mp4', { hasRange: true }))).toBe('skip');
    expect(classify(req('/layerwise/sw.js'))).toBe('skip');
    expect(classify(req('/layerwise/manifest.webmanifest'))).toBe('skip');
    expect(classify(req('/elsewhere/page/', { mode: 'navigate' }))).toBe('skip');
    expect(classify(req('/layerwise/some/data.bin'))).toBe('skip');
    expect(classify({ ...req('/x'), url: 'not a url' })).toBe('skip');
  });

  it('works at the root of a site', () => {
    expect(classify({ url: ORIGIN + '/_astro/a.js', origin: ORIGIN, base: '/', method: 'GET' })).toBe('asset');
    expect(classify({ url: ORIGIN + '/learn/', origin: ORIGIN, base: '/', method: 'GET', mode: 'navigate' })).toBe('page');
  });

  it('in development puts module requests on the network-first path, but still skips other origins', () => {
    expect(classify({ url: ORIGIN + '/src/components/ui/X.tsx', origin: ORIGIN, base: '/', method: 'GET', dev: true })).toBe('dev');
    expect(classify({ url: ORIGIN + '/@vite/client', origin: ORIGIN, base: '/', method: 'GET', dev: true })).toBe('dev');
    expect(classify({ url: 'https://cdn.example/x.js', origin: ORIGIN, base: '/', method: 'GET', dev: true })).toBe('skip');
  });
});

describe('what is stored', () => {
  const ok = { status: 200, type: 'basic', redirected: false, contentType: 'text/html; charset=utf-8' };
  it('stores plain same-origin 200 responses', () => {
    expect(isCacheableResponse(ok, 'page')).toBe(true);
    expect(isCacheableResponse({ ...ok, contentType: 'text/javascript' }, 'asset')).toBe(true);
  });
  it('refuses errors, redirects, opaque and cross-origin responses', () => {
    expect(isCacheableResponse({ ...ok, status: 404 }, 'page')).toBe(false);
    expect(isCacheableResponse({ ...ok, status: 0, type: 'opaqueredirect' }, 'page')).toBe(false);
    expect(isCacheableResponse({ ...ok, redirected: true }, 'page')).toBe(false);
    expect(isCacheableResponse({ ...ok, type: 'cors' }, 'asset')).toBe(false);
    expect(isCacheableResponse({ ...ok, type: 'opaque', status: 0 }, 'asset')).toBe(false);
  });
  it('stores a page only when it is HTML', () => {
    expect(isCacheableResponse({ ...ok, contentType: 'application/pdf' }, 'page')).toBe(false);
  });
  it('keys pages and data by path alone', () => {
    expect(pathKey('https://a.test/layerwise/learn/?q=1#top')).toBe('https://a.test/layerwise/learn/');
  });
});

describe('eviction', () => {
  const keys = ['a', 'b', 'c', 'd', 'e'].map((k) => `https://a.test/layerwise/${k}/`);
  it('drops the oldest entries over the limit', () => {
    expect(evictionList(keys, 3)).toEqual([keys[0], keys[1]]);
    expect(evictionList(keys, 5)).toEqual([]);
    expect(evictionList(keys, 9)).toEqual([]);
    expect(evictionList(keys, 0)).toEqual(keys);
  });
  it('never picks a protected path', () => {
    expect(evictionList(keys, 3, ['/layerwise/a/'])).toEqual([keys[1], keys[2]]);
  });
  it('trims a quarter when over the byte budget', () => {
    expect(budgetTrimCount(10, 100, 40)).toBe(0);
    expect(budgetTrimCount(200, 100, 40)).toBe(10);
    expect(budgetTrimCount(200, 100, 1)).toBe(1);
    expect(budgetTrimCount(200, 100, 0)).toBe(0);
  });
});

describe('finding what a page needs', () => {
  const page = 'https://a.test/layerwise/learn/x/';
  const html = `<!doctype html><html><head>
    <link rel="stylesheet" href="/layerwise/_astro/index.abc.css">
    <link rel="icon" href="/layerwise/favicon.svg">
    <link rel='modulepreload' href='/layerwise/_astro/chunk.js?x=1&amp;y=2'>
    <link rel="stylesheet" href="https://fonts.example/other.css">
    <script type="module" src="/layerwise/_astro/page.def.js"></script>
    </head><body>
    <astro-island uid="1" component-url="/layerwise/_astro/Quiz.ghi.js" component-export="default" renderer-url="/layerwise/_astro/client.jkl.js" props="{&quot;a&quot;:[0,&quot;x&gt;y&quot;]}" ssr client="visible" opts="{}"></astro-island>
    <astro-island component-url="/layerwise/_astro/Quiz.ghi.js" renderer-url="/layerwise/_astro/client.jkl.js" props="a > b"></astro-island>
    </body></html>`;
  it('lists styles, scripts, preloads and island entry points once, from this origin only', () => {
    expect(extractAssetUrls(html, page).sort()).toEqual(
      [
        'https://a.test/layerwise/_astro/index.abc.css',
        'https://a.test/layerwise/_astro/chunk.js?x=1&y=2',
        'https://a.test/layerwise/_astro/page.def.js',
        'https://a.test/layerwise/_astro/Quiz.ghi.js',
        'https://a.test/layerwise/_astro/client.jkl.js',
      ].sort(),
    );
  });
  it('finds only the Latin fonts in a stylesheet', () => {
    const css = `@font-face{src:url(./bricolage-grotesque-latin-wght-normal.1.woff2) format("woff2-variations")}
      @font-face{src:url("./bricolage-grotesque-latin-ext-wght-normal.2.woff2")}
      @font-face{src:url(./source-serif-4-latin-wght-italic.3.woff2)}
      @font-face{src:url(./bricolage-grotesque-vietnamese-wght-normal.4.woff2)}
      .x{background:url(./pic.png)}`;
    expect(extractFontUrls(css, 'https://a.test/layerwise/_astro/index.css')).toEqual([
      'https://a.test/layerwise/_astro/bricolage-grotesque-latin-wght-normal.1.woff2',
      'https://a.test/layerwise/_astro/source-serif-4-latin-wght-italic.3.woff2',
    ]);
  });
  it('follows static and dynamic imports by path', () => {
    const js = `import{a}from"./a.1.js";import"./b.2.js";export{x}from'../c.3.js';const m=()=>import("./d.4.js");import x from "pkg";import("https://cdn/x.js");const s="from ./not.js";`;
    expect(extractImportUrls(js, 'https://a.test/layerwise/_astro/main.js').sort()).toEqual(
      ['https://a.test/layerwise/_astro/a.1.js', 'https://a.test/layerwise/_astro/b.2.js', 'https://a.test/layerwise/c.3.js', 'https://a.test/layerwise/_astro/d.4.js'].sort(),
    );
  });
});
