/**
 * A tiny recommender sandbox on an invented ratings table: popularity, item-item similarity and matrix factorisation,
 * scored by leave-one-out hit rate. Plus a small feedback-loop simulation. Pure functions, no DOM.
 */
import { mulberry32 } from './trees';

export const N_USERS = 12;
export const N_ITEMS = 14;
export const TOP_N = 3;

/** An invented catalogue. group: 0 action and adventure, 1 gentle and cosy, 2 a crowd-pleaser both groups tend to like. */
export const ITEMS: { name: string; group: 0 | 1 | 2 }[] = [
  { name: 'Rocket Rally', group: 0 },
  { name: 'Moon Base Zero', group: 0 },
  { name: 'Laser Chase', group: 0 },
  { name: 'Robot Uprising', group: 0 },
  { name: 'Dino Dash', group: 2 },
  { name: 'Baking Contest', group: 1 },
  { name: 'Village Vet', group: 1 },
  { name: 'Garden Club', group: 1 },
  { name: 'Tea Shop Tales', group: 1 },
  { name: 'Pet Parade', group: 2 },
  { name: 'Star Pilots', group: 0 },
  { name: 'Quiet Lake', group: 1 },
  { name: 'Cave Quest', group: 0 },
  { name: 'Puppy School', group: 1 },
];

export type Ratings = (number | null)[][];

function gaussian(rng: () => number): number {
  const u = Math.max(rng(), 1e-12);
  // Rounded so that the last-digit differences between the server's and the browser's Math.log and Math.cos cannot change a result.
  return Math.round(Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng()) * 1e9) / 1e9;
}

/**
 * An invented table of 1 to 5 ratings with about half the cells blank. Each user leans towards action, cosy films or a mix,
 * crowd-pleasers are rated by more people, and every user has at least five ratings.
 */
export function makeRatings(seed: number): Ratings {
  const rng = mulberry32(seed * 7919 + 13);
  const loading = ITEMS.map((it) => (it.group === 0 ? [1, -0.5] : it.group === 1 ? [-0.5, 1] : [0.5, 0.5]));
  const bias = ITEMS.map((it) => (it.group === 2 ? 0.5 : 0));
  const exposure = ITEMS.map((it) => (it.group === 2 ? 0.8 : 0.4));
  const users = Array.from({ length: N_USERS }, (_, u) => {
    const kind = u % 3; // action fan, cosy fan, mixed
    const a = kind === 0 ? 1 : kind === 1 ? -0.3 : 0.4;
    const c = kind === 0 ? -0.3 : kind === 1 ? 1 : 0.4;
    return [a + 0.25 * gaussian(rng), c + 0.25 * gaussian(rng)];
  });
  const rows: Ratings = [];
  for (let u = 0; u < N_USERS; u++) {
    let row: (number | null)[] = [];
    for (let attempt = 0; attempt < 50; attempt++) {
      row = ITEMS.map((_, i) => {
        if (rng() > exposure[i]) return null;
        const raw = 3 + 1.2 * (users[u][0] * loading[i][0] + users[u][1] * loading[i][1]) + bias[i] + 0.5 * gaussian(rng);
        return Math.max(1, Math.min(5, Math.round(raw)));
      });
      if (row.filter((v) => v !== null).length >= 5) break;
    }
    rows.push(row);
  }
  return rows;
}

export type Method = 'popularity' | 'itemitem' | 'mf';
export const METHOD_LABEL: Record<Method, string> = {
  popularity: 'Most popular',
  itemitem: 'Item-item similarity',
  mf: 'Matrix factorisation',
};

export const LIKE = 4;

/** How many people gave each item a rating of 4 or more. */
export function likeCounts(r: Ratings): number[] {
  return ITEMS.map((_, i) => r.reduce((s, row) => s + (row[i] !== null && (row[i] as number) >= LIKE ? 1 : 0), 0));
}

/** Adjusted cosine similarity between items: ratings are centred on each user's own average, then compared over users who rated both. */
export function itemSimilarity(r: Ratings): number[][] {
  const means = r.map((row) => {
    const v = row.filter((x): x is number => x !== null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
  });
  const sim = ITEMS.map(() => ITEMS.map(() => 0));
  for (let i = 0; i < ITEMS.length; i++) {
    for (let j = 0; j < ITEMS.length; j++) {
      if (i === j) continue;
      let dot = 0;
      let ni = 0;
      let nj = 0;
      let common = 0;
      for (let u = 0; u < r.length; u++) {
        const a = r[u][i];
        const b = r[u][j];
        if (a === null || b === null) continue;
        common++;
        const da = a - means[u];
        const db = b - means[u];
        dot += da * db;
        ni += da * da;
        nj += db * db;
      }
      sim[i][j] = common >= 2 && ni > 0 && nj > 0 ? dot / Math.sqrt(ni * nj) : 0;
    }
  }
  return sim;
}

export type MfModel = { mu: number; bu: number[]; bi: number[]; p: number[][]; q: number[][]; k: number };

/**
 * Matrix factorisation by stochastic gradient descent on the observed ratings only:
 * rating is about mu + user bias + item bias + (user factors . item factors). k = 0 keeps only the biases.
 */
export function trainMf(r: Ratings, k: number, opts: { epochs?: number; lr?: number; reg?: number; seed?: number } = {}): MfModel {
  const { epochs = 200, lr = 0.02, reg = 0.1, seed = 1 } = opts;
  const rng = mulberry32(seed);
  const obs: [number, number, number][] = [];
  r.forEach((row, u) => row.forEach((v, i) => v !== null && obs.push([u, i, v])));
  const mu = obs.length ? obs.reduce((s, o) => s + o[2], 0) / obs.length : 3;
  const bu = new Array(r.length).fill(0);
  const bi = new Array(ITEMS.length).fill(0);
  const p = r.map(() => Array.from({ length: k }, () => 0.1 * gaussian(rng)));
  const q = ITEMS.map(() => Array.from({ length: k }, () => 0.1 * gaussian(rng)));
  const order = obs.map((_, n) => n);
  for (let e = 0; e < epochs; e++) {
    for (let n = order.length - 1; n > 0; n--) {
      const m = Math.floor(rng() * (n + 1));
      [order[n], order[m]] = [order[m], order[n]];
    }
    for (const n of order) {
      const [u, i, v] = obs[n];
      let pred = mu + bu[u] + bi[i];
      for (let f = 0; f < k; f++) pred += p[u][f] * q[i][f];
      const err = v - pred;
      bu[u] += lr * (err - reg * bu[u]);
      bi[i] += lr * (err - reg * bi[i]);
      for (let f = 0; f < k; f++) {
        const pu = p[u][f];
        const qi = q[i][f];
        p[u][f] += lr * (err * qi - reg * pu);
        q[i][f] += lr * (err * pu - reg * qi);
      }
    }
  }
  return { mu, bu, bi, p, q, k };
}

export function mfPredict(m: MfModel, u: number, i: number): number {
  let s = m.mu + m.bu[u] + m.bi[i];
  for (let f = 0; f < m.k; f++) s += m.p[u][f] * m.q[i][f];
  return s;
}

export type Scorer = (user: number) => number[];

/** Build a scoring function for one method from a training table. A higher score ranks higher. */
export function makeScorer(train: Ratings, method: Method, k = 2, seed = 1): Scorer {
  const pop = likeCounts(train);
  if (method === 'popularity') return () => pop.map((c) => c);
  if (method === 'itemitem') {
    const sim = itemSimilarity(train);
    return (u) =>
      ITEMS.map((_, i) => {
        let num = 0;
        let den = 0;
        train[u].forEach((v, j) => {
          if (v === null || sim[i][j] <= 0) return;
          num += sim[i][j] * v;
          den += sim[i][j];
        });
        // No similar item has been rated: fall back to a very low score plus the popularity count, so ties are broken by popularity.
        return den > 0 ? num / den + 0.001 * pop[i] : -10 + 0.001 * pop[i];
      });
  }
  const model = trainMf(train, k, { seed });
  return (u) => ITEMS.map((_, i) => mfPredict(model, u, i));
}

/** Items the user has not rated in the table, ranked best first, with ties broken by popularity and then item number. */
export function recommend(train: Ratings, scorer: Scorer, user: number, n = TOP_N): number[] {
  const s = scorer(user);
  const pop = likeCounts(train);
  return ITEMS.map((_, i) => i)
    .filter((i) => train[user][i] === null)
    .sort((a, b) => s[b] - s[a] || pop[b] - pop[a] || a - b)
    .slice(0, n);
}

export type Split = { train: Ratings; heldOut: (number | null)[] };

/** Hide each user's highest rating (4 or above, first such item on ties) and keep the rest as training data. Users with fewer than five ratings or no liked item hide nothing. */
export function leaveOneOut(r: Ratings): Split {
  const heldOut: (number | null)[] = [];
  const train = r.map((row) => row.slice());
  r.forEach((row, u) => {
    const count = row.filter((v) => v !== null).length;
    let best = -1;
    row.forEach((v, i) => {
      if (v !== null && v >= LIKE && (best < 0 || v > (row[best] as number))) best = i;
    });
    if (count >= 5 && best >= 0) {
      heldOut.push(best);
      train[u][best] = null;
    } else heldOut.push(null);
  });
  return { train, heldOut };
}

export type Eval = { hits: number; users: number; rate: number; perUser: { user: number; heldOut: number; recs: number[]; hit: boolean }[] };

/** Leave-one-out hit rate at TOP_N: the share of users whose hidden favourite appears in their top recommendations. */
export function evaluate(r: Ratings, method: Method, k = 2, n = TOP_N, seed = 1): Eval {
  const { train, heldOut } = leaveOneOut(r);
  const scorer = makeScorer(train, method, k, seed);
  const perUser: Eval['perUser'] = [];
  heldOut.forEach((h, u) => {
    if (h === null) return;
    const recs = recommend(train, scorer, u, n);
    perUser.push({ user: u, heldOut: h, recs, hit: recs.includes(h) });
  });
  const hits = perUser.filter((p) => p.hit).length;
  return { hits, users: perUser.length, rate: perUser.length ? hits / perUser.length : 0, perUser };
}

/** The chance a random pick of n unseen items contains the hidden one, averaged over users. A floor to compare against. */
export function randomHitRate(r: Ratings, n = TOP_N): number {
  const { train, heldOut } = leaveOneOut(r);
  let s = 0;
  let c = 0;
  heldOut.forEach((h, u) => {
    if (h === null) return;
    const unseen = train[u].filter((v) => v === null).length;
    s += Math.min(1, n / unseen);
    c++;
  });
  return c ? s / c : 0;
}

/* ---------- feedback loop ---------- */

export const LOOP_ITEMS = 10;
/** True appeal of each item: the chance a person who is shown it clicks it. Item 9 is genuinely the best. */
export const LOOP_APPEAL = Array.from({ length: LOOP_ITEMS }, (_, i) => 0.3 + 0.02 * i);

export type LoopRun = { impressions: number[][]; clicks: number[][]; bestShownShare: number[] };

/**
 * Each round, 20 people are each shown 3 items. The system shows the 3 items with the most clicks so far
 * (ties broken at random), except that a share `exploration` of the slots is filled with random items.
 * Returns cumulative impressions and clicks after every round (index 0 is before any round).
 */
export type LoopRank = 'clicks' | 'rate';

export function simulateLoop(seed: number, exploration: number, rounds = 100, peoplePerRound = 20, rank: LoopRank = 'rate'): LoopRun {
  const rng = mulberry32(seed * 104729 + 7);
  const imp = new Array(LOOP_ITEMS).fill(0);
  const clk = new Array(LOOP_ITEMS).fill(0);
  const impressions = [imp.slice()];
  const clicks = [clk.slice()];
  const bestShownShare = [0];
  for (let t = 0; t < rounds; t++) {
    const tie = Array.from({ length: LOOP_ITEMS }, () => rng());
    // 'clicks' ranks by raw click counts; 'rate' ranks by clicks per showing with a cautious starting guess of about 10%.
    const score = (i: number) => (rank === 'clicks' ? clk[i] : (clk[i] + 1) / (imp[i] + 10));
    const ranked = Array.from({ length: LOOP_ITEMS }, (_, i) => i).sort((a, b) => score(b) - score(a) || tie[b] - tie[a]);
    for (let person = 0; person < peoplePerRound; person++) {
      const shown: number[] = [];
      for (let slot = 0; slot < TOP_N; slot++) {
        let pick = ranked[slot];
        if (rng() < exploration) {
          do pick = Math.floor(rng() * LOOP_ITEMS);
          while (shown.includes(pick));
        }
        shown.push(pick);
      }
      for (const it of shown) {
        imp[it]++;
        if (rng() < LOOP_APPEAL[it]) clk[it]++;
      }
    }
    impressions.push(imp.slice());
    clicks.push(clk.slice());
    const total = imp.reduce((a, b) => a + b, 0);
    bestShownShare.push(imp[LOOP_ITEMS - 1] / total);
  }
  return { impressions, clicks, bestShownShare };
}
