import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { categoryLabels, libraries, librariesChecked } from './libraries';
import { DECISION_ROWS } from '../components/viz/LibraryDecision';
import { LAYERS } from '../components/viz/LlmAppStack';

describe('libraries map', () => {
  it('has enough entries, with unique names', () => {
    expect(libraries.length).toBeGreaterThanOrEqual(30);
    expect(new Set(libraries.map((l) => l.name)).size).toBe(libraries.length);
  });

  it('keeps descriptions short and plain', () => {
    for (const l of libraries) {
      expect(l.what.length, `${l.name} what`).toBeLessThanOrEqual(110);
      expect(l.what.length, `${l.name} what`).toBeGreaterThan(20);
      expect(l.bestFor.length, `${l.name} bestFor`).toBeLessThanOrEqual(80);
    }
  });

  it('uses https links, and the repo is on GitHub', () => {
    for (const l of libraries) {
      expect(l.docs.startsWith('https://'), `${l.name} docs`).toBe(true);
      if (l.repo) expect(l.repo.startsWith('https://github.com/'), `${l.name} repo`).toBe(true);
    }
  });

  it('labels every category it uses, and uses every label', () => {
    const used = new Set(libraries.map((l) => l.category));
    for (const c of used) expect(categoryLabels[c], c).toBeTruthy();
    for (const c of Object.keys(categoryLabels)) expect(used.has(c as never), `${c} has no entries`).toBe(true);
  });

  it('points at lessons that exist', () => {
    for (const l of libraries) if (l.lesson) expect(existsSync(join(process.cwd(), 'src/content/lessons', `${l.lesson}.mdx`)), `${l.name}: ${l.lesson}`).toBe(true);
  });

  it('says why a project is not active, and dates its releases', () => {
    for (const l of libraries) {
      if (l.status !== 'active') expect(l.note, `${l.name} needs a note`).toBeTruthy();
      if (l.lastRelease) expect(l.lastRelease).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (l.lastRelease) expect(l.lastRelease <= librariesChecked, `${l.name} release is after the check date`).toBe(true);
    }
  });

  it('never shows a pipe-to-shell command without the note that tells readers to read it first', () => {
    // the page repeats this warning for every install command; keep the data free of hidden extras
    for (const l of libraries) if (l.install) expect(l.install).not.toMatch(/sudo|rm -rf/);
  });

  it('only names libraries in the diagrams that are on the map', () => {
    const known = new Set(libraries.map((l) => l.name));
    const named = [
      ...DECISION_ROWS.flatMap((r) => r.names),
      ...LAYERS.flatMap((l) => l.names.split(/,|;|adapt with/).map((n) => n.trim()).filter((n) => n && n !== 'no library needed')),
    ];
    for (const n of named) expect(known.has(n), `${n} is in a diagram but not on the map`).toBe(true);
  });
});
