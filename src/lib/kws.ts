/*
 * A toy keyword spotter for the "TinyML wake-word detector" lesson. It is a teaching stand-in, not a trained model.
 *
 * What is real: the front end (frames of 512 samples every 320, a Hann window, a Fourier transform, 40 mel bands,
 * log scaling) uses the same functions as the audio lessons, and the decision logic after the model (smoothing the
 * scores over time, a threshold, a refractory period, and scoring against labelled events) is how a streaming
 * detector is judged. What is a stand-in: the "model" is a matched filter, a fixed pattern of log-mel values
 * built from one clean example of the keyword, compared with each recent stretch of audio. A real detector learns
 * its weights from thousands of recordings. The sounds are synthesised here (no recordings of anyone), so the
 * numbers are properties of this toy, not of any product.
 */

import { applyFilterbank, claps, hann, melFilterbank, powerSpectrum, powerToDb, TWO_PI } from './audio-dsp';
import { mulberry32, type Rng } from './realtime-budget';

export const KWS_RATE = 16000;
export const WIN = 512; // 32 ms
export const HOP = 320; // 20 ms
export const BANDS = 40;
const F_MIN = 50;
const F_MAX = 8000;

export const hopSeconds = HOP / KWS_RATE;
/** The time, in seconds, at which frame `i` ends (the newest sample it has seen). */
export const frameEndSec = (i: number): number => (i * HOP + WIN) / KWS_RATE;

/* ---------- synthesised sounds ---------- */

export type Formants = readonly [number, number, number];
/** Typical textbook-style resonances (Hz) for four vowels. Teaching values, not measurements of any speaker. */
export const VOWELS: Record<'ah' | 'ee' | 'oo' | 'ae', Formants> = {
  ah: [730, 1090, 2440],
  ee: [270, 2290, 3010],
  oo: [300, 870, 2240],
  ae: [660, 1720, 2410],
};
const BW: Formants = [80, 100, 160];
const GAIN: Formants = [1, 0.7, 0.4];

export type Key = { ms: number; f: Formants };

/**
 * A voiced, vowel-like sound whose three resonances glide between key frames: harmonics of a gliding pitch
 * shaped by three resonance peaks, faded in and out. Returns samples with a peak of 1.
 */
export function formantSound(keys: readonly Key[], f0Start: number, f0End: number, rate = KWS_RATE): Float32Array {
  const total = keys[keys.length - 1].ms;
  const n = Math.round((total / 1000) * rate);
  const out = new Float32Array(n);
  const BLOCK = 32;
  let phase = 0;
  const amps = new Float64Array(80);
  let seg = 0;
  for (let b = 0; b < n; b += BLOCK) {
    const tMs = ((b + BLOCK / 2) / rate) * 1000;
    while (seg < keys.length - 2 && tMs > keys[seg + 1].ms) seg++;
    const k0 = keys[seg];
    const k1 = keys[seg + 1];
    const x = Math.min(1, Math.max(0, (tMs - k0.ms) / Math.max(1, k1.ms - k0.ms)));
    const f0 = f0Start + ((f0End - f0Start) * tMs) / total;
    const fm = [0, 1, 2].map((j) => k0.f[j] + (k1.f[j] - k0.f[j]) * x);
    const maxH = Math.min(79, Math.floor(5000 / f0));
    for (let h = 1; h <= maxH; h++) {
      const f = h * f0;
      let env = 0;
      for (let j = 0; j < 3; j++) env += GAIN[j] / (1 + ((f - fm[j]) / BW[j]) ** 2);
      amps[h] = env / h ** 0.7;
    }
    const end = Math.min(n, b + BLOCK);
    for (let i = b; i < end; i++) {
      phase += (TWO_PI * (f0Start + ((f0End - f0Start) * i) / n)) / rate;
      let s = 0;
      for (let h = 1; h <= maxH; h++) s += amps[h] * Math.sin(h * phase);
      out[i] = s;
    }
  }
  return normalisePeak(fade(out, rate, 0.025));
}

function fade(x: Float32Array, rate: number, seconds: number): Float32Array {
  const m = Math.min(Math.floor(x.length / 2), Math.round(seconds * rate));
  for (let i = 0; i < m; i++) {
    const g = 0.5 - 0.5 * Math.cos((Math.PI * i) / m);
    x[i] *= g;
    x[x.length - 1 - i] *= g;
  }
  return x;
}

function normalisePeak(x: Float32Array): Float32Array {
  let p = 0;
  for (const v of x) p = Math.max(p, Math.abs(v));
  if (p > 0) for (let i = 0; i < x.length; i++) x[i] /= p;
  return x;
}

export const rms = (x: ArrayLike<number>): number => {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return x.length ? Math.sqrt(s / x.length) : 0;
};

/** The keyword: a two-vowel glide, "ah" sliding to "ee", about 0.65 seconds at normal speed. */
export const KEYWORD_KEYS: Key[] = [
  { ms: 0, f: VOWELS.ah },
  { ms: 180, f: VOWELS.ah },
  { ms: 450, f: VOWELS.ee },
  { ms: 650, f: VOWELS.ee },
];

const scaleKeys = (keys: readonly Key[], speed: number): Key[] => keys.map((k) => ({ ms: k.ms / speed, f: k.f }));

/** The keyword as sound, at a given speed (1 is normal) and pitch. */
export function keywordSound(f0 = 140, speed = 1, rate = KWS_RATE): Float32Array {
  return formantSound(scaleKeys(KEYWORD_KEYS, speed), f0, f0 * 0.95, rate);
}

export type DistractorKind = 'reverse' | 'ah-oo' | 'ah' | 'oo-ee' | 'babble' | 'claps' | 'hiss' | 'beep' | 'knock';

export const DISTRACTOR_LABEL: Record<DistractorKind, string> = {
  reverse: 'ee-ah (the keyword backwards)',
  'ah-oo': 'ah-oo',
  ah: 'ah on its own',
  'oo-ee': 'oo-ee',
  babble: 'babble (random vowels)',
  claps: 'claps',
  hiss: 'hiss',
  beep: 'beeps',
  knock: 'knock',
};

function noiseBurst(rng: Rng, seconds: number, rate: number, kind: 'hiss' | 'knock'): Float32Array {
  const n = Math.round(seconds * rate);
  const out = new Float32Array(n);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const w = rng() * 2 - 1;
    const t = i / rate;
    if (kind === 'hiss') {
      const hp = w - prev; // first difference: a crude high-pass
      prev = w;
      const env = Math.min(1, t / 0.03) * Math.exp(-Math.max(0, t - 0.1) / 0.12);
      out[i] = hp * env;
    } else {
      const env = Math.exp(-t / 0.045);
      out[i] = (Math.sin(TWO_PI * 110 * t) * 1.2 + w * 0.5) * env;
    }
  }
  return normalisePeak(out);
}

function beeps(rate: number): Float32Array {
  const dur = 0.12;
  const gap = 0.1;
  const n = Math.round((dur * 2 + gap) * rate);
  const out = new Float32Array(n);
  for (const start of [0, dur + gap]) {
    for (let i = 0; i < Math.round(dur * rate); i++) {
      const g = Math.sin((Math.PI * i) / Math.round(dur * rate)) ** 0.5;
      out[Math.round(start * rate) + i] = g * Math.sin((TWO_PI * 1000 * i) / rate);
    }
  }
  return out;
}

function babble(rng: Rng, rate: number): Float32Array {
  const names = Object.keys(VOWELS) as (keyof typeof VOWELS)[];
  const keys: Key[] = [];
  let t = 0;
  const count = 5 + Math.floor(rng() * 3);
  for (let i = 0; i < count; i++) {
    const v = VOWELS[names[Math.floor(rng() * names.length)]];
    keys.push({ ms: t, f: v });
    t += 110 + rng() * 120;
    keys.push({ ms: t, f: v });
    t += 50 + rng() * 40;
  }
  const f0 = 110 + rng() * 120;
  return formantSound(keys, f0, f0 * (0.85 + rng() * 0.3), rate);
}

/** A sound that is not the keyword. */
export function distractorSound(kind: DistractorKind, rng: Rng, rate = KWS_RATE): Float32Array {
  const f0 = 105 + rng() * 125;
  switch (kind) {
    case 'reverse':
      return formantSound(
        [
          { ms: 0, f: VOWELS.ee },
          { ms: 180, f: VOWELS.ee },
          { ms: 450, f: VOWELS.ah },
          { ms: 650, f: VOWELS.ah },
        ],
        f0,
        f0 * 0.95,
        rate,
      );
    case 'ah-oo':
      return formantSound(
        [
          { ms: 0, f: VOWELS.ah },
          { ms: 180, f: VOWELS.ah },
          { ms: 450, f: VOWELS.oo },
          { ms: 650, f: VOWELS.oo },
        ],
        f0,
        f0 * 0.95,
        rate,
      );
    case 'ah':
      return formantSound(
        [
          { ms: 0, f: VOWELS.ah },
          { ms: 420, f: VOWELS.ah },
        ],
        f0,
        f0 * 0.92,
        rate,
      );
    case 'oo-ee':
      return formantSound(
        [
          { ms: 0, f: VOWELS.oo },
          { ms: 200, f: VOWELS.oo },
          { ms: 460, f: VOWELS.ee },
          { ms: 650, f: VOWELS.ee },
        ],
        f0,
        f0 * 1.05,
        rate,
      );
    case 'babble':
      return babble(rng, rate);
    case 'claps':
      return normalisePeak(claps(2, 0.28, rate, 1, 1 + Math.floor(rng() * 1000)));
    case 'hiss':
      return noiseBurst(rng, 0.45, rate, 'hiss');
    case 'beep':
      return beeps(rate);
    case 'knock':
      return noiseBurst(rng, 0.3, rate, 'knock');
  }
}

/** Low-pass-coloured background noise with an RMS of 1. */
export function backgroundNoise(n: number, rng: Rng): Float32Array {
  const out = new Float32Array(n);
  let y = 0;
  for (let i = 0; i < n; i++) {
    y = 0.9 * y + (rng() * 2 - 1);
    out[i] = y;
  }
  const r = rms(out) || 1;
  for (let i = 0; i < n; i++) out[i] /= r;
  return out;
}

/* ---------- features ---------- */

let bankCache: Float64Array[] | null = null;
export const kwsFilterbank = (): Float64Array[] => (bankCache ??= melFilterbank(KWS_RATE, WIN, BANDS, F_MIN, F_MAX, 'slaney'));

/** Log-mel frames (one array of 40 values in decibels per frame): the front end of the detector. */
export function logMelFrames(signal: ArrayLike<number>): Float64Array[] {
  const bank = kwsFilterbank();
  const w = hann(WIN);
  const frames: Float64Array[] = [];
  const buf = new Float64Array(WIN);
  for (let start = 0; start + WIN <= signal.length; start += HOP) {
    for (let i = 0; i < WIN; i++) buf[i] = signal[start + i];
    const power = powerSpectrum(buf, WIN, w);
    const mel = applyFilterbank(bank, power);
    frames.push(Float64Array.from(mel, (p) => powerToDb(p, -40)));
  }
  return frames;
}

/* ---------- the stand-in model ---------- */

export type Template = { frames: number; values: Float64Array; norm: number };

/** Remove each band's average over the patch and flatten (band-major). Returns the flat values and their length. */
function centredPatch(frames: Float64Array[], end: number, len: number): Float64Array {
  const out = new Float64Array(BANDS * len);
  const first = end - len + 1;
  for (let b = 0; b < BANDS; b++) {
    let m = 0;
    for (let t = 0; t < len; t++) m += frames[first + t][b];
    m /= len;
    for (let t = 0; t < len; t++) out[b * len + t] = frames[first + t][b] - m;
  }
  return out;
}

const normOf = (v: Float64Array): number => {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  return Math.sqrt(s);
};

let templateCache: Template | null = null;

/** The fixed pattern the toy model looks for: the keyword at normal speed and pitch, a little noise, with a short margin. */
export function keywordTemplate(): Template {
  if (templateCache) return templateCache;
  const rng = mulberry32(2024);
  const word = keywordSound(140, 1);
  const pad = Math.round(0.12 * KWS_RATE);
  const sig = backgroundNoise(word.length + 2 * pad, rng);
  const g = 10 ** (12 / 20) / (rms(word) || 1); // the word 12 dB above the background noise
  for (let i = 0; i < word.length; i++) sig[pad + i] += word[i] * g;
  const frames = logMelFrames(sig);
  const len = frames.length;
  const values = centredPatch(frames, len - 1, len);
  templateCache = { frames: len, values, norm: normOf(values) };
  return templateCache;
}

/**
 * The toy model's output for every frame: how closely the last `template.frames` frames match the keyword pattern
 * (cosine similarity after removing each band's average, clipped at 0), a number from 0 to 1. Frames before a
 * full patch is available score 0.
 */
export function matchScores(frames: Float64Array[], template: Template = keywordTemplate()): Float64Array {
  const out = new Float64Array(frames.length);
  const len = template.frames;
  for (let t = len - 1; t < frames.length; t++) {
    const p = centredPatch(frames, t, len);
    const pn = normOf(p);
    if (pn < 1e-9) continue;
    let dot = 0;
    for (let i = 0; i < p.length; i++) dot += p[i] * template.values[i];
    out[t] = Math.max(0, dot / (pn * template.norm));
  }
  return out;
}

/* ---------- decisions ---------- */

/** Average each score with the `frames - 1` before it (a causal moving average), so one noisy frame cannot trigger. */
export function smoothScores(scores: ArrayLike<number>, frames: number): Float64Array {
  const n = scores.length;
  const out = new Float64Array(n);
  const k = Math.max(1, Math.round(frames));
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += scores[i];
    if (i >= k) sum -= scores[i - k];
    out[i] = sum / Math.min(k, i + 1);
  }
  return out;
}

/**
 * Frames at which the detector fires: the smoothed score rises to the threshold after having been below it, and at
 * least `refractory` frames have passed since the last firing.
 */
export function findTriggers(smoothed: ArrayLike<number>, threshold: number, refractory: number): number[] {
  const out: number[] = [];
  let armed = true;
  let last = -Infinity;
  for (let i = 0; i < smoothed.length; i++) {
    if (smoothed[i] < threshold) armed = true;
    else if (armed && i - last >= refractory) {
      out.push(i);
      last = i;
      armed = false;
    }
  }
  return out;
}

/* ---------- the practice stream ---------- */

export type EventKind = 'keyword' | DistractorKind;
export type StreamEvent = { kind: EventKind; startSec: number; endSec: number; snrDb: number };
export type Stream = { samples: Float32Array; rate: number; seconds: number; events: StreamEvent[] };

export const STREAM_SECONDS = 120;
const DISTRACTOR_PLAN: DistractorKind[] = [
  'reverse', 'reverse', 'reverse',
  'ah-oo', 'ah-oo', 'ah-oo',
  'ah', 'ah',
  'oo-ee', 'oo-ee',
  'babble', 'babble', 'babble', 'babble',
  'claps', 'claps',
  'hiss', 'hiss',
  'beep', 'beep',
  'knock', 'knock',
];
export const KEYWORD_COUNT = 12;
/** Shifts, in dB, applied to every sound's signal-to-noise ratio in the two practice streams. */
export const ROOMS = { quiet: -4, noisy: -12 } as const;

/**
 * Two minutes of invented audio: steady background noise with 12 keywords and 22 other sounds placed at seeded times,
 * each at its own signal-to-noise ratio. Deterministic. `snrBase` shifts every level (in dB) to make it easier or harder.
 */
export function buildStream(seed = 11, snrBase = 0): Stream {
  const rng = mulberry32(seed);
  const rate = KWS_RATE;
  const n = STREAM_SECONDS * rate;
  const samples = backgroundNoise(n, rng);
  const kinds: EventKind[] = [...Array<EventKind>(KEYWORD_COUNT).fill('keyword'), ...DISTRACTOR_PLAN];
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }
  const slot = (STREAM_SECONDS - 2) / kinds.length;
  const events: StreamEvent[] = [];
  kinds.forEach((kind, idx) => {
    let sound: Float32Array;
    let snr: number;
    if (kind === 'keyword') {
      const f0 = 105 + rng() * 125;
      const speed = 0.9 + rng() * 0.25;
      sound = formantSound(scaleKeys(KEYWORD_KEYS, speed), f0, f0 * (0.9 + rng() * 0.15));
      snr = snrBase + 4 + rng() * 18;
    } else {
      sound = distractorSound(kind, rng);
      snr = snrBase + 6 + rng() * 18;
    }
    const dur = sound.length / rate;
    const room = Math.max(0, slot - dur - 0.4);
    const start = 1.5 + idx * slot + 0.2 + rng() * room;
    const gain = 10 ** (snr / 20) / (rms(sound) || 1);
    const at = Math.round(start * rate);
    for (let i = 0; i < sound.length && at + i < n; i++) samples[at + i] += sound[i] * gain;
    events.push({ kind, startSec: start, endSec: start + dur, snrDb: snr });
  });
  return { samples, rate, seconds: STREAM_SECONDS, events };
}

export type StreamResult = {
  hits: number;
  keywords: number;
  misses: number;
  falseAccepts: number;
  /** Seconds from the end of each detected keyword to the trigger (negative: it fired before the word ended). */
  delaysSec: number[];
  /** For each trigger: the index of the keyword event it detected, or -1 for a false accept. */
  matched: number[];
};

/**
 * Score a list of trigger times against the labelled events. A trigger counts as a hit if it falls inside a keyword's
 * span or up to `tailSec` after it ends (each keyword can be hit once). Every other trigger is a false accept.
 */
export function scoreTriggers(triggerTimes: number[], events: StreamEvent[], tailSec = 0.5): StreamResult {
  const used = new Set<number>();
  const matched: number[] = [];
  const delaysSec: number[] = [];
  let fa = 0;
  for (const t of triggerTimes) {
    let hit = -1;
    events.forEach((e, i) => {
      if (hit < 0 && e.kind === 'keyword' && !used.has(i) && t >= e.startSec && t <= e.endSec + tailSec) hit = i;
    });
    if (hit >= 0) {
      used.add(hit);
      delaysSec.push(t - events[hit].endSec);
    } else fa++;
    matched.push(hit);
  }
  const keywords = events.filter((e) => e.kind === 'keyword').length;
  return { hits: used.size, keywords, misses: keywords - used.size, falseAccepts: fa, delaysSec, matched };
}

/** For each false accept, the kind of sound it fired during ('background' if none was playing). */
export function falseAcceptSources(triggerTimes: number[], events: StreamEvent[], result: StreamResult, tailSec = 0.5): (EventKind | 'background')[] {
  const out: (EventKind | 'background')[] = [];
  triggerTimes.forEach((t, i) => {
    if (result.matched[i] >= 0) return;
    const e = events.find((ev) => t >= ev.startSec && t <= ev.endSec + tailSec);
    out.push(e ? e.kind : 'background');
  });
  return out;
}

export const median = (v: number[]): number => {
  if (!v.length) return NaN;
  const s = [...v].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Everything the lab needs for one setting: smoothed scores, the triggers and how they score. */
export function runDetector(scores: Float64Array, events: StreamEvent[], threshold: number, smoothFrames: number, refractorySec = 1): { smoothed: Float64Array; triggerFrames: number[]; triggerTimes: number[]; result: StreamResult } {
  const smoothed = smoothScores(scores, smoothFrames);
  const triggerFrames = findTriggers(smoothed, threshold, Math.round(refractorySec / hopSeconds));
  const triggerTimes = triggerFrames.map(frameEndSec);
  return { smoothed, triggerFrames, triggerTimes, result: scoreTriggers(triggerTimes, events) };
}

/** Misses and false accepts at each threshold from `lo` to `hi`, for the same smoothing: the trade-off curve. */
export function sweepThresholds(scores: Float64Array, events: StreamEvent[], smoothFrames: number, lo = 0.05, hi = 0.95, step = 0.01): { threshold: number; misses: number; falseAccepts: number }[] {
  const smoothed = smoothScores(scores, smoothFrames);
  const refractory = Math.round(1 / hopSeconds);
  const out: { threshold: number; misses: number; falseAccepts: number }[] = [];
  for (let thr = lo; thr <= hi + 1e-9; thr += step) {
    const r = scoreTriggers(findTriggers(smoothed, thr, refractory).map(frameEndSec), events);
    out.push({ threshold: Math.round(thr * 100) / 100, misses: r.misses, falseAccepts: r.falseAccepts });
  }
  return out;
}

/** False accepts per hour if the whole stream were typical of a day: count over the length of audio, scaled to an hour. */
export const falseAcceptsPerHour = (count: number, seconds: number): number => (count / seconds) * 3600;

/* ---------- clips for the pipeline view ---------- */

export type ClipKind = 'keyword' | 'reverse' | 'claps' | 'noise';
export const CLIP_SECONDS = 1.4;

/** A 1.4-second clip: background noise (RMS 1) with the chosen sound placed so that it ends before the clip does, at the given SNR. */
export function makeClip(kind: ClipKind, snrDb: number, seed = 5): Float32Array {
  const rng = mulberry32(seed);
  const n = Math.round(CLIP_SECONDS * KWS_RATE);
  const out = backgroundNoise(n, rng);
  if (kind === 'noise') return out;
  const sound = kind === 'keyword' ? keywordSound(150, 1) : kind === 'reverse' ? distractorSound('reverse', mulberry32(seed + 1)) : distractorSound('claps', mulberry32(seed + 2));
  const gain = 10 ** (snrDb / 20) / (rms(sound) || 1);
  const at = Math.round(0.35 * KWS_RATE);
  for (let i = 0; i < sound.length && at + i < n; i++) out[at + i] += sound[i] * gain;
  return out;
}

/** The same sound as makeClip, scaled to a safe playback level (peak 0.5) and without the noise. */
export function playable(sound: Float32Array, peak = 0.5): Float32Array {
  let p = 0;
  for (const v of sound) p = Math.max(p, Math.abs(v));
  const out = new Float32Array(sound.length);
  for (let i = 0; i < sound.length; i++) out[i] = (sound[i] / (p || 1)) * peak;
  return out;
}

/**
 * Convert recorded audio to 16 kHz by averaging the samples inside each output step (a crude low-pass) and
 * interpolating linearly. Good enough for this demo; real systems use proper polyphase filters.
 */
export function resampleTo16k(data: Float32Array, fromRate: number): Float32Array {
  if (fromRate === KWS_RATE) return Float32Array.from(data);
  const ratio = fromRate / KWS_RATE;
  const n = Math.floor(data.length / ratio);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = i * ratio;
    const b = (i + 1) * ratio;
    const i0 = Math.floor(a);
    const i1 = Math.min(data.length, Math.ceil(b));
    let s = 0;
    let w = 0;
    for (let j = i0; j < i1; j++) {
      const wt = Math.min(b, j + 1) - Math.max(a, j);
      s += data[j] * wt;
      w += wt;
    }
    out[i] = w > 0 ? s / w : 0;
  }
  return out;
}

/* ---------- memory and power arithmetic for the lesson's worked examples ---------- */

/** Bytes to hold `seconds` of 16-bit mono audio at `rate`. */
export const audioBufferBytes = (seconds: number, rate = KWS_RATE): number => Math.round(seconds * rate * 2);

/** Bytes for a feature window of `frames` frames by `coefficients` values, 8 bits each. */
export const featureWindowBytes = (frames: number, coefficients: number): number => frames * coefficients;

export type Cascade = {
  /** Power of the small always-on detector, in mW. */
  stage1Mw: number;
  /** Power of the larger second-stage detector while it runs, in mW. */
  stage2Mw: number;
  /** Seconds the second stage runs each time the first stage fires. */
  stage2SecondsPerTrigger: number;
  /** How often the first stage fires, per hour (true and false triggers together). */
  triggersPerHour: number;
};

/** Average power of a two-stage detector: the small stage always, the large stage only for the share of time it is woken. */
export function cascadePowerMw(c: Cascade): number {
  const duty = Math.min(1, (c.triggersPerHour * c.stage2SecondsPerTrigger) / 3600);
  return c.stage1Mw + c.stage2Mw * duty;
}

