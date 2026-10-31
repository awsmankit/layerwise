import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { unplugged } from './unplugged';
import { worksheets } from './worksheets';
import { bigIdeas } from './standards';

const lessonExists = (k: string) => existsSync(join(process.cwd(), 'src/content/lessons', `${k}.mdx`));

describe('unplugged activity cards', () => {
  it('have unique ids and at least eight activities', () => {
    expect(new Set(unplugged.map((a) => a.id)).size).toBe(unplugged.length);
    expect(unplugged.length).toBeGreaterThanOrEqual(8);
  });

  it('give every card what a teacher needs to run it', () => {
    for (const a of unplugged) {
      expect(a.bands.length, a.id).toBeGreaterThan(0);
      expect(a.minutes, a.id).toBeGreaterThanOrEqual(15);
      expect(a.minutes, a.id).toBeLessThanOrEqual(60);
      expect(a.materials.length, a.id).toBeGreaterThan(0);
      expect(a.steps.length, a.id).toBeGreaterThanOrEqual(3);
      expect(a.notice.length, a.id).toBeGreaterThan(0);
      expect(a.discuss.length, a.id).toBeGreaterThanOrEqual(2);
      expect(a.lessons.length, a.id).toBeGreaterThan(0);
      expect(a.related.length, a.id).toBeGreaterThan(0);
      for (const r of a.related) expect(r.url, a.id).toMatch(/^https:\/\//);
    }
  });

  it('refer to lessons that exist', () => {
    for (const a of unplugged) for (const k of a.lessons) expect(lessonExists(k), `${a.id}: ${k}`).toBe(true);
  });

  it('cover all three age bands', () => {
    for (const b of ['10-12', '13-15', '16-18'] as const) expect(unplugged.some((a) => a.bands.includes(b)), b).toBe(true);
  });
});

describe('worksheets', () => {
  it('have one per age band, with a meaning order that is a permutation of the vocabulary', () => {
    expect(worksheets.map((w) => w.band)).toEqual(['10-12', '13-15', '16-18']);
    for (const w of worksheets) {
      expect([...w.meaningOrder].sort(), w.band).toEqual(w.vocab.map((_, i) => i));
      expect(w.meaningOrder.some((v, i) => v !== i), `${w.band} should not print meanings in the same order as the words`).toBe(true);
    }
  });

  it('give every question an answer, and refer to lessons and cards that exist', () => {
    const ids = new Set(unplugged.map((a) => a.id));
    for (const w of worksheets) {
      for (const s of w.sections) for (const i of s.items) expect(i.answer.length, `${w.band}: ${i.q}`).toBeGreaterThan(1);
      for (const k of w.lessons) expect(lessonExists(k), `${w.band}: ${k}`).toBe(true);
      for (const id of w.unplugged) expect(ids.has(id), `${w.band}: ${id}`).toBe(true);
    }
  });

  it('keep the worked numbers right', () => {
    const find = (band: string, text: string) => worksheets.find((w) => w.band === band)!.sections.flatMap((s) => s.items).find((i) => i.q.includes(text))!;
    const spam = find('16-18', 'accuracy, precision and recall').answer;
    expect(spam).toContain('90%');
    expect(spam).toContain('75%');
    expect(0.85 * 97 + 0.15 * 82).toBeCloseTo(94.75, 5);
    expect(find('16-18', 'overall accuracy').answer).toContain('94.8%');
    expect(400 * 1e-6 + 250 * 4e-6).toBeCloseTo(0.0014, 8);
    expect(find('16-18', '10,000 requests').answer).toContain('14 dollars');
  });
});

describe('AI4K12 map', () => {
  it('lists the five big ideas, and only lessons and cards that exist', () => {
    expect(bigIdeas.map((b) => b.n)).toEqual([1, 2, 3, 4, 5]);
    const ids = new Set(unplugged.map((a) => a.id));
    for (const b of bigIdeas)
      for (const [band, cell] of Object.entries(b.bands)) {
        for (const k of cell.lessons) expect(lessonExists(k), `${b.name} ${band}: ${k}`).toBe(true);
        for (const id of cell.activities) expect(ids.has(id), `${b.name} ${band}: ${id}`).toBe(true);
      }
  });

  it('is honest about gaps for every big idea', () => {
    for (const b of bigIdeas) expect(b.gaps.length, b.name).toBeGreaterThan(40);
  });
});
