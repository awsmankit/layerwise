import { describe, expect, it } from 'vitest';
import { questions } from './index';
import { categories, categoryIds, categoryOf, categoryById, byDifficulty, groupByCategory } from './categories';
import { swatch } from '../../lib/palette';

const icons = ['llm', 'deep-learning', 'rag-agents', 'skills', 'evals', 'serving', 'blueprint', 'ml', 'infra', 'incident', 'edge', 'start'];

describe('interview categories', () => {
  it('has 10 to 14 well formed categories', () => {
    expect(categories.length).toBeGreaterThanOrEqual(10);
    expect(categories.length).toBeLessThanOrEqual(14);
    expect(new Set(categories.map((c) => c.id)).size).toBe(categories.length);
    expect(categories.map((c) => c.id)).toEqual([...categoryIds]);
    for (const c of categories) {
      expect(c.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(c.title.length).toBeGreaterThan(8);
      expect(c.promise.length).toBeGreaterThan(30);
      expect(c.intro.length).toBeGreaterThan(60);
      expect(Object.keys(swatch), c.id).toContain(c.swatch);
      expect(icons, c.id).toContain(c.icon);
    }
  });

  it('gives every question exactly one category that exists', () => {
    const sets = groupByCategory(questions);
    const listed = sets.flatMap((s) => s.questions.map((q) => q.id));
    expect(listed.length).toBe(questions.length);
    expect(new Set(listed).size).toBe(questions.length);
    for (const q of questions) expect(categoryById(categoryOf(q)), q.id).toBeDefined();
  });

  it('puts at least 8 questions in every category and keeps none too large', () => {
    for (const s of groupByCategory(questions)) {
      expect(s.questions.length, s.category.id).toBeGreaterThanOrEqual(8);
      expect(s.questions.length, s.category.id).toBeLessThanOrEqual(Math.ceil(questions.length / 5));
    }
  });

  it('lists each category from fundamentals to advanced', () => {
    for (const s of groupByCategory(questions)) {
      const sorted = [...s.questions].sort(byDifficulty);
      expect(s.questions.map((q) => q.id)).toEqual(sorted.map((q) => q.id));
      const order = { junior: 0, mid: 1, senior: 2 } as const;
      for (let i = 1; i < s.questions.length; i++) expect(order[s.questions[i].level]).toBeGreaterThanOrEqual(order[s.questions[i - 1].level]);
    }
  });
});
