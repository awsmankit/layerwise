import type { APIRoute } from 'astro';
import { robotsTxt } from '../lib/robots';

export const GET: APIRoute = ({ site }) =>
  new Response(robotsTxt(site ?? 'http://localhost:4321', import.meta.env.BASE_URL), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
