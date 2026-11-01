/*
 * A deliberately tiny, deterministic text-to-speech toy, built to show the stages of a classic TTS
 * pipeline: text normalisation, letters to sounds, prosody (duration and pitch), acoustic features and a
 * waveform generator. The waveform stage is a formant synthesiser (a source-filter model): a buzz at the
 * speaking pitch shaped by three resonances, plus filtered noise for hissy consonants.
 *
 * It is NOT neural text to speech and does not sound natural. Its letter-to-sound rules mispronounce
 * many English words, and the formant values are rounded teaching values placed inside the ranges quoted
 * for adult male voices (first formant about 150 to 850 Hz, second 500 to 2,500 Hz, third 1,500 to
 * 3,500 Hz), not measurements. Pure functions, no DOM, no Web Audio: tests check it offline.
 */

import { TWO_PI, binFrequencies, hann, melFilterbank, applyFilterbank, powerSpectrum } from './audio-dsp';
import { numberToWords } from './wer';

export const RATE = 16000;

/* ---------- 1. text normalisation ---------- */

export type Token = { kind: 'word'; text: string } | { kind: 'punct'; text: '.' | ',' | '?' };
export type Change = { from: string; to: string };

const ABBREVIATIONS: Record<string, string> = { dr: 'doctor', mr: 'mister', mrs: 'missus', '&': 'and', '%': 'percent' };
const CURRENCY: Record<string, string> = { '£': 'pounds', $: 'dollars', '€': 'euros' };

/**
 * Turn written text into words and punctuation marks a reader would say: numbers up to 999 become
 * words, longer digit strings are read digit by digit, a few abbreviations and currency signs are
 * spelled out. Anything outside letters, digits and a few marks is dropped. `changes` lists what was rewritten.
 */
export function normaliseText(text: string): { tokens: Token[]; changes: Change[] } {
  const changes: Change[] = [];
  const tokens: Token[] = [];
  const src = text.replace(/[‘’]/g, "'").toLowerCase();
  const re = /([£$€])\s*(\d+)|(\d+)|([a-z]+(?:'[a-z]+)*)|([&%])|([.,?!;:])/g;
  let m: RegExpExecArray | null;
  const say = (n: string): string[] => {
    const v = Number(n);
    return n.length <= 3 ? numberToWords(v) : n.split('').map((d) => numberToWords(Number(d))[0]);
  };
  while ((m = re.exec(src))) {
    if (m[1]) {
      const spoken = [...say(m[2]), CURRENCY[m[1]]];
      changes.push({ from: m[0], to: spoken.join(' ') });
      for (const w of spoken) tokens.push({ kind: 'word', text: w });
    } else if (m[3]) {
      const spoken = say(m[3]);
      changes.push({ from: m[3], to: spoken.join(' ') });
      for (const w of spoken) tokens.push({ kind: 'word', text: w });
    } else if (m[4]) {
      const to = ABBREVIATIONS[m[4]];
      if (to) changes.push({ from: m[4], to });
      tokens.push({ kind: 'word', text: to ?? m[4] });
    } else if (m[5]) {
      const to = ABBREVIATIONS[m[5]];
      changes.push({ from: m[5], to });
      tokens.push({ kind: 'word', text: to });
    } else if (m[6]) {
      const p: '.' | ',' | '?' = m[6] === '?' ? '?' : m[6] === ',' || m[6] === ';' || m[6] === ':' ? ',' : '.';
      tokens.push({ kind: 'punct', text: p });
    }
  }
  return { tokens, changes };
}

/* ---------- 2. letters to sounds ---------- */

export type Phone = 'i' | 'e' | 'a' | 'ah' | 'o' | 'u' | 'w' | 'y' | 'l' | 'r' | 'm' | 'n' | 's' | 'sh' | 'f' | 'th' | 'h' | 'p' | 't' | 'k';

export const VOWELS: readonly Phone[] = ['i', 'e', 'a', 'ah', 'o', 'u'];
const GLIDES: readonly Phone[] = ['w', 'y', 'l', 'r'];
const NASALS: readonly Phone[] = ['m', 'n'];
const FRICATIVES: readonly Phone[] = ['s', 'sh', 'f', 'th', 'h'];

/** What each sound is a bit like, for labels. A toy inventory: voiced and voiceless stops share one sound (b = p, d = t, g = k). */
export const PHONE_HINT: Record<Phone, string> = {
  i: 'ee as in see',
  e: 'e as in bed',
  a: 'a as in cat',
  ah: 'ah as in father',
  o: 'o as in go',
  u: 'oo as in blue',
  w: 'w',
  y: 'y',
  l: 'l',
  r: 'r',
  m: 'm',
  n: 'n',
  s: 's',
  sh: 'sh',
  f: 'f',
  th: 'th',
  h: 'h',
  p: 'p or b',
  t: 't or d',
  k: 'k or g',
};

/** Words the toy knows by heart. Everything else goes through spelling rules, which is how real systems fall back too. */
export const LEXICON: Record<string, Phone[]> = {
  the: ['th', 'e'],
  a: ['e'],
  of: ['ah', 'f'],
  to: ['t', 'u'],
  two: ['t', 'u'],
  one: ['w', 'ah', 'n'],
  you: ['y', 'u'],
  are: ['ah', 'r'],
  is: ['i', 's'],
  was: ['w', 'ah', 's'],
  hello: ['h', 'e', 'l', 'o'],
  world: ['w', 'e', 'r', 'l', 't'],
  what: ['w', 'ah', 't'],
  said: ['s', 'e', 't'],
};

const DIGRAPHS: [string, Phone[]][] = [
  ['sh', ['sh']],
  ['ch', ['t', 'sh']],
  ['th', ['th']],
  ['ph', ['f']],
  ['ck', ['k']],
  ['ng', ['n']],
  ['qu', ['k', 'w']],
  ['wh', ['w']],
  ['ee', ['i']],
  ['ea', ['i']],
  ['oo', ['u']],
  ['ou', ['ah', 'u']],
  ['ow', ['ah', 'u']],
  ['ai', ['e', 'i']],
  ['ay', ['e', 'i']],
  ['oa', ['o']],
  ['oi', ['o', 'i']],
  ['ie', ['i']],
  ['ue', ['u']],
  ['ew', ['u']],
];
const SINGLE: Record<string, Phone[]> = {
  a: ['a'],
  e: ['e'],
  i: ['i'],
  o: ['o'],
  u: ['ah'],
  b: ['p'],
  d: ['t'],
  g: ['k'],
  j: ['t', 'sh'],
  v: ['f'],
  z: ['s'],
  x: ['k', 's'],
  q: ['k'],
  f: ['f'],
  h: ['h'],
  k: ['k'],
  l: ['l'],
  m: ['m'],
  n: ['n'],
  p: ['p'],
  r: ['r'],
  s: ['s'],
  t: ['t'],
  w: ['w'],
};

/** Sounds for one lower-case word: the lexicon first, then spelling rules. Returns where the answer came from. */
export function wordToPhones(word: string): { phones: Phone[]; source: 'lexicon' | 'rules' } {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  const known = LEXICON[w];
  if (known) return { phones: [...known], source: 'lexicon' };
  const letters = w.length > 2 && /[^aeiou]e$/.test(w) ? w.slice(0, -1) : w; // a silent final e: "make" has no e sound
  const out: Phone[] = [];
  let i = 0;
  while (i < letters.length) {
    const pair = letters.slice(i, i + 2);
    const hit = DIGRAPHS.find(([k]) => k === pair);
    if (hit) {
      out.push(...hit[1]);
      i += 2;
      continue;
    }
    const c = letters[i];
    if (i > 0 && letters[i - 1] === c) {
      i++; // a doubled letter is one sound
      continue;
    }
    if (c === 'c') out.push(/[eiy]/.test(letters[i + 1] ?? '') ? 's' : 'k');
    else if (c === 'y') out.push(i === 0 ? 'y' : 'i');
    else if (SINGLE[c]) out.push(...SINGLE[c]);
    i++;
  }
  return { phones: out, source: 'rules' };
}

/* ---------- 3. prosody: how long, how high, where to pause ---------- */

export type Segment = {
  ph: Phone | 'pause';
  /** Duration in milliseconds, after the speed setting. */
  ms: number;
  /** Pitch in hertz (voiced sounds only; 0 otherwise). */
  f0: number;
  /** Index of the word this sound belongs to, or -1 for a pause. */
  word: number;
  stressed: boolean;
};
export type Plan = { segments: Segment[]; totalMs: number; question: boolean };

const FUNCTION_WORDS = new Set(['the', 'a', 'of', 'to', 'is', 'are', 'was', 'and', 'in', 'on', 'at', 'you', 'i', 'it', 'he', 'she', 'we']);
const BASE_MS: Record<string, number> = { vowel: 110, glide: 70, nasal: 80, fric: 100, h: 60, stop: 75 };
const kindOf = (p: Phone): 'vowel' | 'glide' | 'nasal' | 'fric' | 'h' | 'stop' =>
  VOWELS.includes(p) ? 'vowel' : GLIDES.includes(p) ? 'glide' : NASALS.includes(p) ? 'nasal' : p === 'h' ? 'h' : FRICATIVES.includes(p) ? 'fric' : 'stop';
export const isVoiced = (p: Phone | 'pause'): boolean => p !== 'pause' && ['vowel', 'glide', 'nasal'].includes(kindOf(p));

export type PlanOptions = {
  /** Speaking pitch at the start of the sentence, in hertz. */
  basePitch: number;
  /** 1 is normal; 1.5 is half as long per sound. */
  speed: number;
};

/**
 * Give every sound a duration and a pitch. The rules are made-up and simple: content words (anything
 * not in a short list of function words) get a stressed first vowel, longer and a tenth higher; pitch
 * drifts down across the sentence; a question mark makes the last third rise; commas and full stops add pauses.
 */
export function planProsody(tokens: Token[], opts: PlanOptions): Plan {
  const speed = Math.max(0.3, opts.speed);
  const raw: Omit<Segment, 'f0'>[] = [];
  let word = 0;
  let question = false;
  for (const t of tokens) {
    if (t.kind === 'punct') {
      if (t.text === '?') question = true;
      raw.push({ ph: 'pause', ms: (t.text === ',' ? 180 : 300) / speed, word: -1, stressed: false });
      continue;
    }
    const { phones } = wordToPhones(t.text);
    if (phones.length === 0) continue;
    if (raw.length > 0 && raw[raw.length - 1].ph !== 'pause') raw.push({ ph: 'pause', ms: 30 / speed, word: -1, stressed: false });
    const content = !FUNCTION_WORDS.has(t.text);
    let marked = false;
    for (const p of phones) {
      const stressed = content && !marked && VOWELS.includes(p);
      if (stressed) marked = true;
      raw.push({ ph: p, ms: (BASE_MS[kindOf(p)] * (stressed ? 1.2 : 1)) / speed, word, stressed });
    }
    word++;
  }
  const totalMs = raw.reduce((s, r) => s + r.ms, 0);
  let trailing = 0; // pauses at the very end do not count as part of the sentence's pitch movement
  for (let i = raw.length - 1; i >= 0 && raw[i].ph === 'pause'; i--) trailing += raw[i].ms;
  const spoken = Math.max(1, totalMs - trailing);
  let t = 0;
  const segments: Segment[] = raw.map((r) => {
    const mid = t + r.ms / 2;
    t += r.ms;
    const frac = Math.min(1, mid / spoken);
    let f0 = opts.basePitch * (1 + 0.12 * (1 - frac)); // pitch drifts down across the sentence
    if (r.stressed) f0 *= 1.1;
    if (question && frac > 0.7) f0 *= 1 + 0.35 * ((frac - 0.7) / 0.3);
    return { ...r, f0: isVoiced(r.ph) ? f0 : 0 };
  });
  return { segments, totalMs, question };
}

/* ---------- 4. a formant synthesiser ---------- */

/** Rounded teaching values for the first three resonances (Hz) of each vowel and glide. */
export const FORMANTS: Partial<Record<Phone, [number, number, number]>> = {
  i: [300, 2300, 3000],
  e: [530, 1850, 2500],
  a: [660, 1700, 2500],
  ah: [750, 940, 2500],
  o: [570, 840, 2400],
  u: [300, 870, 2200],
  w: [300, 700, 2200],
  y: [280, 2200, 3000],
  l: [350, 1100, 2700],
  r: [400, 1300, 1700],
  m: [250, 1200, 2500],
  n: [250, 1500, 2600],
};
const WIDTHS = [90, 110, 200];
const FORMANT_GAINS = [1, 0.8, 0.5];
/** Centre frequency, quality factor and loudness of the noise for each hissy or bursty consonant. */
const NOISE: Partial<Record<Phone, { fc: number; q: number; gain: number }>> = {
  s: { fc: 6000, q: 1.6, gain: 0.55 },
  sh: { fc: 3000, q: 1.2, gain: 0.6 },
  f: { fc: 4500, q: 0.5, gain: 0.18 },
  th: { fc: 4000, q: 0.5, gain: 0.15 },
  h: { fc: 1500, q: 0.4, gain: 0.12 },
  p: { fc: 900, q: 0.7, gain: 0.35 },
  t: { fc: 4500, q: 1.5, gain: 0.45 },
  k: { fc: 2000, q: 1.5, gain: 0.45 },
};
const VOICED_GAIN: Record<string, number> = { vowel: 1, glide: 0.6, nasal: 0.45 };
const TARGET_RMS = 0.25;
const BLOCK = 80; // 5 ms

/** Band-pass filter (the "constant 0 dB peak gain" biquad from the Audio EQ Cookbook). */
function bandpass(x: Float64Array, fc: number, q: number): Float64Array {
  const w0 = (TWO_PI * fc) / RATE;
  const alpha = Math.sin(w0) / (2 * q);
  const b0 = alpha;
  const b2 = -alpha;
  const a0 = 1 + alpha;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1 - alpha;
  const y = new Float64Array(x.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let n = 0; n < x.length; n++) {
    const v = (b0 * x[n] + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1;
    x1 = x[n];
    y2 = y1;
    y1 = v;
    y[n] = v;
  }
  return y;
}

function rms(x: ArrayLike<number>, from = 0, to = x.length): number {
  let s = 0;
  for (let i = from; i < to; i++) s += x[i] * x[i];
  return to > from ? Math.sqrt(s / (to - from)) : 0;
}

/**
 * Render a plan as audio at 16,000 samples a second, peak 0.8. Voiced sounds are a sum of harmonics
 * of the pitch weighted by three resonance peaks, which slide from the previous sound's resonances over
 * the first third of each sound. Hissy sounds and the burst of a stop are band-passed noise from a fixed seed.
 */
export function synthesise(plan: Plan, seed = 1): Float32Array {
  const lengths = plan.segments.map((s) => Math.max(1, Math.round((s.ms / 1000) * RATE)));
  const out = new Float32Array(lengths.reduce((a, b) => a + b, 0));
  let rng = seed >>> 0;
  const rand = () => {
    rng = (rng * 1664525 + 1013904223) >>> 0;
    return rng / 2 ** 31 - 1;
  };
  let phase = 0;
  let f0Now = 0;
  let prevForm: [number, number, number] | null = null;
  let pos = 0;
  plan.segments.forEach((seg, idx) => {
    const n = lengths[idx];
    const ramp = Math.min(Math.round(0.008 * RATE), Math.floor(n / 2));
    const env = (i: number) => Math.min(1, i / Math.max(1, ramp), (n - 1 - i) / Math.max(1, ramp));
    if (seg.ph === 'pause') {
      prevForm = null;
    } else if (isVoiced(seg.ph)) {
      const target = FORMANTS[seg.ph]!;
      const from = prevForm ?? target;
      const gain = VOICED_GAIN[kindOf(seg.ph)] * (seg.stressed ? 1 : 0.8);
      const buf = new Float64Array(n);
      for (let b0 = 0; b0 < n; b0 += BLOCK) {
        const bl = Math.min(BLOCK, n - b0);
        const u = Math.min(1, b0 / Math.max(1, 0.35 * n));
        const form = target.map((t, j) => from[j] + (t - from[j]) * u);
        if (f0Now === 0) f0Now = seg.f0;
        const amps: number[] = [];
        let power = 0;
        for (let h = 1; h * seg.f0 < RATE / 2 - 200; h++) {
          const f = h * seg.f0;
          let a = 0;
          for (let j = 0; j < 3; j++) a += FORMANT_GAINS[j] / (1 + ((f - form[j]) / WIDTHS[j]) ** 2);
          a /= h ** 0.7;
          amps.push(a);
          power += (a * a) / 2;
        }
        const scale = (gain * TARGET_RMS) / Math.sqrt(power || 1);
        for (let k = 0; k < bl; k++) {
          f0Now += (seg.f0 - f0Now) * 0.004; // glide towards the planned pitch over a few milliseconds
          phase += (TWO_PI * f0Now) / RATE;
          let s = 0;
          for (let h = 0; h < amps.length; h++) s += amps[h] * Math.sin((h + 1) * phase);
          buf[b0 + k] = s * scale;
        }
      }
      for (let i = 0; i < n; i++) out[pos + i] = buf[i] * env(i);
      prevForm = target as [number, number, number];
    } else {
      const spec = NOISE[seg.ph]!;
      const isStop = kindOf(seg.ph) === 'stop';
      const burstStart = isStop ? Math.floor(n * 0.65) : 0;
      const len = n - burstStart;
      const white = new Float64Array(len);
      for (let i = 0; i < len; i++) white[i] = rand();
      const band = bandpass(white, spec.fc, spec.q);
      const level = rms(band);
      const k = level > 0 ? (spec.gain * TARGET_RMS * 2) / level : 0;
      for (let i = 0; i < len; i++) {
        const shape = isStop ? Math.exp((-3 * i) / len) : Math.min(1, i / Math.max(1, ramp), (len - 1 - i) / Math.max(1, ramp));
        out[pos + burstStart + i] = band[i] * k * shape;
      }
      prevForm = null;
    }
    pos += n;
  });
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  const g = peak > 0 ? 0.8 / peak : 0;
  const fade = Math.min(Math.round(0.015 * RATE), Math.floor(out.length / 2));
  for (let i = 0; i < out.length; i++) {
    const e = Math.min(1, i / Math.max(1, fade), (out.length - 1 - i) / Math.max(1, fade));
    out[i] *= g * e;
  }
  return out;
}

/** Everything in one call: text to samples. */
export function speak(text: string, opts: PlanOptions): { tokens: Token[]; changes: Change[]; plan: Plan; samples: Float32Array } {
  const { tokens, changes } = normaliseText(text);
  const plan = planProsody(tokens, opts);
  return { tokens, changes, plan, samples: synthesise(plan) };
}

/* ---------- 5. the picture a neural model would predict: a log-mel spectrogram ---------- */

/**
 * Log-mel spectrogram in decibels relative to the loudest cell, floored at -`rangeDb`. frames x bands.
 * 32 ms windows (512 samples) every 5 ms, 64 mel bands from 0 to 8,000 Hz.
 */
export function melDb(samples: ArrayLike<number>, nMels = 64, rangeDb = 70, nFft = 512, hop = 80): Float32Array[] {
  const bank = melFilterbank(RATE, nFft, nMels, 0, RATE / 2);
  const win = hann(nFft);
  const frames: Float64Array[] = [];
  for (let start = 0; start + nFft <= samples.length; start += hop) {
    const slice = new Float64Array(nFft);
    for (let i = 0; i < nFft; i++) slice[i] = samples[start + i];
    frames.push(applyFilterbank(bank, powerSpectrum(slice, nFft, win)));
  }
  let max = 1e-20;
  for (const f of frames) for (const v of f) if (v > max) max = v;
  return frames.map((f) => Float32Array.from(f, (v) => Math.max(-rangeDb, 10 * Math.log10(Math.max(v, 1e-20) / max))));
}

/** The frequency (Hz) of the loudest FFT bin of a whole clip, for checks and for labels. */
export function peakFrequency(samples: ArrayLike<number>, nFft = 4096): number {
  const x = new Float64Array(nFft);
  for (let i = 0; i < Math.min(nFft, samples.length); i++) x[i] = samples[i];
  const p = powerSpectrum(x, nFft, hann(nFft));
  const f = binFrequencies(RATE, nFft);
  let best = 1;
  for (let k = 1; k < p.length; k++) if (p[k] > p[best]) best = k;
  return f[best];
}

/* ---------- the token-based alternative: how many codes does a few seconds of speech need? ---------- */

/**
 * Codes produced by a residual-vector-quantisation audio codec: `frameRate` frames a second, `quantizers`
 * codes in each frame. EnCodec at 24 kHz makes 75 frames a second and uses codebooks of 1,024 entries
 * (10 bits), and VALL-E uses 8 quantizers (6 kbit/s), as stated in their papers.
 */
export function codecBudget(seconds: number, quantizers: number, frameRate = 75, bitsPerCode = 10): { frames: number; codes: number; kbps: number } {
  const frames = Math.round(seconds * frameRate);
  return { frames, codes: frames * quantizers, kbps: (frameRate * quantizers * bitsPerCode) / 1000 };
}
