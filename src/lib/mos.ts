/*
 * A simulated listening test, for teaching how much a mean opinion score (MOS) moves with the number of
 * listeners. Nothing here is real listener data: each simulated listener has a harshness (an offset they
 * apply to everything they hear) and each rating adds random noise, then is rounded to a whole number of
 * stars from 1 to 5, as in an absolute category rating test. Pure functions with a seeded generator, so a
 * result can be reproduced. The t quantiles are checked against scipy in mos.test.ts.
 */

/** Small seeded generator (mulberry32): returns numbers in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One standard normal draw (Box-Muller). */
export function normal(rand: () => number): number {
  const u = 1 - rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ---------- Student's t distribution ---------- */

function lnGamma(x: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const cj of c) ser += cj / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

/** Continued fraction for the regularised incomplete beta function (Lentz's method). */
function betaCf(a: number, b: number, x: number): number {
  const tiny = 1e-300;
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + aa / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-14) break;
  }
  return h;
}

/** Regularised incomplete beta function I_x(a, b). */
export function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (front * betaCf(a, b, x)) / a : 1 - (front * betaCf(b, a, 1 - x)) / b;
}

/** Cumulative distribution function of Student's t with `df` degrees of freedom. */
export function tCdf(t: number, df: number): number {
  const tail = 0.5 * incompleteBeta(df / (df + t * t), df / 2, 0.5);
  return t > 0 ? 1 - tail : tail;
}

/** The t value below which a fraction p of the distribution lies (found by bisection). */
export function tQuantile(p: number, df: number): number {
  if (!(p > 0 && p < 1) || !(df > 0)) return NaN;
  if (p === 0.5) return 0;
  if (p < 0.5) return -tQuantile(1 - p, df);
  let lo = 0;
  let hi = 1;
  while (tCdf(hi, df) < p && hi < 1e9) hi *= 2;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (tCdf(mid, df) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const t975Cache = new Map<number, number>();
/** The 97.5th percentile of t, remembered because a simulation asks for the same few values thousands of times. */
export function t975(df: number): number {
  let v = t975Cache.get(df);
  if (v === undefined) {
    v = tQuantile(0.975, df);
    t975Cache.set(df, v);
  }
  return v;
}

/* ---------- summary statistics ---------- */

export const mean = (x: readonly number[]): number => x.reduce((s, v) => s + v, 0) / x.length;

/** Sample standard deviation (divides by n - 1). */
export function sd(x: readonly number[]): number {
  if (x.length < 2) return NaN;
  const m = mean(x);
  return Math.sqrt(x.reduce((s, v) => s + (v - m) ** 2, 0) / (x.length - 1));
}

export type Interval = { mean: number; lo: number; hi: number; half: number; n: number };

/** Mean with a two-sided 95% t interval: mean +/- t(0.975, n - 1) * s / sqrt(n). */
export function ci95(x: readonly number[]): Interval {
  const n = x.length;
  const m = mean(x);
  const half = n < 2 ? NaN : (t975(n - 1) * sd(x)) / Math.sqrt(n);
  return { mean: m, lo: m - half, hi: m + half, half, n };
}

/* ---------- the simulated test ---------- */

export type SimParams = {
  /** The average quality of each system before ratings are rounded to whole stars. */
  trueA: number;
  trueB: number;
  listeners: number;
  /** How much listeners differ in harshness (standard deviation, in stars). */
  biasSd: number;
  /** How much one listener's rating of one clip wobbles (standard deviation, in stars). */
  noiseSd: number;
};

export type Ratings = { a: number[]; b: number[] };

const star = (x: number): number => Math.max(1, Math.min(5, Math.round(x)));

/** Every listener rates one clip from each system. */
export function simulateTest(p: SimParams, seed: number): Ratings {
  const rand = mulberry32(seed);
  const a: number[] = [];
  const b: number[] = [];
  for (let i = 0; i < p.listeners; i++) {
    const bias = p.biasSd * normal(rand);
    a.push(star(p.trueA + bias + p.noiseSd * normal(rand)));
    b.push(star(p.trueB + bias + p.noiseSd * normal(rand)));
  }
  return { a, b };
}

export type Analysis = {
  a: Interval;
  b: Interval;
  /** B minus A, using each listener's own pair of ratings. */
  paired: Interval;
  /** Half-width of the interval for B minus A if two separate groups of listeners had rated one system each. */
  unpairedHalf: number;
  /** Which system the paired interval favours: B or A when it excludes zero, otherwise 'none'. */
  verdict: 'B' | 'A' | 'none';
};

export function analyse(r: Ratings): Analysis {
  const n = r.a.length;
  const a = ci95(r.a);
  const b = ci95(r.b);
  const paired = ci95(r.b.map((v, i) => v - r.a[i]));
  const unpairedHalf = (t975(2 * n - 2) * Math.sqrt(sd(r.a) ** 2 + sd(r.b) ** 2)) / Math.sqrt(n);
  const verdict = paired.lo > 0 ? 'B' : paired.hi < 0 ? 'A' : 'none';
  return { a, b, paired, unpairedHalf, verdict };
}

/** In `tests` repeated simulated tests, how often does the paired interval favour B, favour A, or stay inconclusive? */
export function repeatTests(p: SimParams, tests: number, seedBase = 1000): { B: number; A: number; none: number } {
  const tally = { B: 0, A: 0, none: 0 };
  for (let t = 0; t < tests; t++) tally[analyse(simulateTest(p, seedBase + t)).verdict]++;
  return tally;
}
