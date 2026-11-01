import { describe, expect, it } from 'vitest';
import { CASES, gradeReview, issueLines, score, type DiffCase } from './diff-review';

const byId = (id: string): DiffCase => CASES.find((c) => c.id === id)!;
const linesWith = (c: DiffCase, tag: string) => c.lines.map((l, i) => (l.tag === tag ? i : -1)).filter((i) => i >= 0);

describe('the exercise data', () => {
  it('has five cases with exactly one acceptable change', () => {
    expect(CASES).toHaveLength(5);
    expect(CASES.filter((c) => c.issues.length === 0)).toHaveLength(1);
    expect(new Set(CASES.map((c) => c.id)).size).toBe(5);
  });

  it('gives every issue at least one line, and each issue kind is planted once among the required problems', () => {
    for (const c of CASES) {
      for (const i of c.issues) expect(issueLines(c, i).length).toBeGreaterThan(0);
    }
    const required = CASES.flatMap((c) => c.issues.filter((i) => !i.minor).map((i) => i.kind));
    expect(required.sort()).toEqual(['hallucinated-api', 'logic', 'removed-check', 'secret']);
  });

  it('never lets the planted problem sit on a context line when it was a removal or an addition', () => {
    const authz = byId('authz');
    expect(issueLines(authz, authz.issues[0]).every((n) => authz.lines[n].kind === 'del')).toBe(true);
    const iso = byId('iso');
    expect(iso.lines[issueLines(iso, iso.issues[0])[0]].kind).toBe('add');
  });

  it('does not put a real-looking credential in the lesson', () => {
    const text = CASES.flatMap((c) => c.lines.map((l) => l.text)).join('\n');
    expect(text).toMatch(/EXAMPLE/);
    expect(text).not.toMatch(/xox[bp]-[0-9]{6,}/);
  });
});

describe('gradeReview', () => {
  it('approving the good change is right, and flagging it is a false alarm', () => {
    const c = byId('cache');
    expect(gradeReview(c, [])).toMatchObject({ outcome: 'approved-good', full: true });
    const g = gradeReview(c, [8]);
    expect(g).toMatchObject({ outcome: 'false-alarm', full: false, falseFlags: [8] });
  });

  it('finds the off-by-one by its line and ignores duplicates', () => {
    const c = byId('pagination');
    const offset = linesWith(c, 'offset');
    const g = gradeReview(c, [...offset, ...offset]);
    expect(g).toMatchObject({ outcome: 'found-all', found: ['offset'], missed: [], full: true });
    expect(g.minorFound).toEqual([]);
  });

  it('counts the minor weak-test finding without requiring it', () => {
    const c = byId('pagination');
    const g = gradeReview(c, [...linesWith(c, 'offset'), ...linesWith(c, 'testassert')]);
    expect(g.minorFound).toEqual(['weak-test']);
    expect(g.falseFlags).toEqual([]);
    expect(g.full).toBe(true);
  });

  it('approving a broken change is the worst outcome', () => {
    for (const id of ['pagination', 'iso', 'authz', 'secret']) {
      expect(gradeReview(byId(id), [])).toMatchObject({ outcome: 'approved-bad', full: false });
    }
  });

  it('flagging only the wrong lines of a broken change misses it and lists the false flags', () => {
    const c = byId('iso');
    const g = gradeReview(c, [0, 1]);
    expect(g).toMatchObject({ outcome: 'missed', missed: ['parse'], falseFlags: [0, 1], full: false });
  });

  it('is partly right when the right line is flagged along with others', () => {
    const c = byId('iso');
    const g = gradeReview(c, [...linesWith(c, 'parse'), 0]);
    expect(g.outcome).toBe('found-all');
    expect(g.full).toBe(false);
    expect(g.falseFlags).toEqual([0]);
  });

  it('accepts either removed line of the authorisation check', () => {
    const c = byId('authz');
    const [a, b] = linesWith(c, 'check');
    expect(gradeReview(c, [a]).full).toBe(true);
    expect(gradeReview(c, [b]).full).toBe(true);
  });

  it('accepts the secret on either the definition or the use', () => {
    const c = byId('secret');
    const [def, use] = linesWith(c, 'token');
    expect(gradeReview(c, [def]).full).toBe(true);
    expect(gradeReview(c, [use]).full).toBe(true);
  });
});

describe('score', () => {
  it('counts full marks among reviewed cases', () => {
    const a = gradeReview(byId('cache'), []);
    const b = gradeReview(byId('iso'), []);
    expect(score([a, b, undefined])).toEqual({ full: 1, reviewed: 2 });
  });
});
