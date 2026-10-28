import { describe, expect, it } from 'vitest';
import { robotsTxt } from './robots';

describe('robots.txt', () => {
  it('names the sitemap index on a GitHub project site', () => {
    expect(robotsTxt('https://awsmankit.github.io', '/layerwise')).toBe('User-agent: *\nAllow: /\n\nSitemap: https://awsmankit.github.io/layerwise/sitemap-index.xml\n');
    expect(robotsTxt('https://awsmankit.github.io', '/layerwise/')).toContain('Sitemap: https://awsmankit.github.io/layerwise/sitemap-index.xml');
  });

  it('works at the root of a site, and with Astro’s URL object', () => {
    expect(robotsTxt('https://example.com', '/')).toContain('Sitemap: https://example.com/sitemap-index.xml');
    expect(robotsTxt(new URL('https://example.com/'), '')).toContain('Sitemap: https://example.com/sitemap-index.xml');
  });

  it('allows crawling of the whole site', () => {
    expect(robotsTxt('https://example.com', '/')).toMatch(/User-agent: \*\nAllow: \//);
  });
});
