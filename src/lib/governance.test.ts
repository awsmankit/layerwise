import { describe, expect, it } from 'vitest';
import { FACT_SHEET, SECTIONS, cardText, reportCard } from './model-card';
import { ACTIONS, INCIDENTS, POINTS, borderline, grade, recommended, score, scoreLines } from './incident-triage';

const allSolid = new Set(SECTIONS.flatMap((s) => s.statements.filter((x) => x.kind === 'solid').map((x) => x.id)));
const requiredOnly = new Set(SECTIONS.flatMap((s) => s.statements.filter((x) => x.required).map((x) => x.id)));

describe('model card sections', () => {
  it('has the nine sections of Mitchell and others, each with unique statement ids', () => {
    expect(SECTIONS).toHaveLength(9);
    const ids = SECTIONS.flatMap((s) => s.statements.map((x) => x.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('every section needs at least one solid required statement and offers at least one bad one', () => {
    for (const s of SECTIONS) {
      expect(s.statements.some((x) => x.required && x.kind === 'solid')).toBe(true);
      expect(s.statements.some((x) => x.kind !== 'solid')).toBe(true);
      for (const x of s.statements) expect(x.why.length).toBeGreaterThanOrEqual(15);
      for (const x of s.statements.filter((y) => y.required)) expect(x.short).toBeTruthy();
    }
  });
  it('the fact sheet backs the headline numbers used in the statements', () => {
    const facts = FACT_SHEET.join(' ');
    for (const n of ['120,000', '3,000', '8,000', '400', '4.1%', '0.6', '3.2%', '9.8%', '2.5%', '8.7%', '300 clips']) {
      expect(facts).toContain(n);
    }
  });
});

describe('card report', () => {
  it('an empty card has every section missing and is not ready', () => {
    const r = reportCard(new Set());
    expect(r.sections.every((s) => s.status === 'missing')).toBe(true);
    expect(r.complete).toBe(0);
    expect(r.ready).toBe(false);
  });
  it('all required solid statements make a ready card', () => {
    const r = reportCard(requiredOnly);
    expect(r.complete).toBe(9);
    expect(r.flagCount).toBe(0);
    expect(r.ready).toBe(true);
  });
  it('optional solid statements do not spoil it', () => {
    expect(reportCard(allSolid).ready).toBe(true);
  });
  it('a vague statement alone is weak, and beside the solid one it is a red flag that blocks readiness', () => {
    const weak = reportCard(new Set(['d2']));
    expect(weak.sections[0].status).toBe('weak');
    expect(weak.sections[0].flags.map((f) => f.id)).toEqual(['d2']);
    const mixed = new Set([...requiredOnly, 'm2']);
    const r = reportCard(mixed);
    expect(r.flagCount).toBe(1);
    expect(r.ready).toBe(false);
    expect(r.sections.find((s) => s.id === 'metrics')!.status).toBe('partial');
  });
  it('a section with two required statements is partial until both are chosen', () => {
    const only = reportCard(new Set(['i1']));
    const s = only.sections.find((x) => x.id === 'intended')!;
    expect(s.status).toBe('partial');
    expect(s.requiredHave).toBe(1);
    expect(s.requiredTotal).toBe(2);
    expect(s.missing.map((m) => m.id)).toEqual(['i2']);
  });
  it('card text lists chosen lines under their section titles', () => {
    const t = cardText(new Set(['d1']));
    expect(t).toContain('Model details\n- HeySunny-S version 0.3');
    expect(t).toContain('Caveats and recommendations\n- (empty)');
  });
});

describe('incident rubric (hand-computed)', () => {
  const byId = Object.fromEntries(INCIDENTS.map((i) => [i.id, i]));
  it('scores each incident as worked out by hand', () => {
    expect(score(byId.hours.facts)).toBe(1); // minor
    expect(score(byId.leak.facts)).toBe(5); // 1 + 1 many + 1 ongoing + 2 personal
    expect(score(byId.cv.facts)).toBe(7); // 3 + 1 + 1 + 2
    expect(score(byId.format.facts)).toBe(2); // 0 + 1 + 1
    expect(score(byId.advert.facts)).toBe(4); // 1 + 1 + 0 + 2
    expect(score(byId.deprecated.facts)).toBe(1); // 0 + 0 + 1
  });
  it('maps scores to actions at the cut-offs 2 and 5', () => {
    expect(recommended(byId.hours.facts)).toBe('backlog');
    expect(recommended(byId.deprecated.facts)).toBe('backlog');
    expect(recommended(byId.format.facts)).toBe('week');
    expect(recommended(byId.advert.facts)).toBe('week');
    expect(recommended(byId.leak.facts)).toBe('escalate');
    expect(recommended(byId.cv.facts)).toBe('escalate');
  });
  it('uses all three actions and marks the near-cut-off cases', () => {
    expect(new Set(INCIDENTS.map((i) => recommended(i.facts))).size).toBe(3);
    expect(ACTIONS).toHaveLength(3);
    expect(borderline(byId.cv.facts)).toBe(false);
    expect(borderline(byId.leak.facts)).toBe(true);
  });
  it('score lines add up to the score and the point values are the documented ones', () => {
    for (const i of INCIDENTS) expect(scoreLines(i.facts).reduce((s, l) => s + l.points, 0)).toBe(score(i.facts));
    expect(POINTS.harm).toEqual({ none: 0, minor: 1, serious: 3 });
  });
  it('grades answers against the rubric', () => {
    const answers = Object.fromEntries(INCIDENTS.map((i) => [i.id, recommended(i.facts)]));
    expect(grade(answers)).toEqual({ answered: 6, matched: 6, total: 6 });
    expect(grade({ cv: 'backlog' })).toEqual({ answered: 1, matched: 0, total: 6 });
  });
});
