import { describe, expect, it } from 'vitest';
import { fft } from './audio-dsp';
import {
  BAND_EDGES,
  BINS,
  HOP,
  N_BANDS,
  N_FFT,
  RATE,
  analyse,
  bandOfBin,
  computeGains,
  db,
  estimateNoisePower,
  frameCountFor,
  ifftReal,
  isolatedBlips,
  leadInFrames,
  makeNoise,
  measure,
  mixAtSnr,
  rms,
  speechLike,
  synthesise,
  type NoiseKind,
  type Params,
} from './denoise';

const base: Omit<Params, 'method'> = { bandCutDb: new Array(N_BANDS).fill(0), alpha: 2, maxCutDb: 20 };

function setup(kind: NoiseKind, snr = 5) {
  const clean = speechLike();
  const { noise, mix } = mixAtSnr(clean, makeNoise(kind), snr);
  const cs = analyse(clean);
  const ns = analyse(noise);
  const ms = analyse(mix);
  const np = estimateNoisePower(ms);
  const run = (p: Params) => measure(clean, noise, cs, ns, computeGains(ms, p, np, cs, ns));
  return { clean, noise, mix, cs, ns, ms, np, run };
}

describe('transform', () => {
  it('the inverse FFT undoes the FFT', () => {
    const re = Float64Array.from({ length: 64 }, (_, i) => Math.sin(i * 0.7) + (i % 5));
    const im = Float64Array.from({ length: 64 }, (_, i) => Math.cos(i * 0.3));
    const a = Float64Array.from(re);
    const b = Float64Array.from(im);
    fft(a, b);
    const back = ifftReal(a, b);
    for (let i = 0; i < 64; i++) expect(back[i]).toBeCloseTo(re[i], 10);
  });
  it('analysis then synthesis returns the signal (perfect reconstruction)', () => {
    const x = speechLike();
    const y = synthesise(analyse(x), x.length);
    let worst = 0;
    for (let i = 0; i < x.length; i++) worst = Math.max(worst, Math.abs(x[i] - y[i]));
    expect(worst).toBeLessThan(1e-6);
  });
  it('has the expected frame count and lead-in frames', () => {
    expect(frameCountFor(RATE * 2.4)).toBe(Math.ceil((RATE * 2.4 + N_FFT) / HOP) + 1);
    const lead = leadInFrames();
    expect(lead.length).toBeGreaterThan(20);
    expect(lead[0] * HOP - N_FFT).toBeGreaterThanOrEqual(0);
  });
  it('bands cover 0 to 8 kHz', () => {
    expect(BAND_EDGES[0]).toBe(0);
    expect(BAND_EDGES[N_BANDS]).toBe(8000);
    expect(bandOfBin(0)).toBe(0);
    expect(bandOfBin(BINS - 1)).toBe(N_BANDS - 1);
    expect(bandOfBin(Math.round((1000 * N_FFT) / RATE) + 1)).toBe(3);
  });
});

describe('test signals', () => {
  it('the speech-like clip has rms 0.1 and a silent lead-in', () => {
    const x = speechLike();
    expect(rms(x)).toBeCloseTo(0.1, 6);
    expect(rms(x.slice(0, Math.round(0.4 * RATE)))).toBe(0);
  });
  it('mixing sets the signal-to-noise ratio exactly', () => {
    const clean = speechLike();
    for (const kind of ['hiss', 'rumble', 'babble'] as NoiseKind[]) {
      for (const snr of [-5, 0, 10]) {
        const { noise } = mixAtSnr(clean, makeNoise(kind), snr);
        expect(db((rms(clean) / rms(noise)) ** 2)).toBeCloseTo(snr, 4);
      }
    }
  });
  it('is deterministic', () => {
    expect(makeNoise('babble')[1234]).toBe(makeNoise('babble')[1234]);
  });
});

describe('masks', () => {
  it('keeps every gain between the floor and 1', () => {
    const { ms, np, cs, ns } = setup('hiss');
    for (const method of ['subtract', 'wiener', 'oracle'] as const) {
      const g = computeGains(ms, { ...base, method, maxCutDb: 12 }, np, cs, ns);
      const floor = 10 ** (-12 / 20);
      for (const row of g) for (const v of row) {
        expect(v).toBeGreaterThanOrEqual(floor - 1e-12);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
  it('a hand-made mask applies the chosen cut to every bin of a band, whatever the signal does', () => {
    const { ms, np } = setup('hiss');
    const cuts = [0, 6, 12, 18, 24, 30, 36, 40];
    const g = computeGains(ms, { ...base, method: 'manual', bandCutDb: cuts }, np);
    for (const k of [0, 10, 40, 100, 200, 256]) expect(g[50][k]).toBeCloseTo(10 ** (-cuts[bandOfBin(k)] / 20), 12);
  });
  it('no cut at all changes nothing', () => {
    const { run } = setup('hiss');
    const r = run({ ...base, method: 'manual' });
    expect(r.improvement).toBeCloseTo(0, 6);
    expect(r.speechKept).toBeGreaterThan(60);
  });
});

describe('what the lesson says about them (examples at 5 dB SNR)', () => {
  it('spectral subtraction helps a lot against steady hiss', () => {
    const { run } = setup('hiss');
    expect(run({ ...base, method: 'subtract' }).improvement).toBeGreaterThan(6);
  });
  it('but much less against babble, whose noise estimate is wrong, while an oracle mask still copes', () => {
    const hiss = setup('hiss').run({ ...base, method: 'subtract' }).improvement;
    const b = setup('babble');
    const ss = b.run({ ...base, method: 'subtract' }).improvement;
    const oracle = b.run({ ...base, method: 'oracle' }).improvement;
    expect(ss).toBeLessThan(hiss - 5);
    expect(oracle).toBeGreaterThan(ss + 3);
  });
  it('subtracting harder raises the SNR but damages the speech more', () => {
    const { run } = setup('hiss');
    const light = run({ ...base, method: 'subtract', alpha: 1, maxCutDb: 60 });
    const heavy = run({ ...base, method: 'subtract', alpha: 3, maxCutDb: 60 });
    expect(heavy.improvement).toBeGreaterThan(light.improvement);
    expect(heavy.speechKept).toBeLessThan(light.speechKept);
  });
  it('light subtraction with no floor leaves isolated blips in the pauses; a high floor or heavy subtraction does not', () => {
    const { run } = setup('hiss');
    expect(run({ ...base, method: 'subtract', alpha: 1, maxCutDb: 60 }).blips).toBeGreaterThan(20);
    expect(run({ ...base, method: 'subtract', alpha: 3, maxCutDb: 60 }).blips).toBe(0);
    expect(run({ ...base, method: 'subtract', alpha: 1, maxCutDb: 6 }).blips).toBe(0);
  });
  it('a fixed low-frequency cut cleans rumble but does not help hiss', () => {
    const cut = [30, 12, 0, 0, 0, 0, 0, 0];
    expect(setup('rumble').run({ ...base, method: 'manual', bandCutDb: cut }).improvement).toBeGreaterThan(10);
    expect(setup('hiss').run({ ...base, method: 'manual', bandCutDb: cut }).improvement).toBeLessThan(0);
  });
  it('counts blips only in isolation', () => {
    const lead = leadInFrames();
    const g = Array.from({ length: lead[lead.length - 1] + 2 }, () => new Float64Array(BINS).fill(0.01));
    g[lead[3]][50] = 1;
    expect(isolatedBlips(g)).toBeGreaterThan(0);
    g[lead[3]][51] = 1; // a neighbour survives, so the first is no longer isolated, and neither is the second
    expect(isolatedBlips(g)).toBe(0);
  });
});
