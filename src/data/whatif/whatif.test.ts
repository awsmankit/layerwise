import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { whatifs, areas } from './index';

const root = join(process.cwd(), 'src/content/lessons');
const lessonKeys = new Set(
  readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) => readdirSync(join(root, d.name)).filter((f) => f.endsWith('.mdx')).map((f) => `${d.name}/${f.replace(/\.mdx$/, '')}`)),
);

describe('what-if experiments', () => {
  it('has unique slugs and titles that are questions', () => {
    expect(new Set(whatifs.map((w) => w.slug)).size).toBe(whatifs.length);
    expect(new Set(whatifs.map((w) => w.title)).size).toBe(whatifs.length);
    for (const w of whatifs) {
      expect(w.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(w.title, w.slug).toMatch(/^What if .+\?$/);
    }
  });

  for (const w of whatifs) {
    describe(w.slug, () => {
      it('has a demo component and its numbers in src/lib/whatif with a test', () => {
        expect(existsSync(join(process.cwd(), 'src/components/whatif', `${w.slug}.tsx`)), 'component').toBe(true);
        expect(existsSync(join(process.cwd(), 'src/lib/whatif', `${w.slug}.ts`)), 'logic').toBe(true);
        expect(existsSync(join(process.cwd(), 'src/lib/whatif', `${w.slug}.test.ts`)), 'test').toBe(true);
      });
      it('is well formed', () => {
        expect(Object.keys(areas)).toContain(w.area);
        expect(w.blurb.length).toBeGreaterThan(30);
        expect(w.minutes).toBeGreaterThanOrEqual(2);
        expect(w.minutes).toBeLessThanOrEqual(15);
        expect(w.why.length).toBeGreaterThanOrEqual(2);
        expect(w.why.length).toBeLessThanOrEqual(5);
        expect(w.takeaways.length).toBeGreaterThanOrEqual(3);
        expect(w.takeaways.length).toBeLessThanOrEqual(5);
        expect(w.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        for (const text of [w.title, w.blurb, ...w.why, ...w.takeaways]) expect(text, w.slug).not.toMatch(/[—–]/);
      });
      it('links to lessons that exist and to https sources', () => {
        expect(w.lessons.length).toBeGreaterThan(0);
        for (const l of w.lessons) expect(lessonKeys.has(l), l).toBe(true);
        expect(w.sources.length).toBeGreaterThan(0);
        for (const s of w.sources) expect(s.url).toMatch(/^https:\/\//);
      });
    });
  }
});
