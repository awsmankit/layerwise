import type { APIRoute } from 'astro';
import { buildManifest } from '../lib/sw-build';

export const GET: APIRoute = () =>
  new Response(JSON.stringify(buildManifest(import.meta.env.BASE_URL), null, 2), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  });
