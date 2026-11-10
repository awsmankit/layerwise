import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { releases, latestRelease } from './releases';
import { tracks } from './tracks';
import { glossary } from './glossary';
import { labs } from './labs';
// @ts-ignore plain JavaScript helper shared with the release workflow (typed or untyped depending on the checker)
import { changelog } from '../../scripts/changelog.mjs';
import { categoryIds } from './interview/categories';
import { questions } from './interview';

const semver = /^\d+\.\d+\.\d+$/;
const parts = (v: string) => v.split('.').map(Number);
const newer = (a: string, b: string) => {
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};

describe('release history', () => {
  it('lists semantic versions, newest first, each once', () => {
    expect(new Set(releases.map((r) => r.version)).size).toBe(releases.length);
    for (const r of releases) expect(r.version, r.version).toMatch(semver);
    for (let i = 1; i < releases.length; i++) expect(newer(releases[i - 1].version, releases[i].version), `${releases[i - 1].version} before ${releases[i].version}`).toBe(true);
  });

  it('has real dates that never go backwards', () => {
    for (const r of releases) expect(Number.isNaN(Date.parse(r.date)), r.version).toBe(false);
    for (let i = 1; i < releases.length; i++) expect(releases[i - 1].date >= releases[i].date, `${releases[i - 1].version} date`).toBe(true);
  });

  it('gives every release a title, summary and highlights', () => {
    for (const r of releases) {
      expect(r.title.length, r.version).toBeGreaterThan(5);
      expect(r.summary.length, r.version).toBeGreaterThan(20);
      expect(r.highlights.length, r.version).toBeGreaterThanOrEqual(2);
      for (const h of r.highlights) expect(h.length, `${r.version}: ${h}`).toBeGreaterThan(20);
    }
  });

  it('never has the counts shrink from one release to the next', () => {
    for (let i = 1; i < releases.length; i++) {
      const [now, before] = [releases[i - 1].stats, releases[i].stats];
      expect(now.lessons, releases[i - 1].version).toBeGreaterThanOrEqual(before.lessons);
      expect(now.topics, releases[i - 1].version).toBeGreaterThanOrEqual(before.topics);
      expect(now.labs, releases[i - 1].version).toBeGreaterThanOrEqual(before.labs);
      expect(now.glossary, releases[i - 1].version).toBeGreaterThanOrEqual(before.glossary);
    }
  });

  it('matches package.json and the repository for the latest release', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
    expect(pkg.version).toBe(latestRelease.version);
    const root = join(process.cwd(), 'src/content/lessons');
    const lessonCount = readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .reduce((n, d) => n + readdirSync(join(root, d.name)).filter((f) => f.endsWith('.mdx')).length, 0);
    expect(latestRelease.stats.lessons, 'lessons: update stats in src/data/releases.ts').toBe(lessonCount);
    expect(latestRelease.stats.topics, 'topics').toBe(tracks.length);
    expect(latestRelease.stats.labs, 'labs').toBe(labs.length);
    expect(latestRelease.stats.glossary, 'glossary').toBe(glossary.length);
  });

  it('keeps CHANGELOG.md in step with the data (run `npm run changelog`)', () => {
    const file = readFileSync(join(process.cwd(), 'CHANGELOG.md'), 'utf8');
    expect(file).toBe(changelog());
  });

  it('only links to pages that exist from tryIt', () => {
    const exists = (path: string) => {
      const p = path.replace(/^\/|\/$/g, '');
      if (p === '') return true;
      const lesson = p.match(/^learn\/([^/]+)\/([^/]+)$/);
      if (lesson) return readdirSync(join(process.cwd(), 'src/content/lessons', lesson[1])).includes(`${lesson[2]}.mdx`);
      const whatif = p.match(/^whatif\/([^/]+)$/);
      if (whatif) return readdirSync(join(process.cwd(), 'src/data/whatif')).includes(`${whatif[1]}.item.ts`);
      const question = p.match(/^interview\/q\/([^/]+)$/);
      if (question) return questions.some((q) => q.id === question[1]);
      const topic = p.match(/^interview\/c\/([^/]+)$/);
      if (topic) return (categoryIds as readonly string[]).includes(topic[1]);
      const pages = join(process.cwd(), 'src/pages');
      return readdirSync(join(pages, ...p.split('/').slice(0, -1)), { withFileTypes: true }).some((e) => e.name === `${p.split('/').pop()}.astro` || (e.isDirectory() && e.name === p.split('/').pop())) || false;
    };
    for (const r of releases) for (const l of r.tryIt ?? []) {
      expect(l.href, `${r.version} ${l.label}`).toMatch(/^\/.*\/$|^\/$/);
      expect(exists(l.href), `${r.version} ${l.href}`).toBe(true);
      expect(l.label.length).toBeGreaterThan(3);
    }
  });
});
