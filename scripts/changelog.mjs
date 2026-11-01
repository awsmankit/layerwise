#!/usr/bin/env node
/**
 * Builds CHANGELOG.md from src/data/releases.ts, the single source of truth.
 *   node scripts/changelog.mjs            write CHANGELOG.md
 *   node scripts/changelog.mjs --check    exit 1 if CHANGELOG.md is out of date
 *   node scripts/changelog.mjs --notes 2.2.0   print the notes for one release (used for GitHub releases)
 *   node scripts/changelog.mjs --title 2.2.0   print the release title
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { releases, repoUrl } from '../src/data/releases.ts';

const tag = (v) => `v${v}`;

export function notesFor(r) {
  const s = r.stats;
  return [
    r.summary,
    '',
    ...r.highlights.map((h) => `- ${h}`),
    '',
    `**At this release:** ${s.lessons} lessons in ${s.topics} topics, ${s.labs} practice labs, ${s.glossary} glossary terms.`,
    '',
  ].join('\n');
}

export function changelog() {
  const out = [];
  out.push('# Changelog', '');
  out.push('All notable changes to Layerwise, newest first. The same history is on the site at `/changelog/`, and each version is tagged and published under [Releases](' + repoUrl + '/releases).', '');
  out.push('Versions follow [semantic versioning](https://semver.org/), read for a learning site:', '');
  out.push('- **Major**: the curriculum or the way learners move through it changes shape (new topics, rebuilt learning paths).');
  out.push('- **Minor**: new lessons, labs, tools or features.');
  out.push('- **Patch**: fixes and small corrections (wording, links, layout, accessibility).', '');
  for (const r of releases) {
    out.push(`## [${r.version}] - ${r.date}: ${r.title}`, '');
    out.push(notesFor(r));
  }
  releases.forEach((r, i) => {
    const prev = releases[i + 1];
    out.push(prev ? `[${r.version}]: ${repoUrl}/compare/${tag(prev.version)}...${tag(r.version)}` : `[${r.version}]: ${repoUrl}/releases/tag/${tag(r.version)}`);
  });
  out.push('');
  return out.join('\n');
}

const args = process.argv.slice(2);
if (import.meta.url === `file://${process.argv[1]}`) {
  const ti = args.indexOf('--title');
  const i = args.indexOf('--notes');
  if (ti >= 0) {
    const r = releases.find((x) => x.version === args[ti + 1].replace(/^v/, ''));
    if (!r) {
      console.error(`No release ${args[ti + 1]} in src/data/releases.ts`);
      process.exit(1);
    }
    process.stdout.write(`v${r.version}: ${r.title}`);
  } else if (i >= 0) {
    const r = releases.find((x) => x.version === args[i + 1].replace(/^v/, ''));
    if (!r) {
      console.error(`No release ${args[i + 1]} in src/data/releases.ts`);
      process.exit(1);
    }
    process.stdout.write(notesFor(r));
  } else if (args.includes('--check')) {
    let current = '';
    try { current = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8'); } catch {}
    if (current !== changelog()) {
      console.error('CHANGELOG.md is out of date. Run: npm run changelog');
      process.exit(1);
    }
    console.log('CHANGELOG.md is up to date.');
  } else {
    writeFileSync(new URL('../CHANGELOG.md', import.meta.url), changelog());
    console.log(`Wrote CHANGELOG.md (${releases.length} releases).`);
  }
}
