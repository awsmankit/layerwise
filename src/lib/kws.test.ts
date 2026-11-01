import { describe, expect, it } from 'vitest';
import {
  audioBufferBytes,
  buildStream,
  cascadePowerMw,
  CLIP_SECONDS,
  falseAcceptSources,
  falseAcceptsPerHour,
  featureWindowBytes,
  findTriggers,
  frameEndSec,
  HOP,
  KEYWORD_COUNT,
  keywordSound,
  keywordTemplate,
  KWS_RATE,
  logMelFrames,
  makeClip,
  matchScores,
  median,
  resampleTo16k,
  ROOMS,
  rms,
  runDetector,
  scoreTriggers,
  smoothScores,
  STREAM_SECONDS,
  sweepThresholds,
  WIN,
  BANDS,
  type StreamEvent,
} from './kws';
import { sine } from './audio-dsp';

describe('front end', () => {
  it('gives one 40-band frame per 20 ms hop', () => {
    const x = sine(440, 1, KWS_RATE);
    const f = logMelFrames(x);
    expect(f.length).toBe(Math.floor((KWS_RATE - WIN) / HOP) + 1);
    expect(f[0].length).toBe(BANDS);
    expect(f.every((fr) => Array.from(fr).every(Number.isFinite))).toBe(true);
  });
  it('puts a 1 kHz tone in a mel band near 1 kHz', () => {
    const f = logMelFrames(sine(1000, 0.5, KWS_RATE));
    const fr = f[5];
    const peak = fr.indexOf(Math.max(...fr));
    // with 40 bands from 50 Hz to 8 kHz the band centres near 1 kHz sit around band 14 to 17
    expect(peak).toBeGreaterThan(11);
    expect(peak).toBeLessThan(20);
  });
  it('dates frames by the time their last sample arrived', () => {
    expect(frameEndSec(0)).toBeCloseTo(WIN / KWS_RATE, 12);
    expect(frameEndSec(1) - frameEndSec(0)).toBeCloseTo(HOP / KWS_RATE, 12);
  });
});

describe('the stand-in model', () => {
  const tpl = keywordTemplate();
  it('covers the keyword plus a margin', () => {
    expect(tpl.frames).toBeGreaterThan(30);
    expect(tpl.frames).toBeLessThan(60);
    expect(tpl.norm).toBeGreaterThan(0);
  });
  it('scores the keyword high and plain noise low', () => {
    const kw = Math.max(...matchScores(logMelFrames(makeClip('keyword', 12))));
    const noise = Math.max(...matchScores(logMelFrames(makeClip('noise', 0))));
    expect(kw).toBeGreaterThan(0.75);
    expect(noise).toBeLessThan(0.3);
  });
  it('scores the keyword backwards and claps lower than the keyword', () => {
    const kw = Math.max(...matchScores(logMelFrames(makeClip('keyword', 12))));
    const rev = Math.max(...matchScores(logMelFrames(makeClip('reverse', 12))));
    const cl = Math.max(...matchScores(logMelFrames(makeClip('claps', 12))));
    expect(rev).toBeLessThan(kw - 0.2);
    expect(cl).toBeLessThan(kw - 0.4);
  });
  it('scores are in [0, 1] and 0 before a full patch is available', () => {
    const s = matchScores(logMelFrames(makeClip('keyword', 6)));
    expect(s.length).toBe(Math.floor((Math.round(CLIP_SECONDS * KWS_RATE) - WIN) / HOP) + 1);
    expect(s[0]).toBe(0);
    for (const v of s) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
  it('does not care how loud the clip is (the front end removes level)', () => {
    const a = makeClip('keyword', 12);
    const b = a.map((v) => v * 5);
    const sa = Math.max(...matchScores(logMelFrames(a)));
    const sb = Math.max(...matchScores(logMelFrames(b)));
    expect(sb).toBeCloseTo(sa, 3);
  });
});

describe('synthesised sounds', () => {
  it('make a 650 ms keyword at normal speed and a shorter one when faster', () => {
    expect(keywordSound(140, 1).length).toBe(Math.round(0.65 * KWS_RATE));
    expect(keywordSound(140, 1.25).length).toBe(Math.round((0.65 / 1.25) * KWS_RATE));
  });
  it('are repeatable', () => {
    expect(Array.from(keywordSound(120, 1).slice(0, 50))).toEqual(Array.from(keywordSound(120, 1).slice(0, 50)));
    expect(Array.from(makeClip('claps', 6, 3).slice(0, 50))).toEqual(Array.from(makeClip('claps', 6, 3).slice(0, 50)));
  });
  it('mixes a sound at the requested signal-to-noise ratio', () => {
    const clip = makeClip('keyword', 12);
    const noiseOnly = makeClip('noise', 0);
    const at = Math.round(0.35 * KWS_RATE);
    const len = keywordSound(150, 1).length;
    const mixed = clip.slice(at, at + len);
    const noise = noiseOnly.slice(at, at + len);
    const sig = mixed.map((v, i) => v - noise[i]);
    expect(20 * Math.log10(rms(sig) / rms(noise))).toBeGreaterThan(11);
    expect(20 * Math.log10(rms(sig) / rms(noise))).toBeLessThan(13);
  });
});

describe('smoothing and triggers', () => {
  it('averages the latest frames, and fewer at the start', () => {
    expect(Array.from(smoothScores([1, 0, 1, 0], 2))).toEqual([1, 0.5, 0.5, 0.5]);
    expect(Array.from(smoothScores([3, 3, 3], 1))).toEqual([3, 3, 3]);
  });
  it('fires once per rise and waits for the score to fall before arming again', () => {
    expect(findTriggers([0, 0.9, 0.9, 0.9, 0, 0.9], 0.5, 2)).toEqual([1, 5]);
    expect(findTriggers([0, 0.9, 0.2, 0.9], 0.5, 5)).toEqual([1]); // refractory period blocks the second
    expect(findTriggers([0, 0.9, 0.2, 0.9], 0.5, 2)).toEqual([1, 3]);
  });
  it('fires on the very first frame if it is already above the threshold', () => {
    expect(findTriggers([0.9, 0.9], 0.5, 1)).toEqual([0]);
  });
});

describe('scoring triggers against labelled events', () => {
  const events: StreamEvent[] = [
    { kind: 'keyword', startSec: 1, endSec: 1.6, snrDb: 10 },
    { kind: 'claps', startSec: 4, endSec: 4.5, snrDb: 10 },
    { kind: 'keyword', startSec: 7, endSec: 7.6, snrDb: 10 },
  ];
  it('counts hits, misses and false accepts', () => {
    const r = scoreTriggers([1.7, 4.2], events);
    expect(r.hits).toBe(1);
    expect(r.misses).toBe(1);
    expect(r.falseAccepts).toBe(1);
    expect(r.keywords).toBe(2);
    expect(r.delaysSec[0]).toBeCloseTo(0.1, 9);
  });
  it('lets a keyword be hit only once and gives a late trigger no credit', () => {
    const r = scoreTriggers([1.2, 1.5, 2.5], events);
    expect(r.hits).toBe(1);
    expect(r.falseAccepts).toBe(2);
  });
  it('names the sound each false accept fired during', () => {
    const times = [1.7, 4.2, 5.9];
    const r = scoreTriggers(times, events);
    expect(falseAcceptSources(times, events, r)).toEqual(['claps', 'background']);
  });
  it('takes the median of delays', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNaN();
  });
  it('turns a count into a rate per hour', () => {
    expect(falseAcceptsPerHour(2, 120)).toBe(60);
    expect(falseAcceptsPerHour(0, 120)).toBe(0);
  });
});

describe('the practice stream', () => {
  const quiet = buildStream(11, ROOMS.quiet);
  it('is two minutes with 12 keywords and 22 other sounds that do not overlap', () => {
    expect(quiet.seconds).toBe(STREAM_SECONDS);
    expect(quiet.samples.length).toBe(STREAM_SECONDS * KWS_RATE);
    expect(quiet.events.length).toBe(34);
    expect(quiet.events.filter((e) => e.kind === 'keyword').length).toBe(KEYWORD_COUNT);
    for (let i = 1; i < quiet.events.length; i++) expect(quiet.events[i].startSec).toBeGreaterThan(quiet.events[i - 1].endSec + 0.3);
    expect(quiet.events[0].startSec).toBeGreaterThan(1);
    expect(quiet.events[quiet.events.length - 1].endSec).toBeLessThan(STREAM_SECONDS);
  });
  it('is repeatable, and the noisy room has the same events at lower levels', () => {
    const again = buildStream(11, ROOMS.quiet);
    expect(again.events).toEqual(quiet.events.map((e) => ({ ...e })));
    const noisy = buildStream(11, ROOMS.noisy);
    expect(noisy.events.map((e) => e.kind)).toEqual(quiet.events.map((e) => e.kind));
    expect(noisy.events[0].snrDb).toBeCloseTo(quiet.events[0].snrDb + (ROOMS.noisy - ROOMS.quiet), 9);
  });
  const frames = logMelFrames(quiet.samples);
  const scores = matchScores(frames);
  it('has a threshold that finds most keywords with few false accepts, but none that is perfect', () => {
    const sweep = sweepThresholds(scores, quiet.events, 5);
    const best = sweep.reduce((a, b) => (a.misses + a.falseAccepts <= b.misses + b.falseAccepts ? a : b));
    expect(best.misses + best.falseAccepts).toBeLessThanOrEqual(4);
    expect(best.misses + best.falseAccepts).toBeGreaterThan(0);
    const low = sweep[0];
    const high = sweep[sweep.length - 1];
    expect(low.falseAccepts).toBeGreaterThan(10);
    expect(low.misses).toBeLessThanOrEqual(1);
    expect(high.misses).toBe(KEYWORD_COUNT);
    expect(high.falseAccepts).toBe(0);
  });
  it('lets runDetector trigger near the end of the words it finds', () => {
    const r = runDetector(scores, quiet.events, 0.6, 5);
    expect(r.result.hits).toBeGreaterThanOrEqual(8);
    expect(Math.abs(median(r.result.delaysSec))).toBeLessThan(0.5);
    expect(r.triggerTimes.length).toBe(r.triggerFrames.length);
  });
  it('gives the numbers quoted in the lesson at the default setting (threshold 0.5, 100 ms smoothing)', () => {
    const q = runDetector(scores, quiet.events, 0.5, 5).result;
    expect([q.hits, q.misses, q.falseAccepts]).toEqual([12, 0, 4]);
    const noisy = buildStream(11, ROOMS.noisy);
    const n = runDetector(matchScores(logMelFrames(noisy.samples)), noisy.events, 0.5, 5).result;
    expect([n.hits, n.misses, n.falseAccepts]).toEqual([9, 3, 3]);
    const hi = runDetector(scores, quiet.events, 0.7, 5).result;
    expect([hi.misses, hi.falseAccepts]).toEqual([3, 0]);
  });
  it('is harder in the noisy room: more misses or more false accepts at the same setting', () => {
    const noisy = buildStream(11, ROOMS.noisy);
    const ns = matchScores(logMelFrames(noisy.samples));
    const a = runDetector(scores, quiet.events, 0.6, 5).result;
    const b = runDetector(ns, noisy.events, 0.6, 5).result;
    expect(b.misses + b.falseAccepts).toBeGreaterThanOrEqual(a.misses + a.falseAccepts);
  });
});

describe('resampling', () => {
  it('turns 48 kHz into 16 kHz and keeps the pitch', () => {
    const x = sine(440, 0.5, 48000);
    const y = resampleTo16k(x, 48000);
    expect(y.length).toBe(8000);
    let crossings = 0;
    for (let i = 1; i < y.length; i++) if (y[i - 1] < 0 && y[i] >= 0) crossings++;
    expect(crossings).toBeGreaterThanOrEqual(219);
    expect(crossings).toBeLessThanOrEqual(221);
  });
  it('turns 44.1 kHz into 16 kHz', () => {
    const y = resampleTo16k(sine(440, 1, 44100), 44100);
    expect(y.length).toBe(16000);
  });
  it('copies audio that is already 16 kHz', () => {
    const x = new Float32Array([1, 2, 3]);
    expect(Array.from(resampleTo16k(x, 16000))).toEqual([1, 2, 3]);
  });
});

describe('memory and power examples', () => {
  it('sizes buffers', () => {
    expect(audioBufferBytes(1)).toBe(32000);
    expect(featureWindowBytes(49, 10)).toBe(490);
    expect(featureWindowBytes(49, 40)).toBe(1960);
  });
  it('averages a two-stage detector by how often the big stage wakes', () => {
    const c = { stage1Mw: 1, stage2Mw: 300, stage2SecondsPerTrigger: 0.3, triggersPerHour: 6 };
    expect(cascadePowerMw(c)).toBeCloseTo(1 + 300 * ((6 * 0.3) / 3600), 12);
    expect(cascadePowerMw(c)).toBeCloseTo(1.15, 9);
    expect(cascadePowerMw({ ...c, triggersPerHour: 1e9 })).toBe(301); // the duty cycle cannot exceed 1
  });
});
