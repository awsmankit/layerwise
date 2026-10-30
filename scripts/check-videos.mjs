#!/usr/bin/env node
/**
 * Checks that every YouTube video and playlist the site links still exists:
 * the per-lesson videos (src/data/videos/) and the Learning videos page
 * (src/data/watch.ts). Courses hosted elsewhere are left to the source check. Uses YouTube's public oEmbed endpoint, no key needed.
 *   node scripts/check-videos.mjs
 * 400 and 404 mean the video was removed or made private: BROKEN.
 * 401 and 403 mean it exists but the owner turned off embedding: listed, not broken.
 * A changed title is listed so the data can be updated, not treated as broken.
 */
import { videosCore } from '../src/data/videos/core.ts';
import { videosOps } from '../src/data/videos/ops.ts';
import { watch } from '../src/data/watch.ts';

const items = [
  ...Object.entries({ ...videosCore, ...videosOps }).flatMap(([lesson, list]) => list.map((v) => ({ where: lesson, title: v.title, url: v.url }))),
  ...watch.map((w) => ({ where: 'watch page', title: w.title, url: w.url })),
].filter((v) => /^https:\/\/(www\.)?youtube\.com\//.test(v.url));

async function check({ where, title, url }) {
  const api = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(api, { signal: AbortSignal.timeout(20000) });
      if (res.ok) {
        const data = await res.json();
        return data.title && data.title !== title ? `renamed ${where}  ${url}  now “${data.title}”` : null;
      }
      if (res.status === 401 || res.status === 403) return `no-embed ${where}  ${url}  (exists, embedding is off)`;
      if (res.status === 400 || res.status === 404) return `BROKEN  ${where}  ${url}  (removed or private)`;
      if (res.status === 429 && attempt === 0) {
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      return `blocked ${where}  ${url}  (HTTP ${res.status}, check by hand)`;
    } catch (e) {
      if (attempt === 1) return `blocked ${where}  ${url}  (${e.name}: ${e.message})`;
    }
  }
  return null;
}

const unique = [...new Map(items.map((v) => [v.url + v.where, v])).values()];
const problems = [];
let i = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (i < unique.length) {
      const r = await check(unique[i++]);
      if (r) problems.push(r);
    }
  }),
);
console.log(`${unique.length} video links checked, ${problems.length} to look at.`);
for (const p of problems.sort()) console.log(p);
process.exit(problems.some((p) => p.startsWith('BROKEN')) ? 1 : 0);
