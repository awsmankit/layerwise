/**
 * What if a model's decisions feed its own training data? A TOY deterministic loop, not a model of any real system.
 * Three areas. In reality each one holds incidents at an example rate. Each round the model has CHECKS to spend.
 * A share `explore` is spread evenly (independent sampling). The rest goes to the area where it has recorded the most so far.
 * It only records what it looks at, so recorded counts grow where it already looks. Its belief is each area's share of the records.
 * Expected values are used (no random numbers), so the same slider position always gives the same curve.
 */

export const AREAS = ['Area 1', 'Area 2', 'Area 3'] as const;
/** Example true rates: how often a check in each area finds something. Area 2 really has the most. */
export const RATES = [0.2, 0.25, 0.15] as const;
/** Records at the start, a small head start for Area 1 by chance. */
export const START = [12, 10, 10] as const;
export const ROUNDS = 30;
export const CHECKS = 60;

const r4 = (v: number) => Math.round(v * 10000) / 10000;

export type Round = {
  round: number;
  counts: number[];
  /** Each area's share of everything recorded so far. */
  belief: number[];
  /** Share of all checks so far that went to each area. */
  attention: number[];
  /** The area the model would send most checks to next. */
  top: number;
};

const sum = (a: readonly number[]) => a.reduce((x, y) => x + y, 0);
const argmax = (a: readonly number[]) => a.reduce((b, v, i) => (v > a[b] ? i : b), 0);

/** Reality: each area's share of the true incidents. */
export const truthShare = (): number[] => RATES.map((r) => r4(r / sum(RATES)));

export function simulate(explorePct: number, rounds = ROUNDS): Round[] {
  const e = Math.min(1, Math.max(0, explorePct / 100));
  const counts = [...START];
  const checksSoFar = [0, 0, 0];
  const out: Round[] = [];
  const snap = (round: number): Round => ({
    round,
    counts: counts.map(r4),
    belief: counts.map((c) => r4(c / sum(counts))),
    attention: checksSoFar.map((c) => (sum(checksSoFar) === 0 ? 0 : r4(c / sum(checksSoFar)))),
    top: argmax(counts),
  });
  out.push(snap(0));
  for (let r = 1; r <= rounds; r++) {
    const top = argmax(counts);
    for (let i = 0; i < 3; i++) {
      const checks = (e * CHECKS) / 3 + (i === top ? (1 - e) * CHECKS : 0);
      checksSoFar[i] += checks;
      counts[i] += checks * RATES[i];
    }
    out.push(snap(r));
  }
  return out;
}

/** Total variation distance between belief and reality: the share of belief that sits in the wrong place. 0 is perfect, 1 is as wrong as possible. */
export function drift(belief: readonly number[]): number {
  const t = truthShare();
  return r4(0.5 * belief.reduce((s, b, i) => s + Math.abs(b - t[i]), 0));
}

/** The area with the most real incidents. */
export const realTop = (): number => argmax(RATES);

/** First round at which one area holds at least `share` of the model's belief, or null if never. */
export function lockInRound(rounds: Round[], share = 0.9): number | null {
  const hit = rounds.find((r) => Math.max(...r.belief) >= share);
  return hit ? hit.round : null;
}
