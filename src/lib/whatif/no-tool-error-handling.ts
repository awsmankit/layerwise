/**
 * What if tool errors are not handled?
 *
 * Twenty small tasks, each of which needs one call to an order-lookup tool. On every attempt the tool fails with
 * a fixed probability p (a slider). Which attempts fail is decided by a seeded random table, so the same p always
 * gives the same run, and a higher p only ever turns successes into failures. A failure has one of three kinds
 * for the whole task: a timeout, an error reply, or a "too many requests" reply.
 *
 * Without handling, the toy agent reacts to the first failure the way careless code does: a timeout leaves it
 * hanging until the run is killed, an error reply is treated as if it were an answer and the agent makes one up,
 * and "too many requests" makes it hammer the tool until it runs out of steps.
 * With handling it retries up to three times with a growing wait (1, 2, then 4 seconds), then uses a labelled
 * backup (a cached copy) if there is one, and otherwise says so and asks the person.
 * Latencies and the table are EXAMPLES chosen to show the shape. They are not measurements of any real tool.
 */

export const TASKS = 20;
/** Retries after the first attempt, and the waits before each. */
export const WAITS = [1, 2, 4] as const;
export const MAX_ATTEMPTS = WAITS.length + 1;
/** A careless agent with no handling stops after this many instant retries (its step limit). */
export const LOOP_CALLS = 8;
/** The run is killed this many seconds after a hang. */
export const HANG_SECONDS = 60;

export type Kind = 'timeout' | 'error' | 'throttle';

/** Seconds one failed attempt takes (example). A timeout waits for the client's own 10 s limit. */
export const SECONDS: Record<Kind | 'ok' | 'backup', number> = { timeout: 10, error: 0.4, throttle: 0.2, ok: 0.4, backup: 0.3 };

export const KIND_LABEL: Record<Kind, string> = {
  timeout: 'timed out after 10 s',
  error: 'returned an error',
  throttle: 'said too many requests',
};

export type Outcome = 'ok' | 'retried' | 'backup' | 'asked' | 'crashed' | 'invented' | 'looped';

export const OUTCOME_LABEL: Record<Outcome, string> = {
  ok: 'Done on the first try',
  retried: 'Done after a retry',
  backup: 'Answered from a labelled backup',
  asked: 'Said so and asked the person',
  crashed: 'Crashed (hung until killed)',
  invented: 'Made up a result',
  looped: 'Looped until out of steps',
};

/** One shorthand symbol per outcome, so the grid is readable without colour. */
export const SYMBOL: Record<Outcome, string> = { ok: '✓', retried: '↻', backup: '◔', asked: '?', crashed: '✗', invented: '!', looped: '∞' };

/** Seeded generator (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Plan = {
  /** draw[i][j] below p means attempt j of task i fails. */
  draw: number[][];
  kind: Kind[];
  /** Whether a cached backup exists for this task. */
  hasBackup: boolean[];
};

const KINDS: Kind[] = ['timeout', 'error', 'throttle'];
/** Share of tasks that have a cached backup (example). */
export const BACKUP_SHARE = 0.6;

export function makePlan(seed = 37): Plan {
  const r = rng(seed);
  const draw: number[][] = [];
  const kind: Kind[] = [];
  const hasBackup: boolean[] = [];
  for (let i = 0; i < TASKS; i++) {
    draw.push(Array.from({ length: MAX_ATTEMPTS }, () => r()));
    kind.push(KINDS[Math.floor(r() * 3)]);
    hasBackup.push(r() < BACKUP_SHARE);
  }
  return { draw, kind, hasBackup };
}

export const PLAN: Plan = makePlan();

export type Attempt = { kind: Kind | 'ok' | 'backup'; seconds: number; waitBefore: number };

export type TaskRun = {
  task: number;
  outcome: Outcome;
  attempts: Attempt[];
  calls: number;
  seconds: number;
};

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const round1 = (x: number) => Math.round(x * 10) / 10;

/** Plays one task at failure rate p (0 to 1). */
export function runTask(task: number, p: number, handled: boolean, plan: Plan = PLAN): TaskRun {
  const fails = (j: number) => plan.draw[task][j] < p;
  const kind = plan.kind[task];
  const attempts: Attempt[] = [];
  const finish = (outcome: Outcome): TaskRun => ({
    task,
    outcome,
    attempts,
    calls: attempts.filter((a) => a.kind !== 'backup').length,
    seconds: round1(sum(attempts.map((a) => a.seconds + a.waitBefore))),
  });

  if (!fails(0)) {
    attempts.push({ kind: 'ok', seconds: SECONDS.ok, waitBefore: 0 });
    return finish('ok');
  }
  attempts.push({ kind, seconds: SECONDS[kind], waitBefore: 0 });

  if (!handled) {
    if (kind === 'timeout') {
      attempts[0].seconds = HANG_SECONDS;
      return finish('crashed');
    }
    if (kind === 'error') return finish('invented');
    for (let k = 1; k < LOOP_CALLS; k++) attempts.push({ kind: 'throttle', seconds: SECONDS.throttle, waitBefore: 0 });
    return finish('looped');
  }

  for (let j = 1; j < MAX_ATTEMPTS; j++) {
    if (!fails(j)) {
      attempts.push({ kind: 'ok', seconds: SECONDS.ok, waitBefore: WAITS[j - 1] });
      return finish('retried');
    }
    attempts.push({ kind, seconds: SECONDS[kind], waitBefore: WAITS[j - 1] });
  }
  if (plan.hasBackup[task]) {
    attempts.push({ kind: 'backup', seconds: SECONDS.backup, waitBefore: 0 });
    return finish('backup');
  }
  return finish('asked');
}

export type Summary = {
  runs: TaskRun[];
  counts: Record<Outcome, number>;
  /** Tasks finished with a fresh, correct result. */
  correct: number;
  /** Tasks that ended with no answer or a wrong one that looked like an answer. */
  broken: number;
  calls: number;
  seconds: number;
};

export function runAll(p: number, handled: boolean, plan: Plan = PLAN): Summary {
  const runs = Array.from({ length: TASKS }, (_, i) => runTask(i, p, handled, plan));
  const counts: Record<Outcome, number> = { ok: 0, retried: 0, backup: 0, asked: 0, crashed: 0, invented: 0, looped: 0 };
  for (const r of runs) counts[r.outcome]++;
  return {
    runs,
    counts,
    correct: counts.ok + counts.retried,
    broken: counts.crashed + counts.invented + counts.looped,
    calls: sum(runs.map((r) => r.calls)),
    seconds: round1(sum(runs.map((r) => r.seconds))),
  };
}

/** The failure rates the slider offers, in percent. */
export const RATES = [0, 10, 20, 30, 40, 50, 60];
