import { describe, expect, it } from 'vitest';
import { placement, recommend, score } from './placement';
import { extras } from './lesson-extras';
import { paths, pathIds } from './paths';
import { glossary } from './glossary';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd(), 'src/content/lessons');
const lessonKeys = new Set(
  readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) => readdirSync(join(root, d.name)).filter((f) => f.endsWith('.mdx')).map((f) => `${d.name}/${f.replace(/\.mdx$/, '')}`)),
);

describe('placement check', () => {
  it('every question has a valid answer and ends with “I don’t know”', () => {
    for (const q of placement) {
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(q.options.length - 1);
      expect(q.options[q.options.length - 1]).toMatch(/don.t know/i);
    }
  });

  it('the correct answer is not always in the same position', () => {
    expect(new Set(placement.map((q) => q.answer)).size).toBeGreaterThan(1);
  });

  it('recommends a sensible path at each score', () => {
    expect(recommend(0)).toBe('newcomer');
    expect(recommend(2)).toBe('newcomer');
    expect(recommend(3)).toBe('builder');
    expect(recommend(4)).toBe('builder');
    expect(recommend(5)).toBe('practitioner');
    expect(recommend(6)).toBe('practitioner');
  });

  it('scores answers, treating “I don’t know” and skips as wrong', () => {
    const perfect = placement.map((q) => q.answer);
    expect(score(perfect)).toBe(placement.length);
    expect(score(placement.map((q) => q.options.length - 1))).toBe(0);
    expect(score(placement.map(() => null))).toBe(0);
  });
});

describe('learning paths', () => {
  it('every lesson step exists', () => {
    for (const id of pathIds) {
      for (const step of paths[id].steps) {
        if (step.kind === 'lesson') expect(lessonKeys.has(step.key), `${id}: ${step.key}`).toBe(true);
      }
    }
  });

  it('every path starts with a lesson, and none repeats a step', () => {
    for (const id of pathIds) {
      const steps = paths[id].steps;
      expect(steps[0].kind).toBe('lesson');
      const keys = steps.map((s) => (s.kind === 'lesson' ? s.key : s.href + s.label));
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});

describe('lesson extras', () => {
  it('every lesson has extras, and every extra belongs to a lesson', () => {
    for (const key of lessonKeys) expect(extras[key], `missing extras for ${key}`).toBeDefined();
    for (const key of Object.keys(extras)) expect(lessonKeys.has(key), `orphan extras ${key}`).toBe(true);
  });

  it('each lesson has takeaways and a well-formed quiz', () => {
    for (const [key, e] of Object.entries(extras)) {
      expect(e.takeaways.length, key).toBeGreaterThanOrEqual(3);
      expect(e.quiz.length, key).toBeGreaterThanOrEqual(2);
      for (const item of e.quiz) {
        expect(item.options.length, `${key}: ${item.q}`).toBeGreaterThanOrEqual(3);
        expect(item.answer).toBeGreaterThanOrEqual(0);
        expect(item.answer).toBeLessThan(item.options.length);
        expect(new Set(item.options).size).toBe(item.options.length);
        expect(item.why.length).toBeGreaterThan(15);
      }
    }
  });

  it('prerequisites point at lessons that exist', () => {
    for (const [key, e] of Object.entries(extras)) {
      for (const pre of e.prereq ?? []) expect(lessonKeys.has(pre), `${key} -> ${pre}`).toBe(true);
    }
  });
});

describe('glossary', () => {
  it('has unique ids and terms, and each short definition is a sentence or two', () => {
    expect(new Set(glossary.map((g) => g.id)).size).toBe(glossary.length);
    expect(new Set(glossary.map((g) => g.term.toLowerCase())).size).toBe(glossary.length);
    for (const g of glossary) {
      expect(g.short.length, g.id).toBeGreaterThan(30);
      expect(g.short.length, g.id).toBeLessThan(260);
    }
  });

  it('links only to lessons that exist', () => {
    for (const g of glossary) {
      if (!g.lesson) continue;
      const m = g.lesson.match(/^\/learn\/([a-z-]+)\/([a-z0-9-]+)\/$/);
      expect(m, g.id).not.toBeNull();
      expect(lessonKeys.has(`${m![1]}/${m![2]}`), `${g.id} -> ${g.lesson}`).toBe(true);
    }
  });
});
