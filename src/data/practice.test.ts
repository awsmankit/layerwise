import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { projects, resources, topicLabels } from './practice';

const lessons = join(process.cwd(), 'src/content/lessons');

describe('practice resources', () => {
  it('has at least twelve, with unique ids and https urls', () => {
    expect(resources.length).toBeGreaterThanOrEqual(12);
    expect(new Set(resources.map((r) => r.id)).size).toBe(resources.length);
    expect(new Set(resources.map((r) => r.url)).size).toBe(resources.length);
    for (const r of resources) expect(r.url.startsWith('https://'), r.id).toBe(true);
  });

  it('keeps each description short, and labels every topic', () => {
    for (const r of resources) {
      expect(r.what.length, r.id).toBeLessThanOrEqual(110);
      expect(r.what.length, r.id).toBeGreaterThan(20);
      expect(topicLabels[r.topic], r.id).toBeTruthy();
      expect(r.checked, r.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe('practice projects', () => {
  it('has exactly six, with unique ids', () => {
    expect(projects).toHaveLength(6);
    expect(new Set(projects.map((p) => p.id)).size).toBe(6);
  });

  it('gives each three to five criteria and lessons that exist', () => {
    for (const p of projects) {
      expect(p.criteria.length, p.id).toBeGreaterThanOrEqual(3);
      expect(p.criteria.length, p.id).toBeLessThanOrEqual(5);
      expect(p.lessons.length, p.id).toBeGreaterThan(0);
      for (const key of p.lessons) expect(existsSync(join(lessons, `${key}.mdx`)), `${p.id}: ${key}`).toBe(true);
    }
  });
});
