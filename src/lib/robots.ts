/**
 * The text of robots.txt: everything may be crawled, and the sitemap index is named with
 * its full address. `site` is Astro's configured site and `base` is the path the site is
 * served from (for a GitHub project site, the repository name).
 */
export function robotsTxt(site: string | URL, base: string): string {
  const root = new URL(base.endsWith('/') ? base : `${base}/`, site);
  return ['User-agent: *', 'Allow: /', '', `Sitemap: ${new URL('sitemap-index.xml', root).href}`, ''].join('\n');
}
