// Re-checks the AI libraries map (src/data/libraries.ts):
//   1. every docs and repo link still returns 200,
//   2. each GitHub repo is not archived while the entry says it is active (and the reverse),
//   3. an "active" entry has had a push in the last twelve months.
// Usage: npm run check-libraries
// Set GITHUB_TOKEN to avoid GitHub's low rate limit for unauthenticated requests.
// Sites that refuse automated requests (403, 406, 429) are listed apart, not counted as broken.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'src/data/libraries.ts'), 'utf8');

// one object per entry: split on the entry boundaries and read the fields we need
const entries = source
  .split(/\n  \{\n/)
  .slice(1)
  .map((block) => ({
    name: block.match(/name:\s*'([^']+)'/)?.[1] ?? block.match(/name:\s*"([^"]+)"/)?.[1],
    docs: block.match(/docs:\s*'(https:\/\/[^']+)'/)?.[1],
    repo: block.match(/repo:\s*'(https:\/\/github\.com\/[^']+)'/)?.[1],
    status: block.match(/status:\s*'([a-z]+)'/)?.[1],
  }))
  .filter((e) => e.name);

const headers = { 'user-agent': 'Mozilla/5.0 (compatible; layerwise-library-check/1.0; +https://github.com/awsmankit/layerwise)', accept: 'text/html,application/xhtml+xml' };
const refuses = new Set([403, 406, 429]);
const gh = { 'user-agent': headers['user-agent'], accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };

async function status(url) {
  try {
    let res = await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(20000) });
    return { status: res.status, final: res.url };
  } catch (error) {
    // some sites hand out a cookie and redirect to the same URL; a browser passes, a plain request loops. Retry once with the cookie.
    try {
      const first = await fetch(url, { headers, redirect: 'manual', signal: AbortSignal.timeout(20000) });
      const cookie = first.headers.get('set-cookie')?.split(';')[0];
      if (first.status >= 300 && first.status < 400 && cookie) {
        const res = await fetch(url, { headers: { ...headers, cookie }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
        return { status: res.status, final: res.url };
      }
    } catch {
      /* fall through to the original error */
    }
    return { status: 0, final: url, error: String(error.cause?.code ?? error.message) };
  }
}

async function repoInfo(repoUrl) {
  const path = repoUrl.replace('https://github.com/', '').replace(/\/$/, '');
  try {
    const res = await fetch(`https://api.github.com/repos/${path}`, { headers: gh, signal: AbortSignal.timeout(20000) });
    if (!res.ok) return { error: `GitHub API ${res.status}` };
    const j = await res.json();
    return { archived: j.archived, pushed: j.pushed_at, renamedTo: j.full_name.toLowerCase() === path.toLowerCase() ? null : j.full_name };
  } catch (error) {
    return { error: String(error.message) };
  }
}

const problems = [];
const yearAgo = Date.now() - 365 * 864e5;

for (let i = 0; i < entries.length; i += 4) {
  await Promise.all(
    entries.slice(i, i + 4).map(async (e) => {
      for (const url of [...new Set([e.docs, e.repo].filter(Boolean))]) {
        const r = await status(url);
        if (r.status === 200) continue;
        if (refuses.has(r.status)) problems.push(`BLOCKED  ${e.name}: ${url} (${r.status}, open it in a browser)`);
        else problems.push(`BROKEN   ${e.name}: ${url} (${r.status || r.error})`);
      }
      if (e.repo) {
        const info = await repoInfo(e.repo);
        if (info.error) problems.push(`UNKNOWN  ${e.name}: ${info.error}`);
        else {
          if (info.archived && e.status !== 'archived') problems.push(`ARCHIVED ${e.name}: the repository is archived but the entry says ${e.status}`);
          if (!info.archived && e.status === 'archived') problems.push(`NOTE     ${e.name}: the entry says archived but GitHub does not (the project's README may say so; check)`);
          if (e.status === 'active' && Date.parse(info.pushed) < yearAgo) problems.push(`QUIET    ${e.name}: no push in over a year (last ${info.pushed.slice(0, 10)})`);
          if (info.renamedTo) problems.push(`RENAMED  ${e.name}: the repository is now ${info.renamedTo}`);
        }
      }
    }),
  );
}

console.log(`${entries.length} libraries checked, ${problems.length} thing${problems.length === 1 ? '' : 's'} to look at.`);
for (const p of problems.sort()) console.log(p);
process.exit(problems.some((p) => p.startsWith('BROKEN') || p.startsWith('ARCHIVED')) ? 1 : 0);
