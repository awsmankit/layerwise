// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// GitHub Pages serves project sites from /<repo>/, so the deploy workflow
// passes SITE_URL and BASE_PATH. Locally both fall back to the defaults.
const site = process.env.SITE_URL || 'http://localhost:4321';
const base = process.env.BASE_PATH || '/';

// https://astro.build/config
export default defineConfig({
  site,
  base,
  // the sitemap writes sitemap-index.xml and sitemap-0.xml, with URLs built from `site` plus `base`
  integrations: [react(), mdx(), sitemap({ filter: (page) => !page.includes('/certificate/') })],
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },
});
