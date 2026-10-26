import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Lesson-level guards. A React component used in MDX without a client:
 * directive is rendered as inert HTML: it never hydrates, so buttons do
 * nothing and anything that starts hidden stays hidden forever.
 */
const root = join(process.cwd(), 'src/content/lessons');
const files = readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .flatMap((d) => readdirSync(join(root, d.name)).filter((f) => f.endsWith('.mdx')).map((f) => join(root, d.name, f)));

describe('lesson MDX', () => {
  it('finds lessons', () => {
    expect(files.length).toBeGreaterThanOrEqual(23);
  });

  for (const file of files) {
    const name = file.replace(root + '/', '');
    const src = readFileSync(file, 'utf8');
    const body = src.replace(/^---[\s\S]*?---/, '');

    describe(name, () => {
      it('hydrates every React component it uses', () => {
        const reactNames = [...src.matchAll(/^import\s+(\w+)\s+from\s+'[^']+\.tsx';?$/gm)].map((m) => m[1]);
        const missing: string[] = [];
        for (const comp of reactNames) {
          for (const m of body.matchAll(new RegExp(`<${comp}\\b[\\s\\S]*?(?:/>|>[ \\t]*\\n)`, 'g'))) {
            if (!/client:(load|visible|idle|only)/.test(m[0])) missing.push(comp);
          }
        }
        expect(missing).toEqual([]);
      });

      it('imports only files that exist', () => {
        for (const m of src.matchAll(/^import\s+\w+\s+from\s+'(\.[^']+)';?$/gm)) {
          const target = join(file, '..', m[1]);
          expect(() => readFileSync(target), `${name}: ${m[1]}`).not.toThrow();
        }
      });

      it('has front matter for every required field', () => {
        const fm = src.match(/^---([\s\S]*?)---/)?.[1] ?? '';
        for (const key of ['title', 'track', 'level', 'order', 'summary', 'updated']) {
          expect(fm, `${name} missing ${key}`).toMatch(new RegExp(`^${key}:`, 'm'));
        }
      });

      it('keeps the folder and the track field in agreement', () => {
        const folder = name.split('/')[0];
        expect(src).toMatch(new RegExp(`^track: ${folder}$`, 'm'));
      });
    });
  }
});
