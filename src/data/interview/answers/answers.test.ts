import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { answers } from './index';
import { diagramAlt, diagramProblems, isChain } from './diagram';
import { questions } from '../index';
import { categoryOf, categoryIds } from '../categories';

const slugs = new Set(readdirSync(join(process.cwd(), 'src/data/whatif')).filter((f) => f.endsWith('.item.ts')).map((f) => f.replace('.item.ts', '')));
const sentences = (s: string) => s.split(/(?<=[.?!])\s+/).filter(Boolean);
/** Every string in an answer, so one check covers the whole text. */
const strings = (v: unknown): string[] => (typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : []);

describe('written interview answers', () => {
  const ids = Object.keys(answers);

  it('belong to real questions, one pilot per category', () => {
    expect(ids.length).toBeGreaterThanOrEqual(12);
    for (const id of ids) expect(questions.find((q) => q.id === id), id).toBeDefined();
    const cats = ids.map((id) => categoryOf(questions.find((q) => q.id === id)!));
    for (const c of categoryIds) expect(cats, c).toContain(c);
  });

  it('use at least five kinds of diagram and at least two embedded experiments', () => {
    const kinds = ids.map((id) => answers[id].diagram.kind);
    expect(new Set(kinds).size).toBeGreaterThanOrEqual(5);
    expect(kinds.filter((k) => k === 'experiment').length).toBeGreaterThanOrEqual(2);
  });

  for (const id of ids) {
    const a = answers[id];
    describe(id, () => {
      it('has a short answer of two to four sentences', () => {
        const n = sentences(a.short).length;
        expect(n).toBeGreaterThanOrEqual(2);
        expect(n).toBeLessThanOrEqual(4);
        expect(a.short.length).toBeGreaterThan(120);
      });
      it('explains in two to four sections', () => {
        expect(a.explain.length).toBeGreaterThanOrEqual(2);
        expect(a.explain.length).toBeLessThanOrEqual(4);
        for (const s of a.explain) {
          expect(s.heading.length).toBeGreaterThan(5);
          expect(s.body.length).toBeGreaterThan(150);
        }
      });
      it('has a valid diagram', () => {
        expect(diagramProblems(a.diagram, slugs), id).toEqual([]);
        expect(diagramAlt(a.diagram).length).toBeGreaterThan(40);
        if (a.diagram.kind === 'flow') expect(isChain(a.diagram)).toBe(true);
      });
      it('has a worked example', () => {
        expect(a.example.title.length).toBeGreaterThan(8);
        expect(a.example.text.length).toBeGreaterThan(60);
        if (a.example.rows) for (const r of a.example.rows) expect(r.label && r.value).toBeTruthy();
      });
      it('answers two to four follow-ups', () => {
        expect(a.followUps.length).toBeGreaterThanOrEqual(2);
        expect(a.followUps.length).toBeLessThanOrEqual(4);
        for (const f of a.followUps) {
          expect(f.q.endsWith('?')).toBe(true);
          const n = sentences(f.a).length;
          expect(n).toBeGreaterThanOrEqual(1);
          expect(n).toBeLessThanOrEqual(3);
        }
      });
      it('lists two to four mistakes', () => {
        expect(a.mistakes.length).toBeGreaterThanOrEqual(2);
        expect(a.mistakes.length).toBeLessThanOrEqual(4);
      });
      it('has no em or en dashes and no curly minus sign', () => {
        for (const s of strings(a)) expect(s, s.slice(0, 60)).not.toMatch(/[–—−]/);
      });
    });
  }
});

describe('diagram checks', () => {
  it('catch broken specs', () => {
    const flow = { kind: 'flow' as const, caption: 'c', nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] };
    expect(diagramProblems(flow, slugs)).toEqual([]);
    expect(diagramProblems({ ...flow, nodes: [flow.nodes[0], { id: 'a', label: 'B' }] }, slugs).join()).toContain('ids');
    expect(diagramProblems({ ...flow, edges: [['a', 'z']] }, slugs).join()).toContain('does not exist');
    expect(diagramProblems({ ...flow, highlight: ['q'] }, slugs).join()).toContain('highlight');
    expect(diagramProblems({ kind: 'experiment', slug: 'nope-nope' }, slugs).join()).toContain('does not exist');
    expect(diagramProblems({ kind: 'bars', unit: 'x', caption: 'c', items: [{ label: 'a', value: 0 }, { label: 'b', value: 0 }] }, slugs).join()).toContain('zero');
    expect(diagramProblems({ kind: 'compare', caption: 'c', columns: ['a', 'b'], rows: [{ label: 'r', cells: ['1'] }, { label: 's', cells: ['1', '2'] }] }, slugs).join()).toContain('cells');
    expect(diagramProblems({ kind: 'curve', caption: 'c', xLabel: 'x', yLabel: 'y', points: [[1, 1], [1, 2], [2, 3]] }, slugs).join()).toContain('left to right');
  });
  it('describe every kind in words', () => {
    expect(diagramAlt({ kind: 'layers', caption: 'cap', layers: [{ label: 'top' }, { label: 'bottom', sub: 'base' }] })).toContain('bottom: base');
    expect(diagramAlt({ kind: 'timeline', caption: 'cap', steps: [{ label: 'a', detail: 'first' }, { label: 'b', detail: 'second' }] })).toContain('2. b: second');
  });
});
