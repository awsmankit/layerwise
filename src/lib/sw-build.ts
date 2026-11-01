import { normaliseBase } from './sw-logic.js';

/** Drop `export` from the start of top-level declarations so the text can be pasted into a classic worker. */
export function stripExports(src: string): string {
  return src.replace(/^export\s+(?=(?:async\s+)?(?:const|let|function)\b)/gm, '');
}

const MARKER = '// ---- code ----\n';

export type WorkerOptions = { version: string; base: string; dev: boolean };

/**
 * The worker file: the strategy comment from the template, the three build-time constants, the
 * tested logic, then the template's code.
 */
export function buildWorkerSource(opts: WorkerOptions, logic: string, template: string): string {
  const at = template.indexOf(MARKER);
  if (at < 0) throw new Error('sw-worker.js lost its "// ---- code ----" marker');
  const doc = template.slice(0, at);
  const code = template.slice(at + MARKER.length);
  const consts = [
    `const VERSION = ${JSON.stringify(opts.version)};`,
    `const BASE = ${JSON.stringify(normaliseBase(opts.base))};`,
    `const DEV = ${opts.dev ? 'true' : 'false'};`,
  ].join('\n');
  return `${doc}'use strict';\n${consts}\n\n${stripExports(logic)}\n${code}`;
}

/** The web app manifest, with every URL under the site's base path. */
export function buildManifest(base: string) {
  const b = normaliseBase(base);
  return {
    id: b,
    name: 'Layerwise: how AI systems work',
    short_name: 'Layerwise',
    description: 'Free, animated lessons on how AI systems work, one layer at a time. Works offline for pages you have opened.',
    lang: 'en-GB',
    start_url: b,
    scope: b,
    display: 'standalone',
    background_color: '#120f3d',
    theme_color: '#120f3d',
    categories: ['education'],
    icons: [
      { src: `${b}icons/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${b}icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${b}icons/icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Start here', url: `${b}start/`, icons: [{ src: `${b}icons/icon-192.png`, sizes: '192x192', type: 'image/png' }] },
      { name: 'All lessons', url: `${b}learn/`, icons: [{ src: `${b}icons/icon-192.png`, sizes: '192x192', type: 'image/png' }] },
      { name: 'Your progress', url: `${b}progress/`, icons: [{ src: `${b}icons/icon-192.png`, sizes: '192x192', type: 'image/png' }] },
    ],
  };
}
