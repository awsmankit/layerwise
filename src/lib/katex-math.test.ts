import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { katexPlugin, renderMath } from './katex-math.mjs';

const root = join(process.cwd(), 'src/content/lessons');
const lessons = readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .flatMap((d) => readdirSync(join(root, d.name)).filter((f) => f.endsWith('.mdx')).map((f) => join(root, d.name, f)));

describe('build-time maths', () => {
  it('renders a formula to server-side HTML with a MathML copy for screen readers', () => {
    const html = renderMath('\\frac{a}{\\sqrt{d}}', false);
    expect(html).toContain('class="katex"');
    expect(html).toContain('<math');
    expect(html).not.toContain('<script');
  });

  it('puts display equations in a box that scrolls on its own', () => {
    const out = katexPlugin.math({ value: 'x^2' });
    expect(out.raw).toContain('class="math-block"');
    expect(out.raw).toContain('katex-display');
    expect(out.mdxExpressions).toBe(false);
  });

  it('fails the build on a broken formula instead of printing a blank', () => {
    expect(() => renderMath('\\notacommand{x}', false)).toThrow();
  });

  it('ships only same-origin, woff2 KaTeX files', () => {
    const css = readFileSync(join(process.cwd(), 'public/katex/katex.css'), 'utf8');
    expect(css).not.toMatch(/https?:\/\//);
    expect(css).not.toMatch(/\.(woff|ttf)\b/);
    const fonts = [...css.matchAll(/url\(([^)]+)\)/g)].map((m) => m[1]);
    expect(fonts.length).toBeGreaterThan(10);
    for (const f of fonts) expect(existsSync(join(process.cwd(), 'public/katex', f)), f).toBe(true);
  });

  it('keeps the copied stylesheet in step with the installed katex version', () => {
    const css = readFileSync(join(process.cwd(), 'public/katex/katex.css'), 'utf8');
    const { version } = JSON.parse(readFileSync(join(process.cwd(), 'node_modules/katex/package.json'), 'utf8'));
    expect(css.split('\n')[0]).toContain(`KaTeX ${version} `);
  });

  it('keeps a lesson that has maths out of dollar-sign trouble: every $$ is paired', () => {
    for (const file of lessons) {
      const body = readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '');
      const count = (body.match(/\$\$/g) ?? []).length;
      expect(count % 2, file.replace(root + '/', '')).toBe(0);
    }
  });

  it('has maths in at least eight lessons', () => {
    const withMath = lessons.filter((f) => /\$\$/.test(readFileSync(f, 'utf8')));
    expect(withMath.length).toBeGreaterThanOrEqual(8);
  });
});
