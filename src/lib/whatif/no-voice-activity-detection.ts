/**
 * What if the device runs the big model on silence too? An always-listening device has a cheap voice-activity
 * detector (VAD, a tiny model that only decides "is someone speaking?") that gates an expensive speech recogniser.
 * All hardware figures below are GENERIC EXAMPLES, not measurements of any real device:
 *   the big recogniser draws 40 mW while it runs, the detector 0.3 mW all the time, the microphone and everything
 *   else 0.5 mW, and the battery holds 1.1 Wh (about 300 mAh at 3.7 V).
 * Two things the user can change: the share of the day that contains speech, and the detector's miss rate (the share of
 * speech it fails to notice, so the recogniser never hears it). The detector also opens the gate by mistake on a small
 * share of quiet time (a fixed example). Every number is computed here.
 */

export const P_BIG_MW = 40;
export const P_VAD_MW = 0.3;
export const P_BASE_MW = 0.5;
export const BATTERY_WH = 1.1;
export const FALSE_ALARM = 0.03;
export const WORDS_PER_SEC = 2.5;
export const SECONDS_PER_DAY = 86400;
export const CELLS = 60;

/** Share of the day the big recogniser is running. Without a gate it is always running. */
export function dutyCycle(speech: number, miss: number, gated: boolean, falseAlarm = FALSE_ALARM): number {
  if (!gated) return 1;
  return speech * (1 - miss) + (1 - speech) * falseAlarm;
}

/** Average power in milliwatts. */
export function averagePowerMw(duty: number, gated: boolean): number {
  return P_BASE_MW + (gated ? P_VAD_MW : 0) + duty * P_BIG_MW;
}

export function energyPerDayMWh(speech: number, miss: number, gated: boolean): number {
  return averagePowerMw(dutyCycle(speech, miss, gated), gated) * 24;
}

/** Battery life in hours: battery energy in mWh divided by average power in mW. */
export function batteryHours(speech: number, miss: number, gated: boolean): number {
  return (BATTERY_WH * 1000) / averagePowerMw(dutyCycle(speech, miss, gated), gated);
}

export const wordsPerDay = (speech: number) => speech * SECONDS_PER_DAY * WORDS_PER_SEC;
export const missedWordsPerDay = (speech: number, miss: number, gated: boolean) => (gated ? wordsPerDay(speech) * miss : 0);

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

export const SENTENCE =
  'turn on the kitchen light and set a timer for ten minutes then remind me to call mum at six and play the news'.split(' ');

export type Cell = {
  /** Someone is speaking in this second. */
  speech: boolean;
  /** The gate is open, so the big recogniser runs. */
  open: boolean;
  /** Speech the detector failed to notice. */
  missed: boolean;
  /** The gate opened on quiet by mistake. */
  falseAlarm: boolean;
  /** The word spoken in this second (speech only). */
  word: string | null;
};

/**
 * One example minute, one cell per second. Speech comes in clumps (cells are ranked by a smoothed random score and the lowest
 * ones are speech, so more speech only ever adds cells). Missed and false-alarm cells come from fixed random numbers, so raising the
 * miss rate only ever adds missed cells.
 */
export function makeMinute(speech: number, miss: number, gated: boolean, seed = 6): Cell[] {
  const r = rng(seed);
  const raw = Array.from({ length: CELLS }, () => r());
  const smooth = raw.map((_, i) => {
    let s = 0;
    let c = 0;
    for (let k = -4; k <= 4; k++) {
      const j = i + k;
      if (j >= 0 && j < CELLS) {
        s += raw[j];
        c++;
      }
    }
    return Math.round((s / c) * 1e9) / 1e9;
  });
  const order = smooth.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v || a.i - b.i);
  const nSpeech = Math.round(speech * CELLS);
  const isSpeech = new Set(order.slice(0, nSpeech).map((o) => o.i));
  const missU = Array.from({ length: CELLS }, () => r());
  const alarmU = Array.from({ length: CELLS }, () => r());
  let w = 0;
  return Array.from({ length: CELLS }, (_, i) => {
    const sp = isSpeech.has(i);
    const word = sp ? SENTENCE[w++ % SENTENCE.length] : null;
    const missed = gated && sp && missU[i] < miss;
    const falseAlarm = gated && !sp && alarmU[i] < FALSE_ALARM;
    const open = gated ? (sp && !missed) || falseAlarm : true;
    return { speech: sp, open, missed, falseAlarm, word };
  });
}

export function minuteCounts(cells: Cell[]) {
  const spoken = cells.filter((c) => c.speech).length;
  const missed = cells.filter((c) => c.missed).length;
  const running = cells.filter((c) => c.open).length;
  const onSilence = cells.filter((c) => c.open && !c.speech).length;
  return { spoken, missed, heard: spoken - missed, running, onSilence };
}
