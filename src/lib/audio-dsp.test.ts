import { describe, expect, it } from 'vitest';
import {
  aliasFrequency,
  applyFilterbank,
  binFrequencies,
  chirp,
  claps,
  dft,
  fft,
  frameCount,
  hann,
  hzToMel,
  melFilterbank,
  melFrequencies,
  melToHz,
  powerSpectrum,
  quantise,
  sine,
  stft,
  sumOfTones,
  vowel,
  whisperNormalise,
} from './audio-dsp';

/*
 * Reference numbers marked "librosa 1.0.0" were produced offline with librosa 1.0.0 and numpy 2.5.4
 * (librosa.hz_to_mel, librosa.mel_frequencies, librosa.filters.mel, np.fft.rfft with a periodic Hann window).
 */

describe('aliasing', () => {
  it('leaves tones below half the rate alone', () => {
    expect(aliasFrequency(440, 16000)).toBe(440);
    expect(aliasFrequency(7999, 16000)).toBe(7999);
  });
  it('folds tones above half the rate back, with a sign for backwards motion', () => {
    expect(aliasFrequency(900, 1000)).toBe(-100);
    expect(aliasFrequency(1100, 1000)).toBe(100);
    expect(aliasFrequency(9000, 16000)).toBe(-7000);
    expect(aliasFrequency(1000, 1000)).toBe(0);
  });
  it('gives the same samples as the folded tone', () => {
    const rate = 1000;
    for (const f of [900, 1100, 1450, 2300]) {
      const fa = aliasFrequency(f, rate);
      for (let n = 0; n < 20; n++) {
        expect(Math.sin((2 * Math.PI * f * n) / rate)).toBeCloseTo(Math.sin((2 * Math.PI * fa * n) / rate), 9);
      }
    }
  });
});

describe('quantise', () => {
  it('uses 2^bits levels spread over -1 to 1', () => {
    const seen = new Set<number>();
    for (let i = 0; i <= 2000; i++) seen.add(Number(quantise(-1 + i / 1000, 3).toFixed(9)));
    expect(seen.size).toBe(8);
    expect(quantise(1, 3)).toBeCloseTo(1, 12);
    expect(quantise(-1, 3)).toBeCloseTo(-1, 12);
    expect(quantise(5, 8)).toBeCloseTo(1, 12);
  });
  it('is closer to the input with more bits', () => {
    const x = 0.3141;
    expect(Math.abs(quantise(x, 16) - x)).toBeLessThan(Math.abs(quantise(x, 4) - x));
    expect(Math.abs(quantise(x, 16) - x)).toBeLessThan(1 / 2 ** 15);
  });
});

describe('windows and the transform', () => {
  it('builds a periodic Hann window', () => {
    const w = hann(8);
    expect(w[0]).toBeCloseTo(0, 12);
    expect(w[4]).toBeCloseTo(1, 12);
    expect(w[2]).toBeCloseTo(0.5, 12);
  });
  it('agrees between the FFT and the plain transform', () => {
    const x = Float64Array.from({ length: 64 }, (_, i) => Math.sin(i * 0.7) + 0.3 * Math.cos(i * 2.1));
    const re = Float64Array.from(x);
    const im = new Float64Array(64);
    fft(re, im);
    const d = dft(x);
    for (let k = 0; k <= 32; k++) {
      expect(re[k]).toBeCloseTo(d.re[k], 9);
      expect(im[k]).toBeCloseTo(d.im[k], 9);
    }
  });
  it('rejects lengths that are not a power of two', () => {
    expect(() => fft(new Float64Array(6), new Float64Array(6))).toThrow();
  });
  it('puts a 1 kHz tone exactly in bin 25 of a 400-sample window at 16 kHz (librosa 1.0.0 / numpy reference)', () => {
    const x = sine(1000, 400 / 16000, 16000, 1);
    const p = powerSpectrum(x, 400, hann(400));
    let peak = 0;
    for (let k = 0; k < p.length; k++) if (p[k] > p[peak]) peak = k;
    expect(peak).toBe(25);
    expect(p[25]).toBeCloseTo(10000, 3); // (N/4)^2 for a unit sine under a Hann window
    expect(p[24]).toBeCloseTo(2500, 3);
    expect(p[26]).toBeCloseTo(2500, 3);
    expect(binFrequencies(16000, 400)[25]).toBe(1000);
  });
  it('spreads a tone between bins when it falls between them (numpy reference)', () => {
    const p = powerSpectrum(sine(1030, 400 / 16000, 16000, 1), 400, hann(400));
    let peak = 0;
    for (let k = 0; k < p.length; k++) if (p[k] > p[peak]) peak = k;
    expect(peak).toBe(26);
    expect(p[26]).toBeCloseTo(9222.479293611916, 2);
  });
  it('slices a signal into overlapping frames', () => {
    expect(frameCount(1000, 400, 160)).toBe(4);
    expect(frameCount(300, 400, 160)).toBe(0);
    expect(stft(new Float32Array(1000), 256, 128).length).toBe(frameCount(1000, 256, 128));
  });
  it('shows the time and frequency trade-off: a longer window separates two close tones', () => {
    const rate = 16000;
    const lo = sine(1000, 0.2, rate, 1);
    const hi = sine(1100, 0.2, rate, 1);
    const a = Float32Array.from(lo, (v, i) => v + hi[i]);
    const dips = (nFft: number) => {
      const p = powerSpectrum(a.subarray(0, nFft), nFft, hann(nFft));
      const bin = (f: number) => Math.round((f * nFft) / rate);
      const between = p[bin(1050)];
      return between / Math.min(p[bin(1000)], p[bin(1100)]);
    };
    expect(dips(2048)).toBeLessThan(0.1); // clear gap between the two peaks
    expect(dips(128)).toBeGreaterThan(0.5); // 125 Hz per bin: the peaks run together
  });
});

describe('mel scale', () => {
  it('matches librosa 1.0.0 for the Slaney scale', () => {
    const f = [100, 440, 1000, 4000, 8000];
    const want = [1.5, 6.6, 15, 35.16376031, 45.24564047];
    f.forEach((hz, i) => expect(hzToMel(hz)).toBeCloseTo(want[i], 6));
  });
  it('matches librosa 1.0.0 for the HTK formula', () => {
    const f = [100, 440, 1000, 4000, 8000];
    const want = [150.48910241, 549.63867538, 999.98553714, 2146.06452751, 2840.02304671];
    f.forEach((hz, i) => expect(hzToMel(hz, true)).toBeCloseTo(want[i], 5));
  });
  it('converts back and forth', () => {
    for (const hz of [0, 50, 999, 1000, 1001, 3000, 8000, 22050]) {
      expect(melToHz(hzToMel(hz))).toBeCloseTo(hz, 6);
      expect(melToHz(hzToMel(hz, true), true)).toBeCloseTo(hz, 6);
    }
  });
  it('spaces frequencies like librosa.mel_frequencies(n_mels=40)', () => {
    const m = melFrequencies(40, 0, 11025);
    expect(m[0]).toBe(0);
    expect(m[1]).toBeCloseTo(85.31725552, 5);
    expect(m[12]).toBeCloseTo(1024.85554588, 5);
    expect(m[13]).toBeCloseTo(1119.11407321, 5);
    expect(m[39]).toBeCloseTo(11025, 6);
  });
  it('is more than twice as fine at 500 Hz as at 6 kHz', () => {
    const lowStep = hzToMel(600) - hzToMel(500);
    const highStep = hzToMel(6100) - hzToMel(6000);
    expect(lowStep / highStep).toBeGreaterThan(5);
  });
});

describe('mel filterbank', () => {
  const bank = melFilterbank(16000, 400, 80);
  it("has Whisper's shape: 80 bands by 201 bins", () => {
    expect(bank.length).toBe(80);
    expect(bank[0].length).toBe(201);
  });
  it('matches librosa.filters.mel(sr=16000, n_fft=400, n_mels=80) at spot checks (librosa 1.0.0)', () => {
    const nz = (w: Float64Array) => {
      const idx = [...w.keys()].filter((k) => w[k] > 0);
      return { first: idx[0], last: idx[idx.length - 1], max: Math.max(...w), sum: w.reduce((a, b) => a + b, 0) };
    };
    const b0 = nz(bank[0]);
    expect([b0.first, b0.last]).toEqual([1, 1]);
    expect(b0.max).toBeCloseTo(0.024862595, 6);
    const b1 = nz(bank[1]);
    expect([b1.first, b1.last]).toEqual([1, 2]);
    expect(b1.max).toBeCloseTo(0.022871772, 6);
    expect(b1.sum).toBeCloseTo(0.024862593, 6);
    const b40 = nz(bank[40]);
    expect([b40.first, b40.last]).toEqual([42, 44]);
    expect(b40.max).toBeCloseTo(0.014735566, 6);
    expect(b40.sum).toBeCloseTo(0.02666486, 6);
    const b79 = nz(bank[79]);
    expect([b79.first, b79.last]).toEqual([186, 199]);
    expect(b79.max).toBeCloseTo(0.0031647119, 6);
    expect(b79.sum).toBeCloseTo(0.02492534, 6);
  });
  it('finds a 1 kHz tone in band 26, with the log10 value librosa/numpy give', () => {
    const p = powerSpectrum(sine(1000, 400 / 16000, 16000, 1), 400, hann(400));
    const mel = applyFilterbank(bank, p);
    let peak = 0;
    for (let m = 0; m < mel.length; m++) if (mel[m] > mel[peak]) peak = m;
    expect(peak).toBe(26);
    expect(mel[26]).toBeCloseTo(229.43868767470116, 2);
    expect(Math.log10(mel[26])).toBeCloseTo(2.360666649951506, 4);
  });
  it('makes narrow bands low down and wide bands high up', () => {
    const width = (w: Float64Array) => w.filter((v) => v > 0).length;
    const wide = melFilterbank(16000, 2048, 40);
    expect(width(wide[39])).toBeGreaterThan(width(wide[2]) * 4);
  });
  it('can keep a peak of 1 instead of equal area', () => {
    const plain = melFilterbank(16000, 2048, 20, 0, 8000, 'none');
    for (const w of plain) expect(Math.max(...w)).toBeLessThanOrEqual(1);
    expect(Math.max(...plain[10])).toBeGreaterThan(0.9);
  });
});

describe('whisperNormalise', () => {
  it('floors at 8 below the maximum, then scales (x + 4) / 4', () => {
    const out = whisperNormalise([Float64Array.from([1e4, 1, 1e-20]), Float64Array.from([10, 0, 100])]);
    expect(out[0][0]).toBeCloseTo((4 + 4) / 4, 12);
    expect(out[0][1]).toBeCloseTo((0 + 4) / 4, 12);
    expect(out[0][2]).toBeCloseTo((4 - 8 + 4) / 4, 12); // floored at max - 8 = -4
    expect(out[1][1]).toBeCloseTo(0, 12); // 1e-10 (floor) is below max - 8 = -4
  });
});

describe('synthesised sounds', () => {
  it('are deterministic, finite and not louder than full scale', () => {
    const sounds = [chirp(200, 6000, 0.5, 16000), vowel(110, 130, 0.5, 16000), claps(2, 0.3, 16000), sumOfTones(200, [1, 0.5], 0.1, 16000)];
    for (const s of sounds) {
      expect(s.length).toBeGreaterThan(0);
      for (const v of s) {
        expect(Number.isFinite(v)).toBe(true);
        expect(Math.abs(v)).toBeLessThanOrEqual(2);
      }
    }
    expect(claps(2, 0.3, 16000)).toEqual(claps(2, 0.3, 16000));
  });
  it('sweep: energy climbs in frequency over time', () => {
    const rate = 16000;
    const x = chirp(200, 6000, 1, rate);
    const frames = stft(x, 512, 512);
    const peakBin = (p: Float64Array) => p.indexOf(Math.max(...p));
    expect(peakBin(frames[Math.floor(frames.length * 0.8)])).toBeGreaterThan(peakBin(frames[Math.floor(frames.length * 0.2)]));
  });
  it('vowel: has harmonics of its fundamental, strongest near the lowest resonances', () => {
    const rate = 16000;
    const x = vowel(125, 125, 0.5, rate);
    const p = powerSpectrum(x.subarray(2000, 2000 + 2048), 2048, hann(2048));
    const f = (k: number) => (k * rate) / 2048;
    let best = 0;
    for (let k = 0; k < p.length; k++) if (p[k] > p[best]) best = k;
    expect(Math.abs(f(best) - 750)).toBeLessThan(130); // a harmonic of 125 Hz close to 750 Hz
    // a harmonic (1000 Hz = 8 x 125) is far above the dip between harmonics (937.5 Hz)
    const bin = (hz: number) => Math.round((hz * 2048) / rate);
    expect(p[bin(1000)]).toBeGreaterThan(p[bin(937.5)] * 20);
  });
  it('clap: energy is spread over the whole range, but only for a moment', () => {
    const rate = 16000;
    const x = claps(1, 0.4, rate);
    const burst = x.subarray(Math.round(0.1 * rate), Math.round(0.1 * rate) + 256);
    const tail = x.subarray(Math.round(0.3 * rate), Math.round(0.3 * rate) + 256);
    const energy = (a: Float32Array) => a.reduce((s, v) => s + v * v, 0);
    expect(energy(burst)).toBeGreaterThan(energy(tail) * 100);
  });
});
