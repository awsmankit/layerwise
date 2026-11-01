/**
 * Logic for the review-queue simulator in systems/human-in-the-loop-design.
 *
 * One scripted shift: an agent drafts decisions (think refund replies), each with a
 * risk score. Items at or above a threshold go to a human queue, the rest are
 * approved automatically. All numbers are ILLUSTRATIVE: the error curve, the
 * review time and the catch rate are example values, not measurements.
 *
 * Errors are expected values (the sum of each item's probability of being wrong),
 * so the result is the same every time. Arrival order is shuffled with a fixed seed.
 */

export const SHIFT_MIN = 480;
/** The riskiest item has this chance of being wrong. */
export const P_MAX = 0.6;
/** How sharply risk is concentrated in a few items: p = P_MAX * u^SHARP for u spread evenly over 0..1. */
export const SHARP = 4;
/** A review that takes longer than this to start counts as breaching the example service level. */
export const SLA_MIN = 30;

export type Order = 'risk' | 'fifo';

export type QueueConfig = {
  /** Items per hour. */
  rate: number;
  reviewers: number;
  /** Minutes one reviewer spends on one item. */
  minutes: number;
  /** Send an item to a person when its displayed risk is at or above this. */
  threshold: number;
  /** Chance a reviewer spots a wrong item (0 to 1). */
  catchRate: number;
  order: Order;
  /** The displayed score claims half the true chance of error. The ranking is unchanged. */
  overconfident: boolean;
};

export const DEFAULT_QUEUE: QueueConfig = { rate: 60, reviewers: 2, minutes: 3, threshold: 0.1, catchRate: 0.9, order: 'risk', overconfident: false };

export type Item = {
  index: number;
  /** Minute of arrival within the shift. */
  at: number;
  /** True chance the draft is wrong. */
  p: number;
  /** Risk score shown to the system and the dashboard. */
  shown: number;
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The shift's items: risks spread evenly, then shuffled with a fixed seed so arrival order is mixed. */
export function makeItems(rate: number, overconfident: boolean): Item[] {
  const n = Math.round((rate * SHIFT_MIN) / 60);
  const rand = mulberry32(2024);
  const u = Array.from({ length: n }, (_, i) => (i + 0.5) / n);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [u[i], u[j]] = [u[j], u[i]];
  }
  return u.map((x, i) => {
    const p = P_MAX * Math.pow(x, SHARP);
    return { index: i, at: (i * SHIFT_MIN) / n, p, shown: overconfident ? p / 2 : p };
  });
}

export type QueueResult = {
  total: number;
  sent: number;
  auto: number;
  reviewed: number;
  /** Sent to the queue but still waiting when the shift ends. */
  backlog: number;
  /** Fraction of reviewer time in use. */
  utilisation: number;
  /** Load if every sent item had to be reviewed in the shift: sent x minutes / (reviewers x shift). Above 1 the queue cannot clear. */
  load: number;
  meanWait: number;
  breached: number;
  expectedErrors: number;
  autoErrors: number;
  caught: number;
  missedInReview: number;
  /** Wrong drafts that reach customers: approved automatically, or missed by a reviewer. */
  reachCustomers: number;
  /** What the dashboard would predict for reachCustomers if it trusted the displayed scores. */
  predicted: number;
  /** Queue length at the end of each 30-minute step. */
  series: number[];
  /** Counts per displayed-risk bin (20 bins from 0 to P_MAX), split by route. */
  bins: { lo: number; hi: number; auto: number; sent: number }[];
};

export const BIN_COUNT = 20;

export function runQueue(c: QueueConfig, items: Item[] = makeItems(c.rate, c.overconfident)): QueueResult {
  const sentItems = items.filter((it) => it.shown >= c.threshold);
  const auto = items.filter((it) => it.shown < c.threshold);

  // Event simulation of k reviewers pulling from the queue.
  const free = Array.from({ length: Math.max(1, c.reviewers) }, () => 0);
  const waiting: Item[] = [];
  const reviewedItems: { item: Item; start: number }[] = [];
  let next = 0; // pointer into sentItems (they are in arrival order)
  let busy = 0;
  const starts: number[] = [];

  for (;;) {
    // The reviewer who frees up first takes the next item.
    let r = 0;
    for (let i = 1; i < free.length; i++) if (free[i] < free[r]) r = i;
    let now = free[r];
    while (next < sentItems.length && sentItems[next].at <= now) waiting.push(sentItems[next++]);
    if (waiting.length === 0) {
      if (next >= sentItems.length) break;
      now = Math.max(now, sentItems[next].at);
      while (next < sentItems.length && sentItems[next].at <= now) waiting.push(sentItems[next++]);
    }
    if (now >= SHIFT_MIN) break;
    let pick = 0;
    if (c.order === 'risk') {
      for (let i = 1; i < waiting.length; i++) if (waiting[i].shown > waiting[pick].shown) pick = i;
    }
    const [item] = waiting.splice(pick, 1);
    reviewedItems.push({ item, start: now });
    starts.push(now);
    free[r] = now + c.minutes;
    busy += c.minutes;
  }

  const reviewedSet = new Set(reviewedItems.map((x) => x.item.index));
  const backlogItems = sentItems.filter((it) => !reviewedSet.has(it.index));
  const waits = reviewedItems.map((x) => x.start - x.item.at);
  const meanWait = waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : 0;
  const breached = waits.filter((w) => w > SLA_MIN).length + backlogItems.filter((it) => SHIFT_MIN - it.at > SLA_MIN).length;

  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const reviewedErrors = sum(reviewedItems.map((x) => x.item.p));
  const autoErrors = sum(auto.map((it) => it.p));
  const caught = reviewedErrors * c.catchRate;
  const missedInReview = reviewedErrors - caught;
  const predicted = sum(auto.map((it) => it.shown)) + sum(reviewedItems.map((x) => x.item.shown)) * (1 - c.catchRate);

  // Queue length every 30 minutes: items that have arrived but not started.
  const series: number[] = [];
  for (let t = 30; t <= SHIFT_MIN; t += 30) {
    const arrived = sentItems.filter((it) => it.at <= t).length;
    const started = starts.filter((s) => s <= t).length;
    series.push(Math.max(0, arrived - started));
  }

  const width = P_MAX / BIN_COUNT;
  const bins = Array.from({ length: BIN_COUNT }, (_, i) => ({ lo: i * width, hi: (i + 1) * width, auto: 0, sent: 0 }));
  for (const it of items) {
    const b = Math.min(BIN_COUNT - 1, Math.floor(it.shown / width + 1e-9));
    if (it.shown >= c.threshold) bins[b].sent++;
    else bins[b].auto++;
  }

  return {
    total: items.length,
    sent: sentItems.length,
    auto: auto.length,
    reviewed: reviewedItems.length,
    backlog: backlogItems.length,
    utilisation: Math.min(1, busy / (free.length * SHIFT_MIN)),
    load: (sentItems.length * c.minutes) / (free.length * SHIFT_MIN),
    meanWait,
    breached,
    expectedErrors: sum(items.map((it) => it.p)),
    autoErrors,
    caught,
    missedInReview,
    reachCustomers: autoErrors + missedInReview,
    predicted,
    series,
    bins,
  };
}

/** Sample size to estimate an error rate p to within +/- e at 95% confidence (normal approximation). */
export function auditSampleSize(p: number, e: number): number {
  return Math.ceil((1.96 * 1.96 * p * (1 - p)) / (e * e));
}

/** The hand-checkable reliability table used in the lesson: 1,000 labelled reviews in four score bands. EXAMPLE numbers. */
export type Band = { label: string; items: number; wrong: number; stated: number };

export const EXAMPLE_BANDS: Band[] = [
  { label: '0 to 0.05', items: 520, wrong: 21, stated: 0.025 },
  { label: '0.05 to 0.15', items: 270, wrong: 38, stated: 0.1 },
  { label: '0.15 to 0.35', items: 150, wrong: 54, stated: 0.25 },
  { label: '0.35 and above', items: 60, wrong: 37, stated: 0.55 },
];

/** Observed error rate per band, the totals, what the stated scores predict, and the result of reviewing the top `reviewTop` bands. */
export function reliability(bands: Band[], reviewTop: number, catchRate: number) {
  const total = bands.reduce((a, b) => a + b.items, 0);
  const wrong = bands.reduce((a, b) => a + b.wrong, 0);
  const predicted = bands.reduce((a, b) => a + b.items * b.stated, 0);
  const reviewed = bands.slice(bands.length - reviewTop);
  const autoBands = bands.slice(0, bands.length - reviewTop);
  const reviewedItems = reviewed.reduce((a, b) => a + b.items, 0);
  const reviewedWrong = reviewed.reduce((a, b) => a + b.wrong, 0);
  const autoWrong = autoBands.reduce((a, b) => a + b.wrong, 0);
  const reach = autoWrong + reviewedWrong * (1 - catchRate);
  return {
    observed: bands.map((b) => b.wrong / b.items),
    total,
    wrong,
    predicted,
    reviewedItems,
    reviewedShare: reviewedItems / total,
    errorsInReviewedShare: wrong === 0 ? 0 : reviewedWrong / wrong,
    reach,
    reachRate: reach / total,
  };
}
