import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { questions, roles, ilevels, kinds, rubric } from './index';

const root = join(process.cwd(), 'src/content/lessons');
const lessonKeys = new Set(
  readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) => readdirSync(join(root, d.name)).filter((f) => f.endsWith('.mdx')).map((f) => `${d.name}/${f.replace(/\.mdx$/, '')}`)),
);
const gameHrefs = new Set(['/play/blueprint/', '/play/cost-crunch/', '/play/fit-the-model/', '/play/rack-and-stack/', '/play/incident-room/']);

describe('interview question bank', () => {
  it('is big enough to be useful and covers every role, level and kind', () => {
    expect(questions.length).toBeGreaterThanOrEqual(36);
    for (const r of Object.keys(roles)) expect(questions.some((q) => q.roles.includes(r as never)), r).toBe(true);
    for (const l of Object.keys(ilevels)) expect(questions.filter((q) => q.level === l).length, l).toBeGreaterThanOrEqual(6);
    for (const k of Object.keys(kinds)) expect(questions.some((q) => q.kind === k), k).toBe(true);
  });

  it('has unique, URL-safe ids', () => {
    const ids = questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('has no duplicate prompts', () => {
    const prompts = questions.map((q) => q.prompt.toLowerCase().trim());
    expect(new Set(prompts).size).toBe(prompts.length);
  });

  for (const q of questions) {
    describe(q.id, () => {
      it('is well formed', () => {
        expect(q.prompt.length).toBeGreaterThan(20);
        expect(q.roles.length).toBeGreaterThan(0);
        for (const r of q.roles) expect(Object.keys(roles)).toContain(r);
        expect(Object.keys(ilevels)).toContain(q.level);
        expect(Object.keys(kinds)).toContain(q.kind);
        expect(q.minutes).toBeGreaterThanOrEqual(5);
        expect(q.minutes).toBeLessThanOrEqual(60);
        expect(q.topics.length).toBeGreaterThan(0);
        for (const t of q.topics) expect(t).toMatch(/^[a-z0-9][a-z0-9 /&+-]*$/);
      });

      it('says what a strong answer covers, with follow-ups and red flags', () => {
        expect(q.strong.length).toBeGreaterThanOrEqual(4);
        expect(q.strong.length).toBeLessThanOrEqual(9);
        for (const s of q.strong) expect(s.length).toBeGreaterThan(12);
        expect(q.followUps.length).toBeGreaterThanOrEqual(2);
        for (const f of q.followUps) {
          expect(f.q.length).toBeGreaterThan(10);
          expect(f.lookFor.length).toBeGreaterThan(10);
        }
        expect(q.redFlags.length).toBeGreaterThanOrEqual(2);
      });

      it('points to lessons and games that exist', () => {
        for (const l of q.lessons) expect(lessonKeys.has(l), `${q.id} -> ${l}`).toBe(true);
        if (q.game) expect(gameHrefs.has(q.game.href), `${q.id} -> ${q.game.href}`).toBe(true);
      });
    });
  }

  it('uses a four-point rubric', () => {
    expect(rubric.map((r) => r.score)).toEqual([1, 2, 3, 4]);
  });
});
