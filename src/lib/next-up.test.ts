import { describe, expect, it } from 'vitest';
import { pathBackground, prereqClosure, planNext, suggestStartedPath, type Catalogue, type LabMeta } from './next-up';
import { paths, pathIds } from '../data/paths';
import { pathLessons } from './certificate';
import { extras } from '../data/lesson-extras';
import { labs } from '../data/labs';

const meta = (title: string, minutes: number, prereq: string[] = []) => ({ title, href: `/learn/x/${title}/`, track: 'start', level: 'basic', minutes, prereq });

/** The whole real catalogue: every key a path or an extra mentions, with the real prerequisites. */
function realCatalogue(): Catalogue {
  const keys = new Set<string>(Object.keys(extras));
  for (const id of pathIds) for (const k of pathLessons(id)) keys.add(k);
  return Object.fromEntries([...keys].map((k) => [k, { title: `T:${k}`, href: `/learn/${k}/`, track: k.split('/')[0], level: 'basic', minutes: 6, prereq: extras[k]?.prereq ?? [] }]));
}
const real = realCatalogue();
const realLabs: LabMeta[] = labs.map((l) => ({ id: l.id, title: l.title, minutes: l.minutes, lesson: l.lesson }));

const newcomer = pathLessons('newcomer');

describe('planNext on the real paths', () => {
  it('gives every path a next lesson when nothing is done, with every prerequisite met', () => {
    for (const id of pathIds) {
      const plan = planNext({ pathId: id, done: [], catalogue: real, labs: realLabs });
      expect(plan.complete, id).toBe(false);
      expect(plan.next, id).not.toBeNull();
      expect(plan.next!.unmet, id).toEqual([]);
      expect(plan.next!.reason.length, id).toBeGreaterThan(10);
    }
  });

  it('never recommends a lesson with unmet prerequisites, at any point on any path', () => {
    for (const id of pathIds) {
      const keys = pathLessons(id);
      for (let n = 0; n < keys.length; n += 3) {
        const done = keys.slice(0, n);
        const plan = planNext({ pathId: id, done, catalogue: real, labs: realLabs });
        const next = plan.next!;
        expect(next.unmet, `${id} after ${n}`).toEqual([]);
        for (const a of plan.alternatives) if (a.type === 'lesson') {
          const k = Object.keys(real).find((x) => real[x].href === a.href)!;
          for (const p of real[k].prereq) if (real[p]) expect(done.includes(p), `${id}: ${k} needs ${p}`).toBe(true);
        }
      }
    }
  });

  it('is complete, with no next lesson, when every lesson on the path is done', () => {
    for (const id of pathIds) {
      const plan = planNext({ pathId: id, done: pathLessons(id), catalogue: real });
      expect(plan.complete).toBe(true);
      expect(plan.next).toBeNull();
      expect(plan.progress.done).toBe(plan.progress.total);
      expect(plan.followOn).toBe(paths[id].next ?? null);
    }
  });

  it('background lists the assumed lessons and what they build on, once each', () => {
    const bg = pathBackground('practitioner', real);
    expect(new Set(bg).size).toBe(bg.length);
    for (const k of paths.practitioner.assumes!) expect(bg).toContain(k);
    for (const k of bg) for (const p of real[k].prereq) if (real[p]) expect(bg.indexOf(p)).toBeLessThan(bg.indexOf(k));
  });
});

describe('prereqClosure', () => {
  it('lists each lesson once with its prerequisites first, and survives a cycle', () => {
    const cat: Catalogue = { a: meta('A', 1, ['b', 'c']), b: meta('B', 1, ['c']), c: meta('C', 1), d: meta('D', 1, ['e']), e: meta('E', 1, ['d']) };
    expect(prereqClosure(['a'], cat)).toEqual(['c', 'b', 'a']);
    expect(prereqClosure(['a', 'b', 'zzz'], cat)).toEqual(['c', 'b', 'a']);
    expect(prereqClosure(['d'], cat).sort()).toEqual(['d', 'e']);
  });
});

describe('planNext on a small catalogue', () => {
  // newcomer-like path of three lessons, one extra prerequisite outside it
  const cat: Catalogue = Object.fromEntries(newcomer.map((k, i) => [k, meta(`L${i}`, 10 - (i % 3) * 3)]));
  const a = newcomer[0], b = newcomer[1], c = newcomer[2];

  it('starts at the first lesson of the path and says it begins there', () => {
    const plan = planNext({ pathId: 'newcomer', done: [], catalogue: cat });
    expect(plan.next!.key).toBe(a);
    expect(plan.next!.position).toBe(1);
    expect(plan.next!.reason).toContain('begins');
    expect(plan.progress).toMatchObject({ done: 0, total: newcomer.length });
  });

  it('moves on to the lesson after the last one finished and names it', () => {
    const plan = planNext({ pathId: 'newcomer', done: [a, b], catalogue: cat });
    expect(plan.next!.key).toBe(c);
    expect(plan.next!.reason).toContain('L1');
    expect(plan.progress.done).toBe(2);
  });

  it('returns to a skipped lesson first and offers to carry on after the furthest one', () => {
    const plan = planNext({ pathId: 'newcomer', done: [a, c], catalogue: cat });
    expect(plan.next!.key).toBe(b);
    expect(plan.next!.reason).toContain('fills a gap');
    expect(plan.carryOn?.key).toBe(newcomer[3]);
  });

  it('recommends an unmet prerequisite first, and says what it is for', () => {
    const withPrereq: Catalogue = { ...cat, 'x/basics': meta('Basics', 4), [b]: meta('L1', 8, ['x/basics']) };
    const plan = planNext({ pathId: 'newcomer', done: [a], catalogue: withPrereq });
    expect(plan.next!.key).toBe('x/basics');
    expect(plan.next!.detourFor?.key).toBe(b);
    expect(plan.next!.reason).toContain('L1');
    expect(plan.next!.position).toBe(0);
    // once the prerequisite is done the path lesson itself comes back, with the prerequisite shown as met
    const after = planNext({ pathId: 'newcomer', done: [a, 'x/basics'], catalogue: withPrereq });
    expect(after.next!.key).toBe(b);
    expect(after.next!.prereqs).toEqual([expect.objectContaining({ key: 'x/basics', met: true })]);
  });

  it('follows a chain of prerequisites to the bottom, and survives a cycle', () => {
    const chain: Catalogue = { ...cat, 'x/p1': meta('P1', 3, ['x/p2']), 'x/p2': meta('P2', 3), [a]: meta('L0', 8, ['x/p1']) };
    expect(planNext({ pathId: 'newcomer', done: [], catalogue: chain }).next!.key).toBe('x/p2');
    const loop: Catalogue = { ...cat, 'x/p1': meta('P1', 3, ['x/p2']), 'x/p2': meta('P2', 3, ['x/p1']), [a]: meta('L0', 8, ['x/p1']) };
    const plan = planNext({ pathId: 'newcomer', done: [], catalogue: loop });
    expect(plan.next).not.toBeNull();
    expect(plan.next!.unmet.length).toBeGreaterThan(0);
  });

  it('treats lessons the learner says they know as met, without calling them done', () => {
    const withPrereq: Catalogue = { ...cat, 'x/basics': meta('Basics', 4), [a]: meta('L0', 8, ['x/basics']) };
    const plan = planNext({ pathId: 'newcomer', done: [], known: ['x/basics'], catalogue: withPrereq });
    expect(plan.next!.key).toBe(a);
    expect(plan.progress.done).toBe(0);
    expect(plan.recent).toEqual([]);
  });

  it('counts the background a path assumes as needed only until something on the path is done', () => {
    const catC: Catalogue = { 'start/how-computers-learn': meta('Learn', 5), ...Object.fromEntries(pathLessons('coder').map((k) => [k, meta(k, 6)])) };
    const first = pathLessons('coder')[0];
    const fresh = planNext({ pathId: 'coder', done: [], catalogue: catC });
    expect(fresh.next!.key).toBe('start/how-computers-learn');
    expect(fresh.next!.assumed).toBe(true);
    expect(fresh.next!.detourFor?.key).toBe(first);
    expect(planNext({ pathId: 'coder', done: [], known: ['start/how-computers-learn'], catalogue: catC }).next!.key).toBe(first);
    // someone partway through is not sent back, but the skipped background is listed as a gap
    const mid = planNext({ pathId: 'coder', done: [first], catalogue: catC });
    expect(mid.next!.key).toBe(pathLessons('coder')[1]);
    expect(mid.gaps.map((g) => g.key)).toContain('start/how-computers-learn');
  });

  it('lists up to three skipped prerequisites of the next steps, nearest need first', () => {
    const cat2: Catalogue = { ...cat };
    for (const k of ['q1', 'q2', 'q3', 'q4']) cat2[`x/${k}`] = meta(k, 3);
    cat2[b] = meta('L1', 8, ['x/q1']);
    cat2[c] = meta('L2', 8, ['x/q2', 'x/q3']);
    cat2[newcomer[3]] = meta('L3', 8, ['x/q4']);
    const plan = planNext({ pathId: 'newcomer', done: [a], catalogue: cat2 });
    expect(plan.next!.key).toBe('x/q1');
    expect(plan.gaps.map((g) => g.key)).toEqual(['x/q2', 'x/q3', 'x/q4']);
    expect(plan.gaps[0].why).toContain('L2');
    expect(plan.gaps.length).toBeLessThanOrEqual(3);
  });

  it('shows the three latest finished lessons, newest first, once each', () => {
    const plan = planNext({ pathId: 'newcomer', done: [a, b, c, newcomer[3], c], catalogue: cat });
    expect(plan.recent.map((r) => r.key)).toEqual([c, newcomer[3], b]);
  });

  it('offers a shorter lesson only when one in the next few is shorter and ready', () => {
    const flat: Catalogue = Object.fromEntries(newcomer.map((k, i) => [k, meta(`F${i}`, 12)]));
    const long: Catalogue = { ...flat, [b]: meta('L1', 5), [c]: meta('L2', 9) };
    const plan = planNext({ pathId: 'newcomer', done: [], catalogue: long });
    const lighter = plan.alternatives.find((x) => x.kind === 'lighter');
    expect(lighter).toMatchObject({ type: 'lesson', title: 'L1', minutes: 5 });
    const same: Catalogue = Object.fromEntries(newcomer.map((k, i) => [k, meta(`S${i}`, 5)]));
    expect(planNext({ pathId: 'newcomer', done: [], catalogue: same }).alternatives.find((x) => x.kind === 'lighter')).toBeUndefined();
    // a shorter lesson with an unmet prerequisite is not offered
    const gated: Catalogue = { ...long, [b]: meta('L1', 5, ['x/q']), 'x/q': meta('Q', 5) };
    expect(planNext({ pathId: 'newcomer', done: [], catalogue: gated }).alternatives.find((x) => x.kind === 'lighter')?.title).not.toBe('L1');
  });

  it('prefers an unfinished lab for a finished lesson, then a game after finished work, then the next lesson\'s lab', () => {
    const labsList: LabMeta[] = [
      { id: 'lab-a', title: 'Lab A', minutes: 10, lesson: a },
      { id: 'lab-c', title: 'Lab C', minutes: 8, lesson: c },
    ];
    const one = planNext({ pathId: 'newcomer', done: [a], catalogue: cat, labs: labsList });
    expect(one.alternatives.find((x) => x.kind === 'hands-on')).toMatchObject({ type: 'lab', href: '/practice/lab-a/' });
    // that lab is finished: nothing else is open for finished lessons, and newcomer has no games, so the next lesson's lab is not b's
    const two = planNext({ pathId: 'newcomer', done: [a, b], catalogue: cat, labs: labsList, labsDone: ['lab-a'] });
    expect(two.alternatives.find((x) => x.kind === 'hands-on')).toMatchObject({ type: 'lab', href: '/practice/lab-c/' });
    expect(planNext({ pathId: 'newcomer', done: [a], catalogue: cat, labs: labsList, labsDone: ['lab-a'] }).alternatives.find((x) => x.kind === 'hands-on')).toBeUndefined();
  });

  it('offers a game on the path once the lesson before it is finished, and not once it is played', () => {
    const keys = pathLessons('practitioner');
    const catP: Catalogue = Object.fromEntries(keys.map((k) => [k, meta(k, 6)]));
    const game = paths.practitioner.steps.find((s) => s.kind === 'game')!;
    const idx = paths.practitioner.steps.indexOf(game);
    const before = paths.practitioner.steps.slice(0, idx).filter((s) => s.kind === 'lesson').map((s) => (s as { key: string }).key);
    const early = planNext({ pathId: 'practitioner', done: before.slice(0, 2), known: paths.practitioner.assumes, catalogue: catP });
    expect(early.alternatives.find((x) => x.type === 'game')).toBeUndefined();
    const ready = planNext({ pathId: 'practitioner', done: before, catalogue: catP });
    expect(ready.alternatives.find((x) => x.kind === 'hands-on')).toMatchObject({ type: 'game', href: (game as { href: string }).href });
    const played = planNext({ pathId: 'practitioner', done: before, catalogue: catP, playedGames: [(game as { href: string }).href] });
    expect(played.alternatives.find((x) => x.type === 'game')?.href).not.toBe((game as { href: string }).href);
  });

  it('reports the path this one follows while it is unfinished', () => {
    const plan = planNext({ pathId: 'student', done: [], catalogue: real });
    expect(plan.background).toMatchObject({ pathId: 'newcomer', done: 0 });
    const done = planNext({ pathId: 'student', done: pathLessons('newcomer'), catalogue: real });
    expect(done.background).toBeNull();
  });
});

describe('suggestStartedPath', () => {
  it('is null with nothing done', () => {
    expect(suggestStartedPath([])).toBeNull();
  });
  it('picks the unfinished path with the most lessons done', () => {
    expect(suggestStartedPath(newcomer.slice(0, 4))).toBe('newcomer');
  });
  it('skips a finished path', () => {
    const coder = pathLessons('coder');
    const done = pathLessons('newcomer').concat(coder.slice(0, 2));
    expect(suggestStartedPath(done)).not.toBe('newcomer');
  });
});
