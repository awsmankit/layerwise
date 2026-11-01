import { describe, expect, it } from 'vitest';
import { RATE, VOWELS, codecBudget, isVoiced, melDb, normaliseText, planProsody, speak, synthesise, wordToPhones, type Plan, type Segment } from './toy-tts';
import { hann, hzToMel, melFrequencies, powerSpectrum } from './audio-dsp';

const one = (ph: Segment['ph'], ms: number, f0 = 120): Plan => ({ segments: [{ ph, ms, f0: isVoiced(ph) ? f0 : 0, word: 0, stressed: true }], totalMs: ms, question: false });
const clipPower = (x: Float32Array, nFft = 4096) => {
  const mid = Math.max(0, Math.floor(x.length / 2 - nFft / 2));
  return powerSpectrum(x.subarray(mid, mid + nFft), nFft, hann(nFft));
};
const bandEnergy = (p: Float64Array, lo: number, hi: number, nFft = 4096) => {
  let s = 0;
  for (let k = 0; k < p.length; k++) {
    const f = (k * RATE) / nFft;
    if (f >= lo && f <= hi) s += p[k];
  }
  return s;
};
const centroid = (p: Float64Array, nFft = 4096) => {
  let num = 0;
  let den = 0;
  for (let k = 1; k < p.length; k++) {
    num += ((k * RATE) / nFft) * p[k];
    den += p[k];
  }
  return num / den;
};
/** Pitch by autocorrelation, searching 60 to 400 Hz. */
const pitch = (x: Float32Array) => {
  const seg = x.subarray(Math.floor(x.length * 0.3), Math.floor(x.length * 0.3) + 3200);
  let best = 0;
  let bestLag = 0;
  for (let lag = Math.floor(RATE / 400); lag <= Math.floor(RATE / 60); lag++) {
    let s = 0;
    for (let i = 0; i + lag < seg.length; i++) s += seg[i] * seg[i + lag];
    if (s > best) {
      best = s;
      bestLag = lag;
    }
  }
  return RATE / bestLag;
};

describe('text normalisation', () => {
  it('spells out numbers and currency and keeps the punctuation that matters', () => {
    const { tokens, changes } = normaliseText('I owe you £5, 12 times.');
    expect(tokens.map((t) => t.text)).toEqual(['i', 'owe', 'you', 'five', 'pounds', ',', 'twelve', 'times', '.']);
    expect(changes).toEqual([
      { from: '£5', to: 'five pounds' },
      { from: '12', to: 'twelve' },
    ]);
  });
  it('reads long digit strings one digit at a time and expands abbreviations', () => {
    expect(normaliseText('call 2024').tokens.map((t) => t.text)).toEqual(['call', 'two', 'zero', 'two', 'four']);
    expect(normaliseText('Dr Who & 50%').tokens.map((t) => t.text)).toEqual(['doctor', 'who', 'and', 'fifty', 'percent']);
  });
  it('treats a question mark as its own mark and drops what it cannot say', () => {
    expect(normaliseText('Really?! (yes)').tokens.map((t) => t.text)).toEqual(['really', '?', '.', 'yes']);
  });
  it('gives nothing for empty text', () => {
    expect(normaliseText('').tokens).toEqual([]);
  });
});

describe('letters to sounds', () => {
  it('looks common words up in the lexicon', () => {
    expect(wordToPhones('the')).toEqual({ phones: ['th', 'e'], source: 'lexicon' });
    expect(wordToPhones('Hello').source).toBe('lexicon');
  });
  it('falls back to spelling rules, with digraphs, doubled letters and a silent final e', () => {
    expect(wordToPhones('ship')).toEqual({ phones: ['sh', 'i', 'p'], source: 'rules' });
    expect(wordToPhones('make').phones).toEqual(['m', 'a', 'k']);
    expect(wordToPhones('letter').phones).toEqual(['l', 'e', 't', 'e', 'r']);
    expect(wordToPhones('see').phones).toEqual(['s', 'i']);
    expect(wordToPhones('city').phones).toEqual(['s', 'i', 't', 'i']);
    expect(wordToPhones('cat').phones).toEqual(['k', 'a', 't']);
  });
  it('reads every letter it knows, so silent letters are said aloud: spelling is not pronunciation', () => {
    // "knight" has a silent k and gh in English; the rules read every letter they know.
    expect(wordToPhones('knight').phones).toEqual(['k', 'n', 'i', 'k', 'h', 't']);
  });
  it('only ever returns phones the synthesiser can say', () => {
    for (const w of ['quick', 'brown', 'jumps', 'zebra', 'xylophone', 'why', 'yes', 'church']) {
      for (const p of wordToPhones(w).phones) expect(typeof p).toBe('string');
    }
    expect(VOWELS).toContain('ah');
  });
});

describe('prosody', () => {
  const opts = { basePitch: 120, speed: 1 };
  const tokens = normaliseText('is it ready.').tokens;
  it('gives every word sounds, separated by short pauses, and ends with a pause for the full stop', () => {
    const plan = planProsody(tokens, opts);
    expect(plan.segments[plan.segments.length - 1].ph).toBe('pause');
    expect(plan.segments.filter((s) => s.ph === 'pause').length).toBe(3);
    expect(plan.totalMs).toBeCloseTo(plan.segments.reduce((a, s) => a + s.ms, 0), 9);
  });
  it('twice the speed takes half the time', () => {
    const slow = planProsody(tokens, opts).totalMs;
    expect(planProsody(tokens, { ...opts, speed: 2 }).totalMs).toBeCloseTo(slow / 2, 6);
  });
  it('stresses the first vowel of content words only, with a longer and higher sound', () => {
    const plan = planProsody(normaliseText('the cat').tokens, opts);
    const stressed = plan.segments.filter((s) => s.stressed);
    expect(stressed).toHaveLength(1);
    expect(stressed[0].word).toBe(1);
    expect(stressed[0].ms).toBeCloseTo(110 * 1.2, 9);
  });
  it('lets a question rise at the end and a statement fall', () => {
    const lastVoiced = (text: string) => {
      const plan = planProsody(normaliseText(text).tokens, opts);
      const v = plan.segments.filter((s) => s.f0 > 0);
      return { first: v[0].f0, last: v[v.length - 1].f0 };
    };
    const q = lastVoiced('is it ready?');
    const s = lastVoiced('is it ready.');
    expect(q.last).toBeGreaterThan(q.first);
    expect(s.last).toBeLessThan(s.first);
    expect(q.last).toBeGreaterThan(s.last * 1.2);
  });
  it('does not stress or pitch anything for silence', () => {
    expect(planProsody([], opts).segments).toEqual([]);
    expect(planProsody([{ kind: 'punct', text: '.' }], opts).segments.every((x) => x.ph === 'pause' && x.f0 === 0)).toBe(true);
  });
});

describe('the formant synthesiser', () => {
  it('is deterministic and has the planned length and a peak of 0.8', () => {
    const plan = planProsody(normaliseText('hello world.').tokens, { basePitch: 120, speed: 1 });
    const a = synthesise(plan);
    const b = synthesise(plan);
    expect(Array.from(a.subarray(0, 2000))).toEqual(Array.from(b.subarray(0, 2000)));
    expect(Math.abs(a.length - Math.round((plan.totalMs / 1000) * RATE))).toBeLessThan(plan.segments.length + 1);
    expect(Math.max(...Array.from(a, Math.abs))).toBeCloseTo(0.8, 2);
  });
  it('is silent when there is nothing to say', () => {
    expect(synthesise(planProsody([], { basePitch: 120, speed: 1 })).length).toBe(0);
    const quiet = synthesise(one('pause', 100));
    expect(Math.max(...Array.from(quiet, Math.abs))).toBe(0);
  });
  it('buzzes at the planned pitch', () => {
    for (const f0 of [100, 150, 200]) {
      const est = pitch(synthesise(one('ah', 700, f0)));
      expect(Math.abs(est - f0) / f0).toBeLessThan(0.04);
    }
  });
  it('puts energy near the resonances: "ee" is bright around 2.3 kHz, "ah" is strong around 0.9 kHz', () => {
    const ee = clipPower(synthesise(one('i', 600)));
    const ah = clipPower(synthesise(one('ah', 600)));
    expect(bandEnergy(ee, 2000, 2600)).toBeGreaterThan(5 * bandEnergy(ee, 700, 1200));
    expect(bandEnergy(ah, 700, 1200)).toBeGreaterThan(5 * bandEnergy(ah, 2000, 2600));
  });
  it('hisses higher for "s" than for "sh", and both are well above a vowel', () => {
    const s = centroid(clipPower(synthesise(one('s', 400))));
    const sh = centroid(clipPower(synthesise(one('sh', 400))));
    const ah = centroid(clipPower(synthesise(one('ah', 400))));
    expect(s).toBeGreaterThan(sh + 1000);
    expect(sh).toBeGreaterThan(ah + 800);
  });
  it('makes a stop as silence followed by a short burst', () => {
    const x = synthesise(one('t', 300));
    const n = x.length;
    const early = Math.max(...Array.from(x.subarray(Math.floor(n * 0.1), Math.floor(n * 0.5)), Math.abs));
    const burst = Math.max(...Array.from(x.subarray(Math.floor(n * 0.66), Math.floor(n * 0.8)), Math.abs));
    expect(early).toBeLessThan(0.02);
    expect(burst).toBeGreaterThan(0.3);
  });
  it('runs the whole path from text', () => {
    const r = speak('Dr Who paid £5.', { basePitch: 130, speed: 1.1 });
    expect(r.changes.map((c) => c.from)).toEqual(['dr', '£5']);
    expect(r.samples.length).toBeGreaterThan(RATE / 2);
  });
});

describe('the log-mel picture', () => {
  it('has 64 bands per frame, a 5 ms hop, a top of 0 dB and a floor at -70', () => {
    const x = synthesise(one('ah', 500));
    const m = melDb(x);
    expect(m[0]).toHaveLength(64);
    expect(m.length).toBe(Math.floor((x.length - 512) / 80) + 1);
    const all = m.flatMap((f) => Array.from(f));
    expect(Math.max(...all)).toBeCloseTo(0, 6);
    expect(Math.min(...all)).toBeGreaterThanOrEqual(-70);
  });
  it('puts a vowel in the low bands and an "s" in the high ones', () => {
    const peakBand = (ph: Segment['ph']) => {
      const m = melDb(synthesise(one(ph, 400)));
      const mid = m[Math.floor(m.length / 2)];
      return mid.indexOf(Math.max(...Array.from(mid)));
    };
    const edges = melFrequencies(66, 0, 8000);
    expect(edges[peakBand('ah') + 1]).toBeLessThan(2000);
    expect(edges[peakBand('s') + 1]).toBeGreaterThan(4000);
    expect(hzToMel(1000)).toBeCloseTo(15, 9);
  });
});

describe('codec token arithmetic', () => {
  it('matches the EnCodec and VALL-E settings: 75 frames a second, 8 quantizers of 10 bits is 6 kbit/s', () => {
    expect(codecBudget(3, 8)).toEqual({ frames: 225, codes: 1800, kbps: 6 });
    expect(codecBudget(10, 8).codes).toBe(6000);
    expect(codecBudget(1, 32).kbps).toBe(24);
    expect(codecBudget(1, 2).kbps).toBe(1.5);
  });
});
