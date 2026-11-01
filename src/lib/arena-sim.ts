/**
 * Pairwise-vote ratings, simulated. Two models with a chosen true gap on the Elo scale (400 points = 10 to 1 odds)
 * face each other in N head-to-head votes. We estimate the gap from the votes, put a 95% interval on it, and repeat
 * the whole experiment many times to see how often the order comes out wrong. Ties are left out to keep the maths plain.
 * Everything uses a seeded generator, so the same inputs always give the same output.
 */
import { mulberry32 } from './data-prep';

export { mulberry32 };
export type Rand = () => number;

/** Rating points per unit of log-odds, 400 / ln(10), about 173.7. */
export const POINTS_PER_LOGIT = 400 / Math.LN10;
export const Z95 = 1.959964;
/** Both models are drawn around this centre rating. */
export const CENTRE = 1000;

/** Probability that A wins one vote when A is `gap` Elo points above B. */
export function winProb(gap: number): number {
  return 1 / (1 + Math.pow(10, -gap / 400));
}

export interface GapEstimate {
  wins: number;
  n: number;
  /** Estimated rating gap, A minus B. */
  gap: number;
  /** Standard error of the gap, in rating points. */
  se: number;
  lo: number;
  hi: number;
}

/**
 * Estimate the gap from `wins` for A out of `n` votes: the log-odds of A winning, scaled to rating points, with a
 * Wald interval. A half-vote is added to each side when a model won nothing, so the estimate stays finite.
 */
export function estimateGap(wins: number, n: number): GapEstimate {
  const a = wins === 0 || wins === n ? wins + (wins === 0 ? 0.5 : -0.5) : wins;
  const b = n - a;
  const gap = POINTS_PER_LOGIT * Math.log(a / b);
  const se = POINTS_PER_LOGIT * Math.sqrt(1 / a + 1 / b);
  return { wins, n, gap, se, lo: gap - Z95 * se, hi: gap + Z95 * se };
}

/** Draw the number of votes A wins out of n, when A wins each with probability p. */
export function drawWins(n: number, p: number, rand: Rand): number {
  let w = 0;
  for (let i = 0; i < n; i++) if (rand() < p) w++;
  return w;
}

export interface Params {
  /** True quality gap, A minus B, in rating points. */
  trueGap: number;
  n: number;
  /** Points of extra appeal that B gets from style (longer or better-formatted answers), not from quality. */
  styleBonusB: number;
}

/** The gap the voters actually express: quality gap minus B's style appeal. */
export const votedGap = (p: Params) => p.trueGap - p.styleBonusB;

export interface Board {
  est: GapEstimate;
  ratingA: number;
  ratingB: number;
  /** Half-width of each model's 95% bar. Half of the gap's, because both ratings share one constraint. */
  halfWidth: number;
  /** True when the two bars overlap, which is the same as the gap interval including zero. */
  overlap: boolean;
}

/** One experiment: the leaderboard you would publish from N votes. */
export function oneBoard(p: Params, seed: number): Board {
  const rand = mulberry32(seed);
  const wins = drawWins(p.n, winProb(votedGap(p)), rand);
  const est = estimateGap(wins, p.n);
  const half = (Z95 * est.se) / 2;
  return {
    est,
    ratingA: CENTRE + est.gap / 2,
    ratingB: CENTRE - est.gap / 2,
    halfWidth: half,
    overlap: est.lo <= 0 && est.hi >= 0,
  };
}

export interface Repeat {
  trials: number;
  /** Boards where the published order (A above B) is the right one for quality. */
  rightOrder: number;
  /** Boards that put the quality-worse model on top. */
  flipped: number;
  /** Boards with the models exactly level. */
  tied: number;
  /** Boards where the bars do not overlap and show the right order. */
  clearRight: number;
  /** Boards where the bars do not overlap but show the wrong order. */
  clearWrong: number;
  /** Boards where the bars overlap: the leaderboard cannot tell them apart. */
  unclear: number;
}

/**
 * Run the experiment `trials` times with different seeds. "Right order" means the order of the true quality gap
 * (A ahead when trueGap > 0, B ahead when trueGap < 0). With a true gap of exactly zero there is no right order, so
 * every board counts as unclear, flipped (B on top) or right (A on top) by chance.
 */
export function repeatExperiment(p: Params, trials: number, seed: number): Repeat {
  const r: Repeat = { trials, rightOrder: 0, flipped: 0, tied: 0, clearRight: 0, clearWrong: 0, unclear: 0 };
  const aShouldLead = p.trueGap >= 0;
  for (let t = 0; t < trials; t++) {
    const b = oneBoard(p, seed * 100003 + t);
    const g = b.est.gap;
    if (g === 0) r.tied++;
    else if (g > 0 === aShouldLead) r.rightOrder++;
    else r.flipped++;
    if (b.overlap) r.unclear++;
    else if (g > 0 === aShouldLead) r.clearRight++;
    else r.clearWrong++;
  }
  return r;
}

/**
 * Votes needed (ties excluded) before the 95% interval on the gap is narrower than the gap itself, so that a gap of
 * this size would be told apart from zero. From var(gap) = (400/ln10)^2 / (n p (1 - p)), solving 1.96 * se = gap.
 */
export function votesNeeded(gap: number): number {
  if (gap <= 0) return Infinity;
  const p = winProb(gap);
  const k = (Z95 * POINTS_PER_LOGIT) / gap;
  return Math.ceil((k * k) / (p * (1 - p)));
}
