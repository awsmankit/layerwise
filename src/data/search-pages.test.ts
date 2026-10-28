import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { searchPages } from './search-pages';

const pages = join(process.cwd(), 'src/pages');
/** A site path such as /tools/cost/ is served by src/pages/tools/cost.astro or tools/cost/index.astro. */
const hasPage = (path: string) => {
  const p = path.replace(/^\/|\/$/g, '');
  return existsSync(join(pages, `${p}.astro`)) || existsSync(join(pages, p, 'index.astro'));
};

describe('search pages', () => {
  it('each point at a page that exists', () => {
    for (const p of searchPages) expect(hasPage(p.u), p.u).toBe(true);
  });

  it('have unique paths and titles, and start and end with a slash', () => {
    expect(new Set(searchPages.map((p) => p.u)).size).toBe(searchPages.length);
    expect(new Set(searchPages.map((p) => p.t)).size).toBe(searchPages.length);
    for (const p of searchPages) expect(p.u).toMatch(/^\/.*\/$/);
  });

  it('include the pages added for news, case studies, videos and progress', () => {
    const urls = searchPages.map((p) => p.u);
    for (const u of ['/cases/', '/watch/', '/pulse/', '/pulse/notes/', '/progress/']) expect(urls).toContain(u);
  });
});
