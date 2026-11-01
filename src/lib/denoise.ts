import { fft, TWO_PI } from './audio-dsp';

/*
 * A small noise-suppression lab: synthetic speech-like sounds, three kinds of noise, an STFT with perfect
 * reconstruction, and four ways to choose a gain for every time-frequency cell (a "mask"). Everything is
 * deterministic and runs in the browser. The sounds are teaching signals, not recordings of real speech.
 */

export const RATE = 16000;
export const N_FFT = 512; // 32 ms
export const HOP = 256; // 16 ms, 50% overlap
export const SECONDS = 2.4;
/** The first part of the clip contains noise only. The suppressors use it to learn what the noise looks like. */
export const LEAD_IN = 0.45;
export const BINS = N_FFT / 2 + 1;

/** Frequency bands (Hz) for the hand-made mask: 8 bands from 0 to 8 kHz. */
export const BAND_EDGES = [0, 250, 500, 1000, 1500, 2200, 3200, 4500, 8000] as const;
export const N_BANDS = BAND_EDGES.length - 1;

/** Which of the 8 bands holds an FFT bin. */
export function bandOfBin(bin: number): number {
  const f = (bin * RATE) / N_FFT;
  for (let b = 0; b < N_BANDS; b++) if (f < BAND_EDGES[b + 1]) return b;
  return N_BANDS - 1;
}

/* ---------- random numbers ---------- */

export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TWO_PI * rand());
}

export const rms = (x: ArrayLike<number>): number => {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, x.length));
};
const energy = (x: ArrayLike<number>): number => {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return s;
};
export const db = (ratio: number): number => 10 * Math.log10(Math.max(ratio, 1e-30));

/* ---------- synthetic sounds ---------- */

type Vowel = { f: number[]; w: number[]; g: number[] };
const VOWELS: Record<string, Vowel> = {
  ah: { f: [750, 1100, 2500], w: [90, 110, 200], g: [1, 0.8, 0.4] },
  ee: { f: [300, 2300, 3000], w: [60, 200, 250], g: [1, 0.6, 0.4] },
  oo: { f: [350, 800, 2400], w: [60, 100, 200], g: [1, 0.5, 0.2] },
};

/** A buzzing voice at a gliding pitch, shaped by three resonances, with a smooth start and end. */
function voiced(out: Float32Array, start: number, dur: number, f0a: number, f0b: number, v: Vowel, amp: number) {
  const n = Math.round(dur * RATE);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const f0 = f0a + (f0b - f0a) * t;
    phase += (TWO_PI * f0) / RATE;
    let s = 0;
    for (let h = 1; h * f0 < RATE / 2 - 200; h++) {
      const f = h * f0;
      let env = 0;
      for (let j = 0; j < 3; j++) env += v.g[j] / (1 + ((f - v.f[j]) / v.w[j]) ** 2);
      s += (env / h ** 0.6) * Math.sin(h * phase);
    }
    const shape = Math.sin(Math.PI * Math.min(1, t * 1.0)) ** 0.7; // rises and falls
    const k = start + i;
    if (k < out.length) out[k] += amp * s * shape;
  }
}

/** A hiss like "s": noise with the low end tilted away, so the energy sits at high frequencies. */
function fricative(out: Float32Array, start: number, dur: number, amp: number, rand: () => number) {
  const n = Math.round(dur * RATE);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const x = gaussian(rand);
    const y = x - 0.95 * prev; // first-difference filter: boosts highs
    prev = x;
    const shape = Math.sin((Math.PI * i) / n);
    const k = start + i;
    if (k < out.length) out[k] += amp * y * shape;
  }
}

/** The speech-like test signal: silence, then four short "syllables" and one "s", about 2.4 s long, rms 0.1. */
export function speechLike(seed = 3): Float32Array {
  const rand = makeRng(seed);
  const out = new Float32Array(Math.round(SECONDS * RATE));
  const at = (s: number) => Math.round(s * RATE);
  voiced(out, at(0.55), 0.3, 120, 135, VOWELS.ah, 1);
  fricative(out, at(0.92), 0.14, 0.5, rand);
  voiced(out, at(1.08), 0.3, 130, 118, VOWELS.ee, 1);
  voiced(out, at(1.55), 0.32, 112, 125, VOWELS.oo, 1);
  voiced(out, at(1.98), 0.3, 125, 108, VOWELS.ah, 1);
  return scaleToRms(out, 0.1);
}

export type NoiseKind = 'hiss' | 'rumble' | 'babble';
export const NOISE_LABEL: Record<NoiseKind, string> = { hiss: 'Steady hiss', rumble: 'Low rumble', babble: 'Babble' };

/** Noise with unit rms. 'hiss' is white; 'rumble' is mostly low frequencies; 'babble' is several overlapping voices. */
export function makeNoise(kind: NoiseKind, seed = 11): Float32Array {
  const rand = makeRng(seed);
  const n = Math.round(SECONDS * RATE);
  const out = new Float32Array(n);
  if (kind === 'hiss') {
    for (let i = 0; i < n; i++) out[i] = gaussian(rand);
  } else if (kind === 'rumble') {
    let a = 0;
    let b = 0;
    for (let i = 0; i < n; i++) {
      a = 0.985 * a + gaussian(rand);
      b = 0.9 * b + a;
      out[i] = b;
    }
  } else {
    const names = ['ah', 'ee', 'oo'];
    for (let v = 0; v < 5; v++) {
      let pos = 0;
      while (pos < n) {
        const dur = 0.18 + rand() * 0.25;
        const f0 = 90 + rand() * 160;
        voiced(out, pos, dur, f0, f0 * (0.9 + rand() * 0.2), VOWELS[names[Math.floor(rand() * 3)]], 0.5 + rand());
        pos += Math.round((dur + 0.02 + rand() * 0.18) * RATE);
      }
    }
  }
  return scaleToRms(out, 1);
}

function scaleToRms(x: Float32Array, target: number): Float32Array {
  const r = rms(x) || 1;
  for (let i = 0; i < x.length; i++) x[i] = (x[i] / r) * target;
  return x;
}

/** Add noise to clean speech so that 10 log10(speech energy / noise energy) over the whole clip equals snrDb. */
export function mixAtSnr(clean: Float32Array, noiseUnit: Float32Array, snrDb: number): { noise: Float32Array; mix: Float32Array } {
  const g = (rms(clean) / (rms(noiseUnit) || 1)) * 10 ** (-snrDb / 20);
  const noise = Float32Array.from(noiseUnit, (v) => v * g);
  const mix = Float32Array.from(clean, (v, i) => v + noise[i]);
  return { noise, mix };
}

/* ---------- STFT with perfect reconstruction ---------- */

export type Spec = { re: Float64Array[]; im: Float64Array[] };

const WIN = (() => {
  const w = new Float64Array(N_FFT);
  for (let i = 0; i < N_FFT; i++) w[i] = Math.sqrt(0.5 - 0.5 * Math.cos((TWO_PI * i) / N_FFT)); // sqrt of periodic Hann
  return w;
})();

export const frameCountFor = (samples: number): number => Math.ceil((samples + N_FFT) / HOP) + 1;

/** Inverse FFT of a full-length spectrum, returning the real part. */
export function ifftReal(re: Float64Array, im: Float64Array): Float64Array {
  const n = re.length;
  const a = Float64Array.from(re);
  const b = Float64Array.from(im, (v) => -v);
  fft(a, b);
  return a.map((v) => v / n);
}

/** Analysis: sqrt-Hann windows, 50% overlap, the signal padded with N_FFT zeros at the start so every sample is covered twice. */
export function analyse(x: ArrayLike<number>): Spec {
  const nFrames = frameCountFor(x.length);
  const re: Float64Array[] = [];
  const im: Float64Array[] = [];
  for (let f = 0; f < nFrames; f++) {
    const buf = new Float64Array(N_FFT);
    const start = f * HOP - N_FFT;
    for (let i = 0; i < N_FFT; i++) {
      const k = start + i;
      buf[i] = k >= 0 && k < x.length ? x[k] * WIN[i] : 0;
    }
    const bi = new Float64Array(N_FFT);
    fft(buf, bi);
    re.push(buf.slice(0, BINS));
    im.push(bi.slice(0, BINS));
  }
  return { re, im };
}

/** Synthesis: inverse FFT per frame, windowed again and overlap-added. */
export function synthesise(spec: Spec, length: number): Float32Array {
  const out = new Float64Array(length);
  for (let f = 0; f < spec.re.length; f++) {
    const fr = new Float64Array(N_FFT);
    const fi = new Float64Array(N_FFT);
    for (let k = 0; k < BINS; k++) {
      fr[k] = spec.re[f][k];
      fi[k] = spec.im[f][k];
      if (k > 0 && k < N_FFT / 2) {
        fr[N_FFT - k] = spec.re[f][k];
        fi[N_FFT - k] = -spec.im[f][k];
      }
    }
    const t = ifftReal(fr, fi);
    const start = f * HOP - N_FFT;
    for (let i = 0; i < N_FFT; i++) {
      const k = start + i;
      if (k >= 0 && k < length) out[k] += t[i] * WIN[i];
    }
  }
  return Float32Array.from(out);
}

/** Multiply a spectrum by a gain for every cell. */
export function applyGains(spec: Spec, gains: Float64Array[]): Spec {
  return {
    re: spec.re.map((r, f) => r.map((v, k) => v * gains[f][k])),
    im: spec.im.map((r, f) => r.map((v, k) => v * gains[f][k])),
  };
}

export const magnitude = (spec: Spec, f: number, k: number): number => Math.hypot(spec.re[f][k], spec.im[f][k]);

/* ---------- gains ---------- */

export type Method = 'manual' | 'subtract' | 'wiener' | 'oracle';
export const METHOD_LABEL: Record<Method, string> = {
  manual: 'Hand-made bands',
  subtract: 'Spectral subtraction',
  wiener: 'Wiener-style',
  oracle: 'Oracle mask',
};

export type Params = {
  method: Method;
  /** gain cut for each of the 8 bands, in dB (0 to 40), for the hand-made mask */
  bandCutDb: number[];
  /** over-subtraction factor for spectral subtraction */
  alpha: number;
  /** the most any cell may be cut, in dB (a "floor" on the gain) */
  maxCutDb: number;
};

/** Frames that lie wholly inside the noise-only lead-in. */
export function leadInFrames(): number[] {
  const out: number[] = [];
  for (let f = 0; f < frameCountFor(Math.round(SECONDS * RATE)); f++) {
    const start = f * HOP - N_FFT;
    if (start >= 0 && start + N_FFT <= LEAD_IN * RATE) out.push(f);
  }
  return out;
}

/** The noise power per bin, estimated as the mean power of the mixture's noise-only frames. */
export function estimateNoisePower(mixSpec: Spec, frames: number[] = leadInFrames()): Float64Array {
  const p = new Float64Array(BINS);
  for (const f of frames) for (let k = 0; k < BINS; k++) p[k] += mixSpec.re[f][k] ** 2 + mixSpec.im[f][k] ** 2;
  for (let k = 0; k < BINS; k++) p[k] /= Math.max(1, frames.length);
  return p;
}

/** One gain in [floor, 1] for every cell. `clean` and `noise` are only read by the oracle method. */
export function computeGains(mix: Spec, p: Params, noisePower: Float64Array, clean?: Spec, noise?: Spec): Float64Array[] {
  const floor = 10 ** (-p.maxCutDb / 20);
  const nF = mix.re.length;
  const gains: Float64Array[] = [];
  for (let f = 0; f < nF; f++) {
    const g = new Float64Array(BINS);
    for (let k = 0; k < BINS; k++) {
      const y2 = mix.re[f][k] ** 2 + mix.im[f][k] ** 2;
      const n2 = noisePower[k];
      let v: number;
      if (p.method === 'manual') {
        v = 10 ** (-p.bandCutDb[bandOfBin(k)] / 20);
      } else if (p.method === 'subtract') {
        v = Math.max(floor, 1 - (p.alpha * Math.sqrt(n2)) / Math.max(Math.sqrt(y2), 1e-12));
      } else if (p.method === 'wiener') {
        const xi = Math.max(y2 / Math.max(n2, 1e-18) - 1, 0);
        v = Math.max(floor, xi / (1 + xi));
      } else {
        const s2 = clean ? clean.re[f][k] ** 2 + clean.im[f][k] ** 2 : 0;
        const nn2 = noise ? noise.re[f][k] ** 2 + noise.im[f][k] ** 2 : 1;
        v = Math.max(floor, Math.sqrt(s2 / Math.max(s2 + nn2, 1e-18)));
      }
      g[k] = Math.min(1, v);
    }
    gains.push(g);
  }
  return gains;
}

/* ---------- measurements ---------- */

export type Report = {
  snrIn: number;
  snrOut: number;
  improvement: number;
  /** how close the processed speech is to the original speech, in dB (higher is less damage) */
  speechKept: number;
  /** how much quieter the noise-only lead-in became, in dB */
  pauseNoiseDrop: number;
  /** isolated surviving cells per 1000 cells in the noise-only lead-in (a rough "musical noise" count) */
  blips: number;
};

/**
 * Measure a mask by applying it separately to the clean speech and to the noise (the same gains for both), then
 * comparing the energies of what comes out. This separates what the filter did to the speech from what it did to
 * the noise, which a single mixture cannot.
 */
export function measure(clean: Float32Array, noise: Float32Array, cleanSpec: Spec, noiseSpec: Spec, gains: Float64Array[]): Report {
  const len = clean.length;
  const sOut = synthesise(applyGains(cleanSpec, gains), len);
  const nOut = synthesise(applyGains(noiseSpec, gains), len);
  const snrIn = db(energy(clean) / energy(noise));
  const snrOut = db(energy(sOut) / energy(nOut));
  const diff = Float32Array.from(sOut, (v, i) => v - clean[i]);
  const lead = Math.round(LEAD_IN * RATE);
  const nLead = noise.slice(0, lead);
  const nOutLead = nOut.slice(0, lead);
  return {
    snrIn,
    snrOut,
    improvement: snrOut - snrIn,
    speechKept: db(energy(clean) / Math.max(energy(diff), 1e-20)),
    pauseNoiseDrop: db(energy(nLead) / Math.max(energy(nOutLead), 1e-20)),
    blips: isolatedBlips(gains),
  };
}

/** Cells in the noise-only frames whose gain is at least `keep` but whose four neighbours are all below it, per 1000 cells. */
export function isolatedBlips(gains: Float64Array[], keep = 0.35): number {
  const frames = leadInFrames();
  if (frames.length < 3) return 0;
  const f0 = frames[0];
  const f1 = frames[frames.length - 1];
  let cells = 0;
  let blips = 0;
  for (let f = f0 + 1; f < f1; f++) {
    for (let k = 1; k < BINS - 1; k++) {
      cells++;
      if (gains[f][k] < keep) continue;
      if (gains[f - 1][k] < keep && gains[f + 1][k] < keep && gains[f][k - 1] < keep && gains[f][k + 1] < keep) blips++;
    }
  }
  return (1000 * blips) / Math.max(1, cells);
}

/** Power spectrogram in dB (frames x bins) of a spectrum. */
export function powerDb(spec: Spec): Float32Array[] {
  return spec.re.map((r, f) => Float32Array.from(r, (v, k) => db(v * v + spec.im[f][k] ** 2)));
}
