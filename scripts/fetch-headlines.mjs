#!/usr/bin/env node
/**
 * Fetches the official feeds in feed-sources.mjs and writes src/data/headlines.json,
 * which the News page lists. Runs daily in the deploy workflow, and by hand with
 * `npm run headlines`. A source that fails keeps its previous entries, and if every
 * source fails the existing file is left alone, so a bad day never blanks the page.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { sources } from './feed-sources.mjs';
import { parseFeed, pick, windowDays } from './feed-lib.mjs';

const OUT = new URL('../src/data/headlines.json', import.meta.url);
const UA = 'LayerwiseHeadlines/1.0 (+https://github.com/awsmankit/layerwise)';

async function load(source) {
  const res = await fetch(source.url, { headers: { 'user-agent': UA, accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' }, signal: AbortSignal.timeout(20000), redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const items = parseFeed(xml);
  if (items.length === 0) throw new Error('no items found');
  return pick(source, items);
}

let previous = { items: [] };
try {
  previous = JSON.parse(await readFile(OUT, 'utf8'));
} catch {
  /* first run */
}

const results = await Promise.all(sources.map(async (s) => [s, await load(s).then((items) => ({ items }), (error) => ({ error }))]));
const items = [];
const failed = [];
for (const [s, r] of results) {
  if (r.items) items.push(...r.items);
  else {
    failed.push(`${s.id}: ${r.error.message}`);
    // keep this source's last entries, but never past its window
    items.push(...previous.items.filter((i) => i.source === s.id && Date.now() - Date.parse(i.date) <= windowDays(s) * 864e5));
  }
}

if (failed.length === sources.length) {
  console.error('Every feed failed; keeping the existing headlines.\n' + failed.join('\n'));
  process.exit(0);
}

const unique = [...new Map(items.map((i) => [i.url, i])).values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40);
await writeFile(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), items: unique }, null, 2) + '\n');
console.log(`${unique.length} headlines from ${sources.length - failed.length} of ${sources.length} sources.`);
if (failed.length) console.warn('Failed:\n  ' + failed.join('\n  '));
