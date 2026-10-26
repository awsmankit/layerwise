import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { incidents } from './incidents';
import { levers } from './costcrunch';
import { defaultChoice, evaluate, scenarios as blueprintScenarios } from './blueprint';

/** Every lesson link used by the games must point at a lesson that exists. */
const root = join(process.cwd(), 'src/content/lessons');
const existing = new Set(
  readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) => readdirSync(join(root, d.name)).filter((f) => f.endsWith('.mdx')).map((f) => `/learn/${d.name}/${f.replace(/\.mdx$/, '')}/`)),
);

function check(hrefs: string[]) {
  const missing = hrefs.filter((h) => !existing.has(h));
  expect(missing).toEqual([]);
}

describe('game links resolve to real lessons', () => {
  it('lesson inventory is not empty', () => {
    expect(existing.size).toBeGreaterThanOrEqual(23);
  });

  it('incident room', () => {
    check(incidents.flatMap((i) => i.lessons.map((l) => l.href)));
  });

  it('cost crunch', () => {
    check(levers.map((l) => l.lesson.href));
  });

  it('blueprint', () => {
    check(
      blueprintScenarios.flatMap((s) => evaluate(s, defaultChoice()).checks.map((c) => c.lesson?.href).filter((h): h is string => !!h)),
    );
  });
});
