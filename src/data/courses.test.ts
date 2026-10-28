import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { courses } from './courses';

describe('course plans', () => {
  it('only refer to lessons that exist, and never repeat a lesson inside a course', () => {
    for (const c of courses) {
      const seen = new Set<string>();
      for (const s of c.sessions)
        for (const k of s.lessons) {
          expect(existsSync(join(process.cwd(), 'src/content/lessons', `${k}.mdx`)), `${c.id}: ${k}`).toBe(true);
          if (c.id !== 'infra-day') expect(seen.has(k), `${c.id} repeats ${k}`).toBe(false);
          seen.add(k);
        }
    }
  });

  it('give every session a realistic length, an activity and a check', () => {
    for (const c of courses)
      for (const s of c.sessions) {
        expect(s.minutes, `${c.id}: ${s.title}`).toBeGreaterThanOrEqual(30);
        expect(s.minutes).toBeLessThanOrEqual(180);
        expect(s.activity.length).toBeGreaterThan(30);
        expect(s.check.length).toBeGreaterThan(10);
      }
  });

  it('teach the lessons added since the plans were first written', () => {
    const taught = new Set(courses.flatMap((c) => c.sessions.flatMap((s) => s.lessons)));
    for (const k of ['start/one-question-all-the-way-through', 'llm/parameters-and-hyperparameters', 'llm/prompt-patterns-and-optimisation', 'rag-agents/the-tools-and-ecosystem', 'rag-agents/langchain-and-langgraph', 'rag-agents/mcp-in-depth'])
      expect(taught.has(k), k).toBe(true);
  });

  it('keep the half-day workshop under four hours of sessions', () => {
    const half = courses.find((c) => c.id === 'half-day')!;
    expect(half.sessions.reduce((n, s) => n + s.minutes, 0)).toBeLessThanOrEqual(220);
  });
});
