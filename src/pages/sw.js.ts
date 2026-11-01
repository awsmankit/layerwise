import type { APIRoute } from 'astro';
import { latestRelease } from '../data/releases';
import { buildWorkerSource } from '../lib/sw-build';
import logic from '../lib/sw-logic.js?raw';
import template from '../lib/sw-worker.js?raw';

/**
 * The service worker, served at <base>/sw.js so that its scope is the whole site under the base
 * path. Built here (not a static file) so the release version and the base path are filled in.
 */
export const GET: APIRoute = () =>
  new Response(buildWorkerSource({ version: latestRelease.version, base: import.meta.env.BASE_URL, dev: import.meta.env.DEV }, logic, template), {
    headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
