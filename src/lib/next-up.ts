import { paths, pathIds, type PathId } from '../data/paths';
import { pathCompletion, pathLessons, type Completion } from './certificate';

/**
 * "What should I learn next?" Pure logic: given a goal (a learning path), the lessons a
 * learner has finished and a catalogue of lessons, pick one next lesson, up to two
 * alternatives, the gaps worth filling and the numbers for a progress bar. Nothing here
 * reads the browser or the clock, so every rule can be tested.
 *
 * Rules, in short:
 *  - The next lesson is the first unfinished lesson of the path, in path order.
 *  - If that lesson has a prerequisite (`Extra.prereq`) that is not finished, the
 *    prerequisite is recommended first, and so on down, and the card says why.
 *  - A path's `assumes` lessons count as prerequisites of its first lesson while nothing
 *    on the path is finished. Later they only appear as gaps.
 *  - "Known" lessons are ones the learner says they know without having marked them done.
 *    They count as met for this plan only and are never written anywhere.
 */

export type LessonMeta = {
  title: string;
  href: string;
  track: string;
  level: string;
  /** Reading minutes, from the same helper the lesson pages use. */
  minutes: number;
  /** Lesson keys this lesson builds on (`Extra.prereq`). */
  prereq: string[];
};
export type Catalogue = Record<string, LessonMeta>;
export type LabMeta = { id: string; title: string; minutes: number; lesson?: string };

export type PlanInput = {
  pathId: PathId;
  /** Finished lesson keys, oldest first (the order the store keeps them in). */
  done: readonly string[];
  catalogue: Catalogue;
  labs?: readonly LabMeta[];
  labsDone?: readonly string[];
  /** Hrefs of games the learner has played. */
  playedGames?: readonly string[];
  /** Lessons the learner says they know already, for this plan only. */
  known?: readonly string[];
};

export type LessonRef = { key: string; title: string; href: string; track: string; level: string; minutes: number };
export type PrereqStatus = { key: string; title: string; href: string; met: boolean };

export type NextCard = LessonRef & {
  reason: string;
  /** Set when this lesson is a prerequisite picked ahead of the path lesson named here. */
  detourFor: LessonRef | null;
  /** True when the detour lesson is one the path takes as known. */
  assumed: boolean;
  /** 1-based place on the path, or 0 for a lesson that is not on it. */
  position: number;
  prereqs: PrereqStatus[];
  /** Prerequisites still not met. Empty in every normal case. */
  unmet: PrereqStatus[];
};

export type Alternative = {
  kind: 'lighter' | 'hands-on';
  type: 'lesson' | 'lab' | 'game';
  title: string;
  /** Site-relative, to be passed through `withBase`. */
  href: string;
  /** Null for a game, which has no reading time. */
  minutes: number | null;
  note: string;
};

export type Gap = LessonRef & { why: string };

export type Plan = {
  pathId: PathId;
  progress: Completion;
  complete: boolean;
  next: NextCard | null;
  alternatives: Alternative[];
  /** The latest finished lessons, newest first. */
  recent: LessonRef[];
  gaps: Gap[];
  /** The path to suggest once this one is finished. */
  followOn: PathId | null;
  /** Set when the path takes another whole path as known and it is not finished. */
  background: { pathId: PathId; done: number; total: number } | null;
  /** When lessons further along are finished but earlier ones are not: where to pick up after them. */
  carryOn: LessonRef | null;
};

const MAX_GAPS = 3;
const MAX_RECENT = 3;
const LIGHTER_WINDOW = 6;

const ref = (catalogue: Catalogue, key: string): LessonRef | null => {
  const m = catalogue[key];
  return m ? { key, title: m.title, href: m.href, track: m.track, level: m.level, minutes: m.minutes } : null;
};

const unique = <T>(xs: readonly T[]) => xs.filter((x, i) => xs.indexOf(x) === i);

/** The given lessons and everything they build on, each once, in the order to learn them. */
export function prereqClosure(keys: readonly string[], catalogue: Catalogue): string[] {
  const out: string[] = [];
  const visit = (key: string, path: string[]) => {
    if (out.includes(key) || path.includes(key) || !catalogue[key]) return;
    for (const p of catalogue[key].prereq) visit(p, [...path, key]);
    out.push(key);
  };
  for (const k of keys) visit(k, []);
  return out;
}

/** The lessons a path takes as known, plus everything those build on, in the order to learn them. */
export function pathBackground(pathId: PathId, catalogue: Catalogue): string[] {
  return prereqClosure(paths[pathId].assumes ?? [], catalogue);
}

/** The path the learner has got furthest into without finishing, for people who are "not sure". */
export function suggestStartedPath(done: readonly string[]): PathId | null {
  let best: PathId | null = null;
  let bestDone = 0;
  for (const id of pathIds) {
    const c = pathCompletion(id, done);
    if (!c.complete && c.done > bestDone) {
      best = id;
      bestDone = c.done;
    }
  }
  return best;
}

export function planNext(input: PlanInput): Plan {
  const { pathId, catalogue } = input;
  const path = paths[pathId];
  const done = input.done;
  const doneSet = new Set(done);
  const met = new Set([...done, ...(input.known ?? [])]);
  const progress = pathCompletion(pathId, done);
  const lessonKeys = pathLessons(pathId);
  const assumes = (path.assumes ?? []).filter((k) => catalogue[k]);
  const atStart = progress.done === 0;
  const stepIndex = (key: string) => lessonKeys.indexOf(key);

  /** Everything a lesson needs that is not met. Only the first lesson on a fresh path also needs the background. */
  const needs = (key: string, withAssumes: boolean) =>
    unique([...(withAssumes ? assumes : []), ...(catalogue[key]?.prereq ?? [])]).filter((k) => catalogue[k]);
  const unmetOf = (key: string, withAssumes: boolean) => needs(key, withAssumes).filter((k) => !met.has(k));

  const recent = [...done]
    .reverse()
    .filter((k, i, a) => a.indexOf(k) === i)
    .map((k) => ref(catalogue, k))
    .filter((r): r is LessonRef => r !== null)
    .slice(0, MAX_RECENT);

  const followOn = path.next ?? null;
  const base = {
    pathId,
    progress,
    recent,
    followOn,
    background: backgroundNote(pathId, done),
  };

  if (progress.complete) {
    return { ...base, complete: true, next: null, alternatives: [], gaps: findGaps([], null), carryOn: null };
  }

  // The first unfinished lesson of the path, counting "known" lessons as finished for the purpose of
  // moving on (the learner said so), then down through unmet prerequisites.
  const target = lessonKeys.find((k) => !met.has(k)) ?? progress.remaining[0];
  const startsHere = target === lessonKeys[0] && atStart;
  let key = target;
  const seen = new Set([target]);
  for (;;) {
    const unmet = unmetOf(key, key === target && startsHere).filter((k) => !seen.has(k));
    if (unmet.length === 0) break;
    key = unmet[0];
    seen.add(key);
  }
  const detour = key !== target;

  const lesson = ref(catalogue, key)!;
  const targetRef = ref(catalogue, target)!;
  const statuses = needs(key, key === target && startsHere).map((k) => ({
    key: k,
    title: catalogue[k].title,
    href: catalogue[k].href,
    met: met.has(k),
  }));

  const furthest = Math.max(-1, ...lessonKeys.map((k, i) => (doneSet.has(k) ? i : -1)));
  const targetIdx = stepIndex(target);
  const skipped = !detour && furthest > targetIdx;
  const prevKey = targetIdx > 0 ? lessonKeys[targetIdx - 1] : null;

  const assumed = detour && assumes.includes(key);
  let reason: string;
  if (detour) {
    reason = `“${targetRef.title}” is next on your path, and it builds on this lesson, so it comes first.${assumed ? ' This path takes it as known.' : ''}`;
  } else if (skipped) {
    reason = 'You have finished lessons further along this path but not this one, so it fills a gap before them.';
  } else if (targetIdx === 0) {
    reason = `This is where “${path.title}” begins${statuses.length === 0 ? ', and it needs nothing before it' : ', and its prerequisites are met'}.`;
  } else if (prevKey && catalogue[prevKey]) {
    reason = `The next step on your path, straight after “${catalogue[prevKey].title}”.`;
  } else {
    reason = 'The next unfinished step on your path.';
  }

  const next: NextCard = {
    ...lesson,
    reason,
    detourFor: detour ? targetRef : null,
    assumed,
    position: stepIndex(key) + 1,
    prereqs: statuses,
    unmet: statuses.filter((s) => !s.met),
  };

  let carryOn: LessonRef | null = null;
  if (skipped) {
    const k = lessonKeys.slice(furthest + 1).find((x) => !met.has(x) && unmetOf(x, false).length === 0);
    carryOn = k ? ref(catalogue, k) : null;
  }

  const alternatives: Alternative[] = [];
  const lighter = findLighter();
  if (lighter) alternatives.push(lighter);
  const hands = findHandsOn();
  if (hands) alternatives.push(hands);

  return { ...base, complete: false, next, alternatives, gaps: findGaps(lessonKeys.filter((k) => !met.has(k)), key), carryOn };

  /* ---------- helpers that close over the plan ---------- */

  function backgroundNote(id: PathId, doneKeys: readonly string[]) {
    const after = paths[id].after;
    if (!after) return null;
    const c = pathCompletion(after, doneKeys);
    return c.complete ? null : { pathId: after, done: c.done, total: c.total };
  }

  /** A shorter lesson from the next few on the path whose prerequisites are all met. */
  function findLighter(): Alternative | null {
    const window = lessonKeys.filter((k) => !met.has(k) && k !== key && k !== target && catalogue[k]).slice(0, LIGHTER_WINDOW);
    const shorter = window.filter((k) => catalogue[k].minutes < lesson.minutes && unmetOf(k, false).length === 0);
    if (shorter.length === 0) return null;
    const best = shorter.reduce((a, b) => (catalogue[b].minutes < catalogue[a].minutes ? b : a));
    const m = catalogue[best];
    return {
      kind: 'lighter',
      type: 'lesson',
      title: m.title,
      href: m.href,
      minutes: m.minutes,
      note: `${m.minutes} min, against ${lesson.minutes} min for the next lesson. It is also on your path.`,
    };
  }

  /** A lab or game from the same path: one for work already finished first, else the lab for the next lesson. */
  function findHandsOn(): Alternative | null {
    const labs = input.labs ?? [];
    const labsDone = new Set(input.labsDone ?? []);
    const open = labs.filter((l) => !labsDone.has(l.id));
    const labAlt = (l: LabMeta, note: string): Alternative => ({ kind: 'hands-on', type: 'lab', title: l.title, href: `/practice/${l.id}/`, minutes: l.minutes, note });

    // 1. a lab for a finished lesson on this path, the most recently finished first
    const onPath = open.filter((l) => l.lesson && stepIndex(l.lesson) >= 0 && doneSet.has(l.lesson));
    if (onPath.length > 0) {
      const latest = onPath.reduce((a, b) => (done.lastIndexOf(b.lesson!) > done.lastIndexOf(a.lesson!) ? b : a));
      const t = catalogue[latest.lesson!]?.title;
      return labAlt(latest, t ? `Practise “${t}”, which you have finished. Python runs in your browser.` : 'Practise what you have finished. Python runs in your browser.');
    }

    // 2. a game on this path that comes straight after finished work
    const played = new Set(input.playedGames ?? []);
    for (let i = 0; i < path.steps.length; i++) {
      const s = path.steps[i];
      if (s.kind !== 'game' || played.has(s.href)) continue;
      const before = path.steps.slice(0, i).reverse().find((x) => x.kind === 'lesson');
      if (before && before.kind === 'lesson' && !met.has(before.key)) continue;
      return { kind: 'hands-on', type: 'game', title: s.label, href: s.href, minutes: null, note: s.note };
    }

    // 3. the lab that goes with the lesson recommended now
    const forNext = open.find((l) => l.lesson === key);
    if (forNext) return labAlt(forNext, 'The practice lab for this lesson. Try it after you have read the lesson.');
    return null;
  }

  /** Up to three lessons the learner has not finished that their next steps build on. */
  function findGaps(ahead: readonly string[], exclude: string | null): Gap[] {
    const out: Gap[] = [];
    const add = (k: string, why: string) => {
      if (k === exclude || met.has(k) || out.some((g) => g.key === k)) return;
      const r = ref(catalogue, k);
      if (r) out.push({ ...r, why });
    };
    for (const step of ahead.slice(0, 8)) {
      for (const p of catalogue[step]?.prereq ?? []) add(p, `Needed for “${catalogue[step].title}”.`);
    }
    for (const k of assumes) add(k, `The “${path.title}” path takes this as known.`);
    return out.slice(0, MAX_GAPS);
  }
}
