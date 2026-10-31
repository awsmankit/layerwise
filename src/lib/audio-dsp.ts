/*
 * Small, dependency-free audio maths for the "audio" lessons: sampling and aliasing,
 * windowed Fourier transforms, mel filterbanks and a few synthesised test sounds.
 * Everything here is pure (no Web Audio, no DOM) so it can be tested against known values.
 */

export const TWO_PI = Math.PI * 2;

/* ---------- sampling ---------- */

/**
 * The frequency a sampled tone appears to have. A tone of `freq` Hz sampled `rate` times a second
 * is indistinguishable from a tone at freq - k*rate for any whole k. This returns the one closest
 * to zero, signed: its absolute value is the pitch you would hear, and the sign says whether the
 * pattern seems to run backwards (the wagon-wheel effect).
 */
export function aliasFrequency(freq: number, rate: number): number {
  if (!(rate > 0)) return NaN;
  return freq - Math.round(freq / rate) * rate;
}

/** The highest frequency a sampling rate can hold: half the rate (the Nyquist limit). */
export const nyquist = (rate: number): number => rate / 2;

/** Round a value in [-1, 1] to the nearest of 2^bits evenly spaced levels (values are clamped first). */
export function quantise(x: number, bits: number): number {
  const levels = 2 ** bits;
  const c = Math.max(-1, Math.min(1, x));
  const step = 2 / (levels - 1);
  return Math.round((c + 1) / step) * step - 1;
}

/* ---------- windows and the Fourier transform ---------- */

/** Hann window. `periodic` (the default) matches torch.hann_window and the one Whisper uses. */
export function hann(n: number, periodic = true): Float64Array {
  const w = new Float64Array(n);
  const d = periodic ? n : n - 1;
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((TWO_PI * i) / d);
  return w;
}

export const isPowerOfTwo = (n: number): boolean => n > 0 && (n & (n - 1)) === 0;

/** In-place radix-2 FFT. The length must be a power of two. */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  if (!isPowerOfTwo(n) || im.length !== n) throw new Error('fft needs equal-length arrays whose size is a power of two');
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-TWO_PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

/** Plain O(n^2) discrete Fourier transform of a real signal: the first n/2 + 1 bins as [re, im]. Any length. */
export function dft(x: ArrayLike<number>): { re: Float64Array; im: Float64Array } {
  const n = x.length;
  const bins = Math.floor(n / 2) + 1;
  const re = new Float64Array(bins);
  const im = new Float64Array(bins);
  for (let k = 0; k < bins; k++) {
    let sr = 0;
    let si = 0;
    for (let t = 0; t < n; t++) {
      const a = (-TWO_PI * k * t) / n;
      sr += x[t] * Math.cos(a);
      si += x[t] * Math.sin(a);
    }
    re[k] = sr;
    im[k] = si;
  }
  return { re, im };
}

/**
 * Power spectrum |X[k]|^2 of one frame, for bins 0 .. nFft/2. The frame is multiplied by `window`
 * (if given), zero-padded or cut to nFft, then transformed. Uses the FFT when nFft is a power of two
 * and the plain transform otherwise (Whisper's 400-sample window is not a power of two).
 */
export function powerSpectrum(frame: ArrayLike<number>, nFft: number, window?: ArrayLike<number>): Float64Array {
  const x = new Float64Array(nFft);
  const m = Math.min(nFft, frame.length);
  for (let i = 0; i < m; i++) x[i] = frame[i] * (window ? window[i] : 1);
  const bins = Math.floor(nFft / 2) + 1;
  const out = new Float64Array(bins);
  if (isPowerOfTwo(nFft)) {
    const im = new Float64Array(nFft);
    fft(x, im);
    for (let k = 0; k < bins; k++) out[k] = x[k] * x[k] + im[k] * im[k];
  } else {
    const { re, im } = dft(x);
    for (let k = 0; k < bins; k++) out[k] = re[k] * re[k] + im[k] * im[k];
  }
  return out;
}

/** Short-time Fourier transform: a power spectrum for each hop-spaced window. No padding at the ends. */
export function stft(signal: ArrayLike<number>, nFft: number, hop: number, window: ArrayLike<number> = hann(nFft)): Float64Array[] {
  const frames: Float64Array[] = [];
  for (let start = 0; start + nFft <= signal.length; start += hop) {
    const frame = new Float64Array(nFft);
    for (let i = 0; i < nFft; i++) frame[i] = signal[start + i];
    frames.push(powerSpectrum(frame, nFft, window));
  }
  return frames;
}

/** How many frames stft() returns for a signal of the given length. */
export const frameCount = (samples: number, nFft: number, hop: number): number => (samples < nFft ? 0 : Math.floor((samples - nFft) / hop) + 1);

/** The centre frequency of each FFT bin. */
export const binFrequencies = (rate: number, nFft: number): Float64Array =>
  Float64Array.from({ length: Math.floor(nFft / 2) + 1 }, (_, k) => (k * rate) / nFft);

/* ---------- the mel scale ---------- */

const F_SP = 200 / 3; // Slaney scale: linear below 1 kHz, 66.67 Hz per mel
const MIN_LOG_HZ = 1000;
const MIN_LOG_MEL = MIN_LOG_HZ / F_SP; // = 15
const LOG_STEP = Math.log(6.4) / 27;

/**
 * Hertz to mel. Two common definitions: the HTK formula 2595 * log10(1 + f/700), and the Slaney
 * version (linear below 1 kHz, logarithmic above) that librosa uses by default and that Whisper's
 * filterbank was built with.
 */
export function hzToMel(hz: number, htk = false): number {
  if (htk) return 2595 * Math.log10(1 + hz / 700);
  return hz < MIN_LOG_HZ ? hz / F_SP : MIN_LOG_MEL + Math.log(hz / MIN_LOG_HZ) / LOG_STEP;
}

export function melToHz(mel: number, htk = false): number {
  if (htk) return 700 * (10 ** (mel / 2595) - 1);
  return mel < MIN_LOG_MEL ? mel * F_SP : MIN_LOG_HZ * Math.exp(LOG_STEP * (mel - MIN_LOG_MEL));
}

/** `count` frequencies evenly spaced on the mel scale from fMin to fMax, both included. */
export function melFrequencies(count: number, fMin: number, fMax: number, htk = false): Float64Array {
  const lo = hzToMel(fMin, htk);
  const hi = hzToMel(fMax, htk);
  return Float64Array.from({ length: count }, (_, i) => melToHz(count === 1 ? lo : lo + ((hi - lo) * i) / (count - 1), htk));
}

/**
 * Triangular mel filterbank, one Float64Array of nFft/2 + 1 weights per band. This follows
 * librosa.filters.mel (norm 'slaney' divides each triangle by its width in Hz, so every band
 * has the same area; 'none' keeps a peak of 1).
 */
export function melFilterbank(
  rate: number,
  nFft: number,
  nMels: number,
  fMin = 0,
  fMax = rate / 2,
  norm: 'slaney' | 'none' = 'slaney',
  htk = false,
): Float64Array[] {
  const freqs = binFrequencies(rate, nFft);
  const edges = melFrequencies(nMels + 2, fMin, fMax, htk);
  const bank: Float64Array[] = [];
  for (let m = 0; m < nMels; m++) {
    const lo = edges[m];
    const mid = edges[m + 1];
    const hi = edges[m + 2];
    const w = new Float64Array(freqs.length);
    for (let k = 0; k < freqs.length; k++) {
      const up = (freqs[k] - lo) / (mid - lo);
      const down = (hi - freqs[k]) / (hi - mid);
      w[k] = Math.max(0, Math.min(up, down));
      if (norm === 'slaney') w[k] *= 2 / (hi - lo);
    }
    bank.push(w);
  }
  return bank;
}

/** Multiply a power spectrum by a filterbank: one number per mel band. */
export function applyFilterbank(bank: Float64Array[], power: ArrayLike<number>): Float64Array {
  const out = new Float64Array(bank.length);
  for (let m = 0; m < bank.length; m++) {
    let s = 0;
    const w = bank[m];
    for (let k = 0; k < w.length; k++) if (w[k] !== 0) s += w[k] * power[k];
    out[m] = s;
  }
  return out;
}

/**
 * Whisper's final steps for one clip's mel energies, given as bands x frames: log10 with a floor of
 * 1e-10, clamp to within 8 (a factor of 10^8 in power) of the loudest value in the clip, then (x + 4) / 4.
 * (Mirrors log_mel_spectrogram in openai/whisper audio.py.)
 */
export function whisperNormalise(mel: Float64Array[]): Float64Array[] {
  const logs = mel.map((band) => Float64Array.from(band, (v) => Math.log10(Math.max(v, 1e-10))));
  let max = -Infinity;
  for (const band of logs) for (const v of band) if (v > max) max = v;
  return logs.map((band) => Float64Array.from(band, (v) => (Math.max(v, max - 8) + 4) / 4));
}

/* ---------- synthesised test sounds (mono, deterministic) ---------- */

/** A pure tone. */
export function sine(freq: number, seconds: number, rate: number, amp = 0.8): Float32Array {
  const n = Math.round(seconds * rate);
  return Float32Array.from({ length: n }, (_, i) => amp * Math.sin((TWO_PI * freq * i) / rate));
}

function fade(x: Float32Array, rate: number, seconds = 0.02): Float32Array {
  const n = Math.min(Math.round(seconds * rate), Math.floor(x.length / 2));
  for (let i = 0; i < n; i++) {
    const g = i / n;
    x[i] *= g;
    x[x.length - 1 - i] *= g;
  }
  return x;
}

/** An exponential sweep from f0 to f1 (Hz) with short fades. */
export function chirp(f0: number, f1: number, seconds: number, rate: number, amp = 0.8): Float32Array {
  const k = f1 / f0;
  const n = Math.round(seconds * rate);
  const c = (TWO_PI * f0 * seconds) / Math.log(k);
  return fade(Float32Array.from({ length: n }, (_, i) => amp * Math.sin(c * (k ** (i / rate / seconds) - 1))), rate);
}

/**
 * Resonances (formants) for an "ah"-like vowel, in Hz, with widths and relative strengths. The first two
 * (about 750 and 940 Hz) are typical values for the open back vowel [ɑ]; the third is a weaker, made-up
 * high resonance added so the picture has something above 2 kHz. Teaching values, not measurements.
 */
export const VOWEL_AH = { formants: [750, 940, 2500], widths: [90, 100, 200], gains: [1, 1, 0.5] } as const;

/**
 * A vowel-like buzz: harmonics of a slowly gliding fundamental, shaped by three resonance peaks.
 * It is a teaching sound, not a real speech synthesiser. Harmonics above the Nyquist limit are left out.
 */
export function vowel(f0Start: number, f0End: number, seconds: number, rate: number, amp = 0.8): Float32Array {
  const n = Math.round(seconds * rate);
  const out = new Float32Array(n);
  let phase = 0;
  const { formants, widths, gains } = VOWEL_AH;
  for (let i = 0; i < n; i++) {
    const f0 = f0Start + ((f0End - f0Start) * i) / n;
    phase += (TWO_PI * f0) / rate;
    let s = 0;
    for (let h = 1; h * f0 < rate / 2 - 100; h++) {
      const f = h * f0;
      let env = 0;
      for (let j = 0; j < formants.length; j++) env += gains[j] / (1 + ((f - formants[j]) / widths[j]) ** 2);
      s += (env / h ** 0.7) * Math.sin(h * phase);
    }
    out[i] = s;
  }
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  for (let i = 0; i < n; i++) out[i] = (out[i] / (peak || 1)) * amp;
  return fade(out, rate);
}

/** `count` hand claps: short bursts of noise that die away quickly, `gap` seconds apart. */
export function claps(count: number, gap: number, rate: number, amp = 0.8, seed = 7): Float32Array {
  const out = new Float32Array(Math.round((count * gap + 0.2) * rate));
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 31 - 1;
  };
  for (let c = 0; c < count; c++) {
    const start = Math.round((0.1 + c * gap) * rate);
    const len = Math.round(0.12 * rate);
    for (let i = 0; i < len && start + i < out.length; i++) out[start + i] = amp * rand() * Math.exp(-i / (0.018 * rate));
  }
  return out;
}

/** Sum of pure tones: tones[i] is the amplitude of the (i + 1)th multiple of `base` Hz. */
export function sumOfTones(base: number, amps: readonly number[], seconds: number, rate: number): Float32Array {
  const n = Math.round(seconds * rate);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let h = 0; h < amps.length; h++) s += amps[h] * Math.sin((TWO_PI * base * (h + 1) * i) / rate);
    out[i] = s;
  }
  return out;
}

/* ---------- decibels ---------- */

/** Power ratio to decibels, floored so silence stays finite. */
export const powerToDb = (p: number, floorDb = -120): number => (p > 0 ? Math.max(floorDb, 10 * Math.log10(p)) : floorDb);
export const dbToPower = (db: number): number => 10 ** (db / 10);
