// Checks the links in src/data/cases.ts and reports any that no longer return 200.
// Usage: npm run check-links
//
// Some sites refuse automated requests (403, 406, 429) even though the page opens
// fine in a browser. Those are listed apart, to check by hand, not counted as broken.
// Entries marked `linkOnly` in cases.ts are the ones known to refuse automated reading;
// they are checked here like the rest, and a 403 on them is expected.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'src/data/cases.ts'), 'utf8');
const urls = [...source.matchAll(/url:\s*'(https:\/\/[^']+)'/g)].map((m) => m[1]);

const headers = {
  'user-agent': 'Mozilla/5.0 (compatible; layerwise-link-check/1.0; +https://github.com/awsmankit/layerwise)',
  accept: 'text/html,application/xhtml+xml',
};
const refuses = new Set([403, 406, 429]);

async function check(url) {
  try {
    const res = await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(20000) });
    return { url, status: res.status, final: res.url };
  } catch (error) {
    return { url, status: 0, final: url, error: String(error.cause?.code ?? error.message) };
  }
}

const results = [];
for (let i = 0; i < urls.length; i += 5) {
  results.push(...(await Promise.all(urls.slice(i, i + 5).map(check))));
}

const broken = results.filter((r) => r.status !== 200 && !refuses.has(r.status));
const blocked = results.filter((r) => refuses.has(r.status));
const moved = results.filter((r) => r.status === 200 && r.final.replace(/\/$/, '') !== r.url.replace(/\/$/, ''));

console.log(`${urls.length} links checked, ${results.filter((r) => r.status === 200).length} returned 200.`);
for (const r of broken) console.log(`BROKEN  ${r.status || r.error}  ${r.url}`);
for (const r of blocked) console.log(`BLOCKED ${r.status} (opens in a browser?)  ${r.url}`);
for (const r of moved) console.log(`MOVED   ${r.url}\n        now ${r.final}`);
process.exit(broken.length > 0 ? 1 : 0);
