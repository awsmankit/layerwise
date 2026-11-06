/**
 * What if we judge a model by accuracy alone on rare events? Counts, not guesses:
 * a population of clips, a few of which hold a rare event, scored for a do-nothing baseline
 * and for an example detector. The detector's recall and false alarm rate are example settings.
 */

export const POPULATION = 1000;
/** Example detector: finds 80% of events and raises a false alarm on 2% of clips with no event. */
export const exampleDetector = { recall: 0.8, falseAlarmRate: 0.02 } as const;

export type Confusion = { tp: number; fp: number; fn: number; tn: number };

/** The "always no" baseline never raises an alarm. */
export function alwaysNo(events: number, total = POPULATION): Confusion {
  return { tp: 0, fp: 0, fn: events, tn: total - events };
}

/** The example detector's counts, rounded to whole clips. */
export function detector(events: number, total = POPULATION, d: { recall: number; falseAlarmRate: number } = exampleDetector): Confusion {
  const tp = Math.round(d.recall * events);
  const fp = Math.round(d.falseAlarmRate * (total - events));
  return { tp, fp, fn: events - tp, tn: total - events - fp };
}

export const total = (c: Confusion) => c.tp + c.fp + c.fn + c.tn;
export const accuracy = (c: Confusion) => (c.tp + c.tn) / total(c);
/** Share of real events found. 0 when there are no events. */
export const recall = (c: Confusion) => (c.tp + c.fn === 0 ? 0 : c.tp / (c.tp + c.fn));
/** Share of alarms that were real. null when the model never raised an alarm. */
export const precision = (c: Confusion): number | null => (c.tp + c.fp === 0 ? null : c.tp / (c.tp + c.fp));

/** Does accuracy alone prefer the do-nothing baseline? */
export function accuracyPrefersBaseline(events: number): boolean {
  return accuracy(alwaysNo(events)) > accuracy(detector(events));
}

/**
 * The most events (out of POPULATION) for which the baseline still scores higher accuracy than the detector.
 * Found by scanning, so it is always consistent with the counts above.
 */
export function crossoverEvents(): number {
  let last = 0;
  for (let e = 1; e <= POPULATION; e++) if (accuracyPrefersBaseline(e)) last = e;
  return last;
}

export type Cell = 'tp' | 'fn' | 'fp' | 'tn';

function perm(n: number, seed = 5): number[] {
  let a = seed >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const p = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  return p;
}

const ORDER = perm(POPULATION);

/**
 * One state per clip, laid out on a fixed scatter so that adding events never moves the others.
 * The first `events` clips in the scatter order hold an event; the next ones after them are the false alarms.
 */
export function cells(c: Confusion): Cell[] {
  const out: Cell[] = new Array(total(c)).fill('tn');
  const events = c.tp + c.fn;
  ORDER.slice(0, total(c)).forEach((cell, rank) => {
    if (rank < events) out[cell] = rank < c.tp ? 'tp' : 'fn';
    else if (rank - events < c.fp) out[cell] = 'fp';
  });
  return out;
}
