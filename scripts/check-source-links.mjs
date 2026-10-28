#!/usr/bin/env node
/**
 * Checks that every source link in the lessons still resolves.
 *   node scripts/check-source-links.mjs            all lessons
 *   node scripts/check-source-links.mjs llm cloud  only those tracks
 * Prints one line per problem. 403, 406 and 429 are reported as "blocked" (the site refuses
 * automated requests; open the link by hand), not as broken.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../src/content/lessons/', import.meta.url).pathname;
const only = new Set(process.argv.slice(2));
const UA = 'Mozilla/5.0 (compatible; LayerwiseLinkCheck/1.0; +https://github.com/awsmankit/layerwise)';

const links = [];
for (const track of await readdir(root)) {
  if (only.size && !only.has(track)) continue;
  for (const file of (await readdir(join(root, track))).filter((f) => f.endsWith('.mdx'))) {
    const text = await readFile(join(root, track, file), 'utf8');
    const front = text.split('---')[1] ?? '';
    for (const m of front.matchAll(/url:\s*["']?(https?:\/\/[^\s"']+)/g)) links.push({ lesson: `${track}/${file.replace('.mdx', '')}`, url: m[1] });
  }
}

async function check({ lesson, url }) {
  try {
    let res = await fetch(url, { method: 'HEAD', headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
    if (res.status === 405 || res.status === 403 || res.status === 400) res = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
    const moved = res.url && res.url.replace(/\/$/, '') !== url.replace(/\/$/, '') ? ` (now ${res.url})` : '';
    if (res.ok) return moved ? `moved   ${lesson}  ${url}${moved}` : null;
    if ([403, 406, 429].includes(res.status)) return `blocked ${lesson}  ${url}  (HTTP ${res.status}, check by hand)`;
    return `BROKEN  ${lesson}  ${url}  (HTTP ${res.status})`;
  } catch (e) {
    return `BROKEN  ${lesson}  ${url}  (${e.name}: ${e.message})`;
  }
}

const problems = [];
let i = 0;
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (i < links.length) {
      const l = links[i++];
      const r = await check(l);
      if (r) problems.push(r);
    }
  }),
);
console.log(`${links.length} source links checked, ${problems.length} to look at.`);
for (const p of problems.sort()) console.log(p);
process.exit(problems.some((p) => p.startsWith('BROKEN')) ? 1 : 0);
