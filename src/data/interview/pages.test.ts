import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('interview pages', () => {
  it('has the hub, category and answer pages', () => {
    for (const p of ['src/pages/interview/index.astro', 'src/pages/interview/c/[category].astro', 'src/pages/interview/q/[id].astro']) expect(existsSync(join(root, p)), p).toBe(true);
  });

  it('sends the old practice and run pages to the hub', () => {
    for (const p of ['src/pages/interview/practice.astro', 'src/pages/interview/run.astro']) {
      const s = read(p);
      expect(s, p).toContain('http-equiv="refresh"');
      expect(s, p).toContain("withBase('/interview/')");
      expect(s, p).toContain('Go to the interview answers');
    }
  });

  it('links to the old self-test pages from nowhere', () => {
    const files = [...walk(join(root, 'src')), join(root, 'README.md')].filter((f) => !f.endsWith('.test.ts') && !/\.(png|jpg|svg|woff2?)$/.test(f));
    const hits = files.filter((f) => /interview\/(practice|run)\b/.test(readFileSync(f, 'utf8')));
    expect(hits.map((f) => f.replace(root, ''))).toEqual([]);
  });

  it('no longer ships the self-test components or storage of scores', () => {
    for (const c of ['Practice', 'RunInterview', 'Timer', 'QuestionBank']) expect(existsSync(join(root, `src/components/interview/${c}.tsx`)), c).toBe(false);
    const finder = read('src/components/interview/InterviewFinder.tsx');
    expect(finder).not.toMatch(/localStorage|useStore|checkbox|scorecard/i);
  });

  it('shows the answer without hiding it', () => {
    const q = read('src/pages/interview/q/[id].astro');
    expect(q).not.toContain('<details');
    const c = read('src/pages/interview/c/[category].astro');
    expect(c).not.toContain('<details');
  });
});
