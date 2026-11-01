import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Root } from './shared';
import { prepareCanvas, useStopWhenAway, useWidth } from './audio-shared';
import { BANDS, CLIP_SECONDS, KWS_RATE, hopSeconds, frameEndSec, keywordTemplate, logMelFrames, makeClip, matchScores, playable, resampleTo16k, type ClipKind } from '../../lib/kws';
import { audioContextClass } from '../../lib/web-audio';
import { micSupported, recordMic } from './kws-mic';

/*
 * The detector's front end and model on one short clip. Synthesised sounds (or, only if the learner taps the
 * microphone button, three seconds of their own sound, kept in memory and never saved or sent) are cut into frames,
 * turned into 40 log-mel values per frame by the same functions the audio lessons use, and compared with a fixed
 * keyword pattern by a stand-in "model" (a matched filter). Nothing here is a trained network.
 */

const THRESHOLD = 0.6;

type Mode = ClipKind | 'mic';
type MicState = 'idle' | 'asking' | 'recording' | 'done' | 'denied' | 'unavailable' | 'error';

const SOUNDS: { id: ClipKind; label: string; look: string }[] = [
  { id: 'keyword', label: 'The keyword', look: 'The keyword is a two-vowel glide, "ah" sliding to "ee". In the picture, look for a bright band that starts low and ends high.' },
  { id: 'reverse', label: 'Keyword backwards', look: 'The same two vowels in the opposite order, "ee" then "ah". It has similar ingredients but the pattern runs the other way, so it matches less well.' },
  { id: 'claps', label: 'Claps', look: 'Two claps: short bursts of energy at every pitch, seen as vertical streaks. They do not look like the keyword at all.' },
  { id: 'noise', label: 'Noise only', look: 'Only the background hiss. The model has nothing to match, so its score stays low.' },
];

/* inferno-like colour map, the same one the spectrogram lesson uses */
const STOPS: [number, number, number, number][] = [
  [0, 0, 0, 4],
  [0.2, 40, 11, 84],
  [0.4, 120, 28, 109],
  [0.6, 188, 55, 84],
  [0.8, 249, 142, 9],
  [1, 252, 255, 164],
];
const LUT = (() => {
  const out = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let s = 0;
    while (s < STOPS.length - 2 && t > STOPS[s + 1][0]) s++;
    const [t0, r0, g0, b0] = STOPS[s];
    const [t1, r1, g1, b1] = STOPS[s + 1];
    const u = (t - t0) / (t1 - t0);
    out[i * 3] = r0 + (r1 - r0) * u;
    out[i * 3 + 1] = g0 + (g1 - g0) * u;
    out[i * 3 + 2] = b0 + (b1 - b0) * u;
  }
  return out;
})();

/** Draw frames (time across) by 40 bands (low pitch at the bottom) as a heat map. `box` outlines a stretch of frames. */
function drawHeat(canvas: HTMLCanvasElement, cssW: number, cssH: number, grid: Float64Array[], lo: number, hi: number, box?: { from: number; to: number }) {
  const ctx = prepareCanvas(canvas, cssW, cssH);
  if (!ctx || grid.length === 0) return;
  const nF = grid.length;
  const off = document.createElement('canvas');
  off.width = nF;
  off.height = BANDS;
  const octx = off.getContext('2d');
  if (!octx) return;
  const img = octx.createImageData(nF, BANDS);
  for (let f = 0; f < nF; f++) {
    for (let b = 0; b < BANDS; b++) {
      const v = Math.round(((grid[f][b] - lo) / (hi - lo)) * 255);
      const k = (v < 0 ? 0 : v > 255 ? 255 : v) * 3;
      const p = ((BANDS - 1 - b) * nF + f) * 4;
      img.data[p] = LUT[k];
      img.data[p + 1] = LUT[k + 1];
      img.data[p + 2] = LUT[k + 2];
      img.data[p + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.drawImage(off, 0, 0, cssW, cssH);
  if (box) {
    const x0 = (Math.max(0, box.from) / nF) * cssW;
    const x1 = (Math.min(nF, box.to + 1) / nF) * cssW;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x0 + 1, 1, Math.max(2, x1 - x0 - 2), cssH - 2);
  }
}

export default function KwsPipeline() {
  const [mode, setMode] = useState<Mode>('keyword');
  const [snr, setSnr] = useState(12);
  const [micState, setMicState] = useState<MicState>('idle');
  const [micClip, setMicClip] = useState<Float32Array | null>(null);
  const [canMic, setCanMic] = useState(false);
  const [canPlay, setCanPlay] = useState(false);
  const [playing, setPlaying] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const heatRef = useRef<HTMLCanvasElement>(null);
  const tplRef = useRef<HTMLCanvasElement>(null);
  const heatBox = useRef<HTMLDivElement>(null);
  const tplBox = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const heatW = useWidth(heatBox);
  const tplW = useWidth(tplBox);

  useEffect(() => {
    setCanMic(micSupported());
    setCanPlay(!!audioContextClass());
  }, []);

  const clip = useMemo(() => (mode === 'mic' ? micClip ?? new Float32Array(Math.round(CLIP_SECONDS * KWS_RATE)) : makeClip(mode, snr)), [mode, snr, micClip]);
  const frames = useMemo(() => logMelFrames(clip), [clip]);
  const scores = useMemo(() => matchScores(frames), [frames]);
  const template = keywordTemplate();

  let peak = 0;
  let peakAt = 0;
  scores.forEach((s, i) => {
    if (s > peak) {
      peak = s;
      peakAt = i;
    }
  });
  const fires = peak >= THRESHOLD;
  const seconds = clip.length / KWS_RATE;

  /* pictures */
  useEffect(() => {
    const c = heatRef.current;
    if (!c || !heatW || frames.length === 0) return;
    let hi = -Infinity;
    for (const f of frames) for (const v of f) if (v > hi) hi = v;
    const box = peak > 0 ? { from: peakAt - template.frames + 1, to: peakAt } : undefined;
    drawHeat(c, heatW, 132, frames, Math.max(-40, hi - 55), hi, box);
  }, [frames, heatW, peak, peakAt, template.frames]);
  useEffect(() => {
    const c = tplRef.current;
    if (!c || !tplW) return;
    const grid: Float64Array[] = [];
    for (let t = 0; t < template.frames; t++) grid.push(Float64Array.from({ length: BANDS }, (_, b) => template.values[b * template.frames + t]));
    drawHeat(c, tplW, 132, grid, -22, 22);
  }, [tplW, template]);

  /* sound */
  const stopSound = useCallback(() => {
    const ctx = ctxRef.current;
    ctxRef.current = null;
    if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => {});
    setPlaying(false);
  }, []);
  useStopWhenAway(rootRef, stopSound);
  useEffect(
    () => () => {
      stopSound();
      abortRef.current?.abort();
    },
    [stopSound],
  );

  const play = useCallback(async () => {
    const Ctx = audioContextClass();
    if (!Ctx || mode === 'mic') return;
    stopSound();
    try {
      const ctx = new Ctx();
      ctxRef.current = ctx;
      if (ctx.state === 'suspended') await ctx.resume();
      const data = playable(clip, 0.25); // quiet: a peak of a quarter of full scale
      const buf = ctx.createBuffer(1, data.length, KWS_RATE);
      buf.copyToChannel(data as Float32Array<ArrayBuffer>, 0);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.onended = () => stopSound();
      src.start();
      setPlaying(true);
    } catch {
      stopSound();
    }
  }, [clip, mode, stopSound]);

  const listen = useCallback(async () => {
    stopSound();
    setMicState('asking');
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const rec = await recordMic(3, ac.signal, () => setMicState('recording'));
      setMicClip(resampleTo16k(rec.data, rec.rate));
      setMode('mic');
      setMicState('done');
    } catch (e) {
      const name = (e as { name?: string })?.name;
      if (name === 'AbortError') setMicState('idle');
      else setMicState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' ? 'unavailable' : 'error');
    }
  }, [stopSound]);

  const micNote: Record<MicState, string> = {
    idle: 'Off. Nothing is listening until you tap the button.',
    asking: 'Waiting for your browser to ask. Nothing is listening yet.',
    recording: 'Recording for 3 seconds. Try "ahh" sliding to "eee", a word, a clap, or silence.',
    done: 'Done. The microphone is off again. The 3 seconds are held in this page only, and are lost when you leave it.',
    denied: 'The microphone was not allowed, so it stays off. The built-in sounds work the same way.',
    unavailable: 'No microphone can be used here (the page may not be secure, or no microphone was found). The built-in sounds still work.',
    error: 'The microphone could not be started. The built-in sounds still work.',
  };

  const look = mode === 'mic' ? 'Your own sound, after being turned into 16,000 samples a second. The model only looks for one synthetic pattern, so most things you say will score low. That is expected: a real detector is trained on many people saying its keyword.' : SOUNDS.find((s) => s.id === mode)?.look;
  const verdict = mode === 'mic' && !micClip ? 'Record a clip to see its score.' : `Highest score ${peak.toFixed(2)}${peak > 0 ? ` at ${frameEndSec(peakAt).toFixed(2)} s` : ''}. With a threshold of ${THRESHOLD.toFixed(2)} the detector ${fires ? 'would fire' : 'would stay quiet'}.`;
  const frameCount = frames.length;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const scoreX = (i: number) => r2(frameCount > 1 ? (i / (frameCount - 1)) * 340 : 0);
  const scoreY = (v: number) => r2(70 - v * 58);
  const path = Array.from(scores, (v, i) => `${i ? 'L' : 'M'}${scoreX(i).toFixed(1)} ${scoreY(v).toFixed(1)}`).join(' ');

  return (
    <Root>
      <div className="viz eb eb-pipe" ref={rootRef}>
        <p className="viz-title">From sound to a score</p>

        <div className="eb-chips" role="group" aria-label="Which sound">
          {SOUNDS.map((s) => (
            <button key={s.id} type="button" className="eb-chip" aria-pressed={mode === s.id} onClick={() => setMode(s.id)}>
              {s.label}
            </button>
          ))}
          {micClip && (
            <button type="button" className="eb-chip" aria-pressed={mode === 'mic'} onClick={() => setMode('mic')}>
              My recording
            </button>
          )}
        </div>

        {mode !== 'mic' && mode !== 'noise' && (
          <label className="field eb-snr">
            <span>
              Loudness against the noise <b>{snr} dB</b>
            </span>
            <input type="range" min={-6} max={20} step={1} value={snr} onChange={(e) => setSnr(+e.target.value)} aria-label="Signal to noise ratio in decibels" />
          </label>
        )}

        <div className="eb-buttons">
          {mode !== 'mic' && (
            <button type="button" className="btn" onClick={playing ? stopSound : play} disabled={!canPlay}>
              {playing ? 'Stop' : 'Play this clip (quiet)'}
            </button>
          )}
          {canMic && micState !== 'recording' && micState !== 'asking' && (
            <button type="button" className="btn quiet" onClick={listen}>
              {micClip ? 'Record another 3 seconds' : 'Try my microphone for 3 seconds'}
            </button>
          )}
          {(micState === 'recording' || micState === 'asking') && (
            <button type="button" className="btn quiet" onClick={() => abortRef.current?.abort()}>
              Cancel
            </button>
          )}
        </div>
        <p className="eb-hint" aria-live="polite">
          {canMic ? `Microphone: ${micNote[micState]}` : 'Nothing plays until you tap Play. Sounds are quiet; turn your device down first.'}
        </p>
        {canMic && micState === 'idle' && <p className="eb-hint">Audio stays on this device. It is not saved, uploaded or played back.</p>}

        <div className="eb-two">
          <figure className="eb-fig">
            <div ref={heatBox}>
              <canvas ref={heatRef} className="eb-canvas" style={{ height: 132 }} role="img" aria-label={`Log-mel picture of the ${seconds.toFixed(1)} second clip: ${frameCount} frames across, 40 bands up, brighter is louder. ${look ?? ''} The white box marks the stretch of frames the model scored highest.`} />
            </div>
            <figcaption>What the model sees: 40 mel bands (low pitch at the bottom) for each {Math.round(hopSeconds * 1000)} ms frame. The white box is the stretch it matched best.</figcaption>

            <svg viewBox="0 0 340 80" className="eb-svg eb-score" role="img" aria-label={`Model score over time, from 0 to 1. ${verdict}`}>
              <path d="M 0 70 H 340" className="eb-grid" />
              <path d={`M 0 ${scoreY(THRESHOLD)} H 340`} className="eb-thr" />
              <text x="338" y={scoreY(THRESHOLD) - 4} textAnchor="end" className="eb-t">
                fires above {THRESHOLD.toFixed(2)}
              </text>
              <path d={path} className="eb-line eb-line-bold" />
              {peak > 0 && <circle cx={scoreX(peakAt)} cy={scoreY(peak)} r="4" className={fires ? 'eb-dot-ok' : 'eb-dot-no'} />}
            </svg>
            <p className="eb-axis">Model score for each frame (0 to 1), over the same {seconds.toFixed(1)} seconds.</p>
          </figure>
          <figure className="eb-fig eb-fig-tpl">
            <div ref={tplBox}>
              <canvas ref={tplRef} className="eb-canvas" style={{ height: 132 }} role="img" aria-label="The fixed pattern the toy model looks for: a bright band that climbs from low pitch to high pitch over about 0.85 seconds." />
            </div>
            <figcaption>The pattern it looks for, with each band's average removed.</figcaption>
          </figure>
        </div>


        <p className="eb-say" aria-live="polite">
          {verdict}
        </p>
        <p className="eb-look">{look}</p>
      </div>
    </Root>
  );
}
