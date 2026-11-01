/*
 * Two small calculations for the hearing-device part of the noise-suppression lesson:
 * the pattern of a two-microphone directional array, and a delay budget.
 */

export const SPEED_OF_SOUND = 343; // metres per second in air at about 20 degrees C

/* ---------- first-order differential (two-microphone) directional pattern ---------- */

/**
 * Two omnidirectional microphones a distance d apart on a line. The rear signal is delayed by tau and subtracted
 * from the front one. A plane wave from angle theta (0 = straight ahead) then gives a response of size
 * 2 |sin(k (cos theta + r) / 2)| relative to one microphone, where k = 2 pi f d / c is the wave number times the spacing
 * and r = tau c / d is the internal delay as a fraction of the time sound takes to cross the gap.
 * With r = 1 the response is zero at 180 degrees (a cardioid, at low frequencies).
 */
export const waveNumber = (freqHz: number, spacingM: number): number => (2 * Math.PI * freqHz * spacingM) / SPEED_OF_SOUND;

export const patternGain = (k: number, r: number, theta: number): number => 2 * Math.abs(Math.sin((k * (Math.cos(theta) + r)) / 2));

/** The internal delay in microseconds for a spacing (metres) and delay ratio r. */
export const internalDelayUs = (spacingM: number, r: number): number => ((r * spacingM) / SPEED_OF_SOUND) * 1e6;

/** Level straight ahead compared with a single omnidirectional microphone, in dB. */
export const onAxisDb = (freqHz: number, spacingM: number, r: number): number => 20 * Math.log10(Math.max(patternGain(waveNumber(freqHz, spacingM), r, 0), 1e-12));

/** Front (0 degrees) to back (180 degrees) ratio in dB. Large when the rear is nearly cancelled. */
export function frontBackDb(freqHz: number, spacingM: number, r: number): number {
  const k = waveNumber(freqHz, spacingM);
  return 20 * Math.log10(Math.max(patternGain(k, r, 0), 1e-12) / Math.max(patternGain(k, r, Math.PI), 1e-12));
}

/** Where the response is zero at low frequencies: cos(theta) = -r, so only for r up to 1. Degrees, or null. */
export const nullAngleDeg = (r: number): number | null => (r <= 1 ? (Math.acos(-r) * 180) / Math.PI : null);

/** Points of the pattern (angle in radians, 0 to pi; the pattern is mirror-symmetric) scaled so the biggest is 1. */
export function polar(freqHz: number, spacingM: number, r: number, steps = 90): { theta: number; g: number }[] {
  const k = waveNumber(freqHz, spacingM);
  const pts = Array.from({ length: steps + 1 }, (_, i) => {
    const theta = (Math.PI * i) / steps;
    return { theta, g: patternGain(k, r, theta) };
  });
  const max = Math.max(...pts.map((p) => p.g), 1e-12);
  return pts.map((p) => ({ theta: p.theta, g: p.g / max }));
}

/* ---------- delay budget ---------- */

/** Time to collect one analysis window, in milliseconds. */
export const windowMs = (samples: number, rate: number): number => (samples / rate) * 1000;

/** Findings from the hearing-aid delay literature and from enhancement papers, as quoted in the lesson. */
export const DELAY_MARKERS = [
  { ms: 5, label: 'about 5 to 6 ms', note: 'Rated "just acceptable" for simulated open-fit hearing aids (Stone et al., 2008)' },
  { ms: 10, label: '10 ms', note: 'Objectionable in 90% of trials when listeners heard their own voice (Agnew and Thornton, 2000)' },
  { ms: 20, label: '20 to 30 ms', note: 'Rated "disturbing" for mild to moderate simulated losses (Stone and Moore, 1999)' },
  { ms: 40, label: '40 ms', note: 'Frame length plus look-ahead limit set for the 2020 Deep Noise Suppression Challenge (calls, not hearing aids)' },
] as const;

export type DelayPreset = { id: string; label: string; windowMs: number; lookaheadMs: number; source: string };
/** Window and look-ahead as reported in the cited papers. */
export const DELAY_PRESETS: DelayPreset[] = [
  { id: 'stft32', label: 'Plain 32 ms STFT', windowMs: 32, lookaheadMs: 0, source: 'The lab above: 512 samples at 16 kHz' },
  { id: 'rnnoise', label: 'RNNoise-style', windowMs: 20, lookaheadMs: 0, source: 'Valin, 2018: 20 ms windows, 10 ms offset' },
  { id: 'demucs', label: 'Causal Demucs', windowMs: 37, lookaheadMs: 3, source: 'Defossez et al., 2020: 37 ms frame, 3 ms look-ahead, 40 ms in total' },
  { id: 'asym', label: 'Asymmetric windows', windowMs: 4, lookaheadMs: 0, source: 'A 2023 Clarity challenge entry reports a 16 ms window but 4 ms algorithmic latency' },
];

export const totalDelayMs = (windowMsValue: number, lookaheadMs: number, otherMs: number): number => windowMsValue + lookaheadMs + otherMs;
