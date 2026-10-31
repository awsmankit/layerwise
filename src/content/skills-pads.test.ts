import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { PY_STEPS } from '../lib/spam-code';

/**
 * Every Run it pad in the skills lessons is run under real Python (isolated mode), so no
 * lesson can ship an example that does not work. Pads that are meant to fail say so by title.
 */
const lessons = ['python-first-steps', 'your-first-model'];
const failsOnPurpose = new Set(['Your first error', 'A second error']);

type Pad = { title: string; code: string; setup: string[] };

function pads(file: string): Pad[] {
  const src = readFileSync(join(process.cwd(), 'src/content/lessons/skills', `${file}.mdx`), 'utf8');
  return [...src.matchAll(/<RunIt\b[\s\S]*?\/>/g)].map((m) => {
    const tag = m[0];
    const code = tag.match(/code=\{`([\s\S]*?)`\}/)?.[1];
    expect(code, `a pad in ${file} has no code`).toBeDefined();
    const setup = [...(tag.match(/setup=\{\[([^\]]*)\]\}/)?.[1] ?? '').matchAll(/'([\w]+)'/g)].map((x) => x[1]);
    return { title: tag.match(/title="([^"]*)"/)?.[1] ?? '(untitled)', code: code!, setup };
  });
}

describe('Run it pads', () => {
  for (const file of lessons) {
    describe(file, () => {
      const list = pads(file);
      it('has pads', () => expect(list.length).toBeGreaterThan(0));
      for (const pad of list) {
        it(`${pad.title} ${failsOnPurpose.has(pad.title) ? 'fails with the error it teaches' : 'runs without an error'}`, () => {
          for (const k of pad.setup) expect(PY_STEPS[k], `unknown setup step ${k}`).toBeDefined();
          const source = pad.setup.map((k) => PY_STEPS[k]).join('\n') + '\n' + pad.code;
          const r = spawnSync('python3', ['-I', '-c', source], { encoding: 'utf8', timeout: 20000 });
          if (failsOnPurpose.has(pad.title)) {
            expect(r.status).not.toBe(0);
            expect(r.stderr).toMatch(/NameError|TypeError/);
          } else {
            expect(r.stderr).toBe('');
            expect(r.status).toBe(0);
          }
        });
      }
    });
  }
});
