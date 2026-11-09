// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { satteri } from '@astrojs/markdown-satteri';
import { katexPlugin } from './src/lib/katex-math.mjs';

// GitHub Pages serves project sites from /<repo>/, so the deploy workflow
// passes SITE_URL and BASE_PATH. Locally both fall back to the defaults.
const site = process.env.SITE_URL || 'http://localhost:4321';
const base = process.env.BASE_PATH || '/';

// https://astro.build/config
export default defineConfig({
  site,
  base,
  // the sitemap writes sitemap-index.xml and sitemap-0.xml, with URLs built from `site` plus `base`
  integrations: [react(), mdx(), sitemap({ filter: (page) => !page.includes('/certificate/') && !page.includes('/offline/') })],
  vite: {
    // the opt-in real-model worker imports this; pre-bundling it at start keeps the dev server from re-optimising
    // (and reloading) the first time the button is pressed. It changes nothing in the production build.
    optimizeDeps: { include: ['@huggingface/transformers'] },
  },
  markdown: {
    // Sätteri is already Astro's default; it is named here only to switch on `$$...$$` maths. Single `$` stays
    // plain text so prices in the cost lessons are not read as formulas. KaTeX runs at build time (no client JS).
    processor: satteri({ features: { math: { singleDollarTextMath: false } }, mdastPlugins: [katexPlugin] }),
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },
});
