import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { quickQuestions } from '.';
import { categoryIds } from '../categories';
import { questions } from '..';

const root = process.cwd();
const sentences = (s: string) => s.split(/(?<=[.?!])\s+(?=[A-Z0-9"“‘])/).filter(Boolean);
const text = (q: (typeof quickQuestions)[number]) => [q.q, q.answer, q.example, q.next?.q ?? '', q.next?.a ?? ''].join(' ');

describe('quick interview questions', () => {
  it('have unique ids and unique questions', () => {
    const ids = quickQuestions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    const qs = quickQuestions.map((q) => q.q.toLowerCase());
    expect(new Set(qs).size).toBe(qs.length);
    // no clash with a full question's id, so a link can never point at the wrong page
    const full = new Set(questions.map((q) => q.id));
    for (const id of ids) expect(full.has(id), id).toBe(false);
  });

  it('are short questions with plain, short answers', () => {
    for (const q of quickQuestions) {
      expect(categoryIds, q.id).toContain(q.category);
      expect(q.q.endsWith('?'), q.id).toBe(true);
      expect(q.q.length, `${q.id} question`).toBeLessThanOrEqual(110);
      const n = sentences(q.answer).length;
      expect(n, `${q.id} answer sentences`).toBeGreaterThanOrEqual(2);
      expect(n, `${q.id} answer sentences`).toBeLessThanOrEqual(4);
      expect(q.answer.length, `${q.id} answer`).toBeLessThanOrEqual(520);
      expect(q.example.length, `${q.id} example`).toBeGreaterThanOrEqual(30);
      expect(q.example.length, `${q.id} example`).toBeLessThanOrEqual(360);
      if (q.next) {
        expect(q.next.q.endsWith('?'), q.id).toBe(true);
        expect(q.next.a.length, `${q.id} follow-up`).toBeLessThanOrEqual(360);
      }
    }
  });

  it('use no em or en dashes', () => {
    for (const q of quickQuestions) expect(text(q), q.id).not.toMatch(/[–—]/);
  });

  it('link to a lesson that exists and to a full question that exists', () => {
    const full = new Set(questions.map((q) => q.id));
    for (const q of quickQuestions) {
      expect(existsSync(join(root, 'src/content/lessons', `${q.lesson}.mdx`)), `${q.id}: ${q.lesson}`).toBe(true);
      if (q.scenario) expect(full.has(q.scenario), `${q.id}: ${q.scenario}`).toBe(true);
    }
  });
});
