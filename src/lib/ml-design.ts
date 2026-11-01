/*
 * Logic for the ML system-design lesson (systems/ml-system-design-interviews): back-of-envelope
 * estimates used in the worked examples, and the scoring for the design-checklist walkthrough.
 * Every number in the lesson that comes from here is an example with assumed inputs and is
 * unit-tested in ml-design.test.ts.
 */

/* ---------- estimates ---------- */

export const SECONDS_PER_DAY = 86_400;

/** Average and peak requests per second from a daily total and an assumed peak-to-average ratio. */
export function requestRate(dailyRequests: number, peakFactor: number): { average: number; peak: number } {
  const average = dailyRequests / SECONDS_PER_DAY;
  return { average, peak: average * peakFactor };
}

/** Bytes to store `items` embeddings of `dims` numbers each, at `bytesPerValue` bytes per number (4 for float32, 1 for int8). */
export const embeddingBytes = (items: number, dims: number, bytesPerValue: number): number => items * dims * bytesPerValue;

export const GB = 1e9;

/** What an operating point of a detector does to a day of traffic. */
export type Outcome = { positives: number; negatives: number; tp: number; fp: number; fn: number; flagged: number; precision: number };

/** Given a volume, how common the bad class is, and the detector's recall and false-positive rate, count the outcomes. */
export function outcomeAt(volume: number, prevalence: number, recall: number, falsePositiveRate: number): Outcome {
  const positives = volume * prevalence;
  const negatives = volume - positives;
  const tp = positives * recall;
  const fn = positives - tp;
  const fp = negatives * falsePositiveRate;
  const flagged = tp + fp;
  return { positives, negatives, tp, fp, fn, flagged, precision: flagged === 0 ? 0 : tp / flagged };
}

/** Daily cost of an operating point: each missed bad case costs `costMiss`, each false alarm costs `costFalseAlarm`. */
export function dailyCost(o: Outcome, costMiss: number, costFalseAlarm: number): number {
  return o.fn * costMiss + o.fp * costFalseAlarm;
}

/** Milliseconds left in a latency budget after the stages you have already assigned. */
export const budgetLeft = (total: number, stages: number[]): number => total - stages.reduce((a, b) => a + b, 0);

/** The share of candidates kept by a retrieval stage, as a percentage cut: 1 - kept / catalogue. */
export const reductionPercent = (catalogue: number, kept: number): number => (1 - kept / catalogue) * 100;

/* ---------- checklist ---------- */

export const STAGES = [
  { id: 'goal', title: 'Goal and metric' },
  { id: 'data', title: 'Data and labels' },
  { id: 'model', title: 'Baseline and model' },
  { id: 'offline', title: 'Offline evaluation' },
  { id: 'serving', title: 'Serving' },
  { id: 'launch', title: 'Launch' },
  { id: 'monitor', title: 'Monitoring and feedback' },
] as const;
export type StageId = (typeof STAGES)[number]['id'];

/** core: a strong answer includes it. fine: reasonable, not essential. trap: a common mistake. */
export type Kind = 'core' | 'fine' | 'trap';

export type Option = { id: string; text: string; kind: Kind; why: string };
export type StageQuestion = { stage: StageId; question: string; options: Option[] };
export type DesignScenario = { id: string; name: string; brief: string; stages: StageQuestion[] };

export type StageScore = {
  stage: StageId;
  coreTotal: number;
  coreHit: number;
  trapsHit: number;
  /** Core options the learner missed. */
  missed: Option[];
  /** Traps the learner picked. */
  traps: Option[];
  verdict: 'strong' | 'gaps' | 'risky';
};

export function scoreStage(q: StageQuestion, picked: ReadonlySet<string>): StageScore {
  const core = q.options.filter((o) => o.kind === 'core');
  const hit = core.filter((o) => picked.has(o.id));
  const traps = q.options.filter((o) => o.kind === 'trap' && picked.has(o.id));
  const missed = core.filter((o) => !picked.has(o.id));
  const enough = hit.length >= core.length / 2;
  let verdict: StageScore['verdict'];
  if (traps.length >= 2) verdict = 'risky';
  else if (traps.length === 1) verdict = enough ? 'gaps' : 'risky';
  else if (missed.length === 0) verdict = 'strong';
  else verdict = enough ? 'gaps' : 'risky';
  return { stage: q.stage, coreTotal: core.length, coreHit: hit.length, trapsHit: traps.length, missed, traps, verdict };
}

export type Scorecard = { stages: StageScore[]; points: number; max: number; percent: number };

/** One point per core option picked, minus one per trap picked, never below zero for a stage. */
export function scoreScenario(s: DesignScenario, picks: Record<string, ReadonlySet<string>>): Scorecard {
  const stages = s.stages.map((q) => scoreStage(q, picks[q.stage] ?? new Set()));
  const points = stages.reduce((a, st) => a + Math.max(0, st.coreHit - st.trapsHit), 0);
  const max = stages.reduce((a, st) => a + st.coreTotal, 0);
  return { stages, points, max, percent: max === 0 ? 0 : Math.round((points / max) * 100) };
}

/** A fixed, repeatable shuffle (so core options are not always listed first). */
export function shuffled<T>(items: readonly T[], seed: number): T[] {
  const out = items.slice();
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
