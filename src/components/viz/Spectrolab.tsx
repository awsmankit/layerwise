import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Root } from './shared';
import { useStopWhenAway } from './audio-shared';
import { chirp, claps, hann, hzToMel, melFilterbank, melFrequencies, powerSpectrum, vowel } from '../../lib/audio-dsp';
import { audioContextClass, canUseMicrophone } from '../../lib/web-audio';

/*
 * Live spectrogram. Synthesised sounds (a sweep, a vowel-like buzz, hand claps) or, only if the learner
 * taps the button, the microphone, go through a Web Audio AnalyserNode. Each animation frame one column
 * of the picture is drawn: frequency up, brightness = energy. The picture scrolls to the left.
 * Everything stays in the page: no recording, no storage, no network. Without Web Audio the same
 * picture is computed offline from the same synthesised sounds (no sound).
 */

const CW = 300; // columns of history kept (5 seconds at 60 a second)
const CH = 240; // rows
const F_TOP = 8000; // the picture shows 0 to 8 kHz, the range speech models keep
const BANDS = 80; // mel bands, as in Whisper
const BAND_ROWS = CH / BANDS; // 3
const COLS_PER_SEC = 60;
const DB_LO = -95;
const DB_HI = -25;
const SIZES = [256, 512, 1024, 2048, 4096];

type Kind = 'chirp' | 'vowel' | 'clap';
const SOUNDS: { kind: Kind; label: string; seconds: number; make: (rate: number) => Float32Array; look: string }[] = [
  {
    kind: 'chirp',
    label: 'Chirp',
    seconds: 2,
    make: (r) => chirp(200, 7000, 2, r),
    look: 'A tone that sweeps from 200 Hz up to 7,000 Hz in two seconds: one bright line climbing. The pitch rises by equal ratios in equal times, so on the Hz axis the line bends upward, and on the mel axis it looks much straighter.',
  },
  {
    kind: 'vowel',
    label: 'Vowel "ah"',
    seconds: 2.5,
    make: (r) => vowel(120, 140, 2.5, r),
    look: 'A buzz at about 120 to 140 Hz, shaped like an "ah" vowel. Look for evenly spaced horizontal stripes: these are the harmonics, 120 to 140 Hz apart. The brightest stripes cluster around 750 to 940 Hz, where this vowel has its two lowest resonances (formants), with a weaker bump near 2,500 Hz. A long window shows the stripes separately; the shortest window blurs them together.',
  },
  {
    kind: 'clap',
    label: 'Claps',
    seconds: 1.9,
    make: (r) => claps(3, 0.5, r),
    look: 'Three bursts of noise, each lasting a few hundredths of a second: bright vertical lines, because a clap has energy at every frequency but only for a moment. The shortest window gives the sharpest lines. A long window smears each clap sideways in time.',
  },
];
const MIC_LOOK = 'Your own sound. Try a steady "ahh" (stripes), a whistle (one bright line), a hiss like "sss" (a bright smear at high frequencies) and a clap (a vertical line).';

/* inferno-like colour map: black, purple, red, orange, pale yellow */
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
const idx = (db: number) => {
  const v = Math.round(((db - DB_LO) / (DB_HI - DB_LO)) * 255);
  return v < 0 ? 0 : v > 255 ? 255 : v;
};

/* how to turn one frame of dB values (one per FFT bin) into CH pixel rows */
type Geometry = {
  rows: Int32Array; // linear view: pairs [lo, hi] of bins per row
  bands: { lo: number; hi: number; w: Float64Array; centre: number; empty: boolean }[]; // mel view
  binHz: number;
};

function buildGeometry(rate: number, fftSize: number, bins: number): Geometry {
  const binHz = rate / fftSize;
  const rows = new Int32Array(CH * 2);
  for (let y = 0; y < CH; y++) {
    const fHi = (1 - y / CH) * F_TOP;
    const fLo = (1 - (y + 1) / CH) * F_TOP;
    const lo = Math.min(bins - 1, Math.floor(fLo / binHz));
    const hi = Math.min(bins - 1, Math.max(lo, Math.floor(fHi / binHz)));
    rows[y * 2] = lo;
    rows[y * 2 + 1] = hi;
  }
  const fMax = Math.min(F_TOP, rate / 2);
  const bank = melFilterbank(rate, fftSize, BANDS, 0, fMax);
  const edges = melFrequencies(BANDS + 2, 0, fMax);
  const bands = bank.map((w, m) => {
    let lo = 0;
    while (lo < w.length && w[lo] === 0) lo++;
    let hi = w.length - 1;
    while (hi > lo && w[hi] === 0) hi--;
    const empty = lo >= w.length;
    return { lo, hi, w: w.slice(lo, hi + 1), centre: edges[m + 1] / binHz, empty };
  });
  return { rows, bands, binHz };
}

function columnPixels(db: Float32Array, geo: Geometry, mel: boolean, out: Uint8ClampedArray) {
  if (!mel) {
    for (let y = 0; y < CH; y++) {
      let v = -200;
      for (let k = geo.rows[y * 2]; k <= geo.rows[y * 2 + 1]; k++) if (db[k] > v) v = db[k];
      put(out, y, idx(v));
    }
    return;
  }
  for (let m = 0; m < BANDS; m++) {
    const b = geo.bands[m];
    let v: number;
    if (b.empty) {
      // the band is narrower than the gap between FFT bins: read between the two nearest bins
      const k = Math.min(db.length - 2, Math.floor(b.centre));
      const f = b.centre - k;
      v = (Math.max(db[k], -200) * (1 - f) + Math.max(db[k + 1], -200) * f);
    } else {
      let s = 0;
      for (let k = b.lo; k <= b.hi; k++) s += b.w[k - b.lo] * 10 ** (Math.max(db[k], -200) / 10);
      v = 10 * Math.log10(Math.max(s * geo.binHz, 1e-20));
    }
    const i = idx(v);
    const top = CH - (m + 1) * BAND_ROWS;
    for (let r = 0; r < BAND_ROWS; r++) put(out, top + r, i);
  }
}
function put(out: Uint8ClampedArray, y: number, i: number) {
  const o = y * 4;
  out[o] = LUT[i * 3];
  out[o + 1] = LUT[i * 3 + 1];
  out[o + 2] = LUT[i * 3 + 2];
  out[o + 3] = 255;
}

type Mic = 'off' | 'asking' | 'on' | 'denied' | 'unavailable' | 'error';

const AXIS_LINEAR = [1000, 2000, 4000, 6000, 8000];
const AXIS_MEL = [100, 500, 1000, 2000, 4000, 8000];
const n0 = (n: number) => Math.round(n).toLocaleString('en-GB');

export default function Spectrolab() {
  const [mel, setMel] = useState(false);
  const [fftSize, setFftSize] = useState(1024);
  const [soundOn, setSoundOn] = useState(true);
  const [running, setRunning] = useState(false);
  const [now, setNow] = useState<Kind | 'mic' | null>(null);
  const [mic, setMic] = useState<Mic>('off');
  const [canPlay, setCanPlay] = useState<boolean | null>(null);
  const [rate, setRate] = useState(48000);
  const [problem, setProblem] = useState('');
  const [drawn, setDrawn] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const outRef = useRef<GainNode | null>(null);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const micNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef(0);
  const busyUntil = useRef(0);
  const history = useRef<Float32Array[]>([]);
  const cache = useRef(new Map<string, Float32Array>());
  const micRef = useRef<Mic>('off');
  micRef.current = mic;

  const bins = fftSize / 2;
  const geo = useMemo(() => buildGeometry(rate, fftSize, bins), [rate, fftSize, bins]);
  const geoRef = useRef(geo);
  geoRef.current = geo;
  const melRef = useRef(mel);
  melRef.current = mel;
  const fftRef = useRef(fftSize);
  fftRef.current = fftSize;

  useEffect(() => setCanPlay(audioContextClass() !== null), []);

  /* ---------- drawing ---------- */

  const clearCanvas = useCallback(() => {
    const g = canvasRef.current?.getContext('2d');
    if (!g) return;
    g.fillStyle = `rgb(${LUT[0]},${LUT[1]},${LUT[2]})`;
    g.fillRect(0, 0, CW, CH);
  }, []);

  const redraw = useCallback(() => {
    const g = canvasRef.current?.getContext('2d');
    if (!g) return;
    clearCanvas();
    const h = history.current;
    const img = g.createImageData(1, CH);
    for (let i = 0; i < h.length; i++) {
      columnPixels(h[i], geoRef.current, melRef.current, img.data);
      g.putImageData(img, CW - h.length + i, 0);
    }
  }, [clearCanvas]);

  useEffect(() => {
    redraw();
  }, [mel, geo, redraw]);

  /* ---------- the live loop ---------- */

  const halt = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    for (const s of sourcesRef.current) {
      try {
        s.onended = null;
        s.stop();
        s.disconnect();
      } catch {
        /* already stopped */
      }
    }
    sourcesRef.current = [];
    if (micNodeRef.current) {
      micNodeRef.current.disconnect();
      micNodeRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop()); // switches the microphone off
      streamRef.current = null;
    }
    const ctx = ctxRef.current;
    if (ctx && ctx.state === 'running') void ctx.suspend().catch(() => {});
    setRunning(false);
    setNow(null);
    setMic((m) => (m === 'on' || m === 'asking' ? 'off' : m));
  }, []);

  const loop = useCallback(() => {
    if (rafRef.current) return;
    let last = performance.now();
    let acc = 0;
    const tick = (t: number) => {
      rafRef.current = requestAnimationFrame(tick);
      const analyser = analyserRef.current;
      const g = canvasRef.current?.getContext('2d');
      if (!analyser || !g) return;
      acc += Math.min(0.1, (t - last) / 1000) * COLS_PER_SEC;
      last = t;
      const cols = Math.min(4, Math.floor(acc));
      if (cols < 1) return;
      acc -= cols;
      const db = new Float32Array(analyser.frequencyBinCount);
      analyser.getFloatFrequencyData(db);
      const h = history.current;
      for (let i = 0; i < cols; i++) h.push(db);
      if (h.length > CW) h.splice(0, h.length - CW);
      g.drawImage(g.canvas, -cols, 0);
      const img = g.createImageData(1, CH);
      columnPixels(db, geoRef.current, melRef.current, img.data);
      for (let i = 0; i < cols; i++) g.putImageData(img, CW - cols + i, 0);
      if (micRef.current !== 'on' && performance.now() > busyUntil.current) halt();
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [halt]);

  /** Make (or reuse) the audio graph. Must run inside a tap. */
  const ensureGraph = useCallback((): AudioContext | null => {
    const Ctor = audioContextClass();
    if (!Ctor) return null;
    let ctx = ctxRef.current;
    if (!ctx || ctx.state === 'closed') {
      ctx = new Ctor();
      ctxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = fftRef.current;
      analyser.smoothingTimeConstant = 0;
      analyser.minDecibels = -100;
      analyser.maxDecibels = -30;
      analyserRef.current = analyser;
      const out = ctx.createGain();
      out.gain.value = 0.18;
      out.connect(ctx.destination);
      outRef.current = out;
      setRate(ctx.sampleRate);
    }
    void ctx.resume().catch(() => {});
    return ctx;
  }, []);

  const trigger = useCallback(
    (kind: Kind) => {
      setProblem('');
      const def = SOUNDS.find((s) => s.kind === kind)!;
      if (canPlay === false) {
        // no Web Audio: compute the picture from the same sound, without playing it
        const sr = 16000;
        const sig = def.make(sr);
        const win = hann(fftSize);
        const hop = Math.max(1, Math.floor((sig.length - fftSize) / (CW - 1)));
        const h: Float32Array[] = [];
        const norm = 20 * Math.log10(fftSize);
        for (let i = 0; i < CW; i++) {
          const start = i * hop;
          if (start + fftSize > sig.length) break;
          const p = powerSpectrum(sig.subarray(start, start + fftSize), fftSize, win);
          h.push(Float32Array.from({ length: fftSize / 2 }, (_, k) => 10 * Math.log10(Math.max(p[k], 1e-20)) - norm));
        }
        history.current = h;
        setRate(sr);
        setNow(kind);
        setDrawn(true);
        redraw();
        return;
      }
      try {
        const ctx = ensureGraph();
        const analyser = analyserRef.current;
        const out = outRef.current;
        if (!ctx || !analyser || !out) return;
        const key = `${kind}@${ctx.sampleRate}`;
        let data = cache.current.get(key);
        if (!data) {
          data = def.make(ctx.sampleRate);
          cache.current.set(key, data);
        }
        const buf = ctx.createBuffer(1, data.length, ctx.sampleRate);
        buf.copyToChannel(data as Float32Array<ArrayBuffer>, 0);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(analyser);
        src.connect(out);
        src.onended = () => {
          sourcesRef.current = sourcesRef.current.filter((s) => s !== src);
        };
        src.start();
        sourcesRef.current.push(src);
        busyUntil.current = performance.now() + def.seconds * 1000 + 1500;
        setNow(kind);
        setDrawn(true);
        setRunning(true);
        loop();
      } catch {
        setProblem('The browser would not start sound here. You can still see the picture: use the buttons again after a moment, or try another browser.');
        halt();
      }
    },
    [canPlay, ensureGraph, fftSize, halt, loop, redraw],
  );

  const startMic = useCallback(async () => {
    setProblem('');
    if (!canUseMicrophone()) {
      setMic('unavailable');
      return;
    }
    const ctx = ensureGraph();
    const analyser = analyserRef.current;
    if (!ctx || !analyser) {
      setMic('unavailable');
      return;
    }
    setMic('asking');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (micRef.current !== 'asking') {
        stream.getTracks().forEach((t) => t.stop()); // the learner gave up while the prompt was open
        return;
      }
      streamRef.current = stream;
      const node = ctx.createMediaStreamSource(stream);
      node.connect(analyser); // to the analyser only: never to the speakers
      micNodeRef.current = node;
      setMic('on');
      setNow('mic');
      setDrawn(true);
      setRunning(true);
      loop();
    } catch (e) {
      const name = (e as { name?: string })?.name;
      setMic(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' ? 'unavailable' : 'error');
      if (!sourcesRef.current.length) halt();
    }
  }, [ensureGraph, halt, loop]);

  // follow the controls
  useEffect(() => {
    const analyser = analyserRef.current;
    if (analyser && analyser.fftSize !== fftSize) analyser.fftSize = fftSize;
    history.current = [];
    clearCanvas();
    setDrawn(false);
  }, [fftSize, clearCanvas]);
  useEffect(() => {
    if (outRef.current) outRef.current.gain.value = soundOn ? 0.18 : 0;
  }, [soundOn]);

  useStopWhenAway(rootRef, halt);
  useEffect(
    () => () => {
      halt();
      const ctx = ctxRef.current;
      ctxRef.current = null;
      if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => {});
    },
    [halt],
  );

  /* ---------- words ---------- */

  const windowMs = (fftSize / rate) * 1000;
  const look = now === 'mic' ? MIC_LOOK : SOUNDS.find((s) => s.kind === now)?.look;
  const micNote: Record<Mic, string> = {
    off: '',
    asking: 'Waiting for your browser to ask. Nothing is listening yet.',
    on: 'The microphone is on. Tap Stop to switch it off.',
    denied: 'The microphone was not allowed, so it stays off. Nothing is wrong: the built-in sounds above work the same way.',
    unavailable: 'No microphone can be used here (the page may not be secure, or no microphone was found). The built-in sounds still work.',
    error: 'The microphone could not be started. The built-in sounds still work.',
  };
  const micOk = canPlay && canUseMicrophone();
  const alt = `Spectrogram, ${mel ? 'mel-spaced rows (80 bands)' : 'rows spaced evenly in hertz'}, 0 to 8,000 hertz. ${look ?? 'Nothing is playing yet.'}`;

  return (
    <Root>
      <div className="viz au au-spec" ref={rootRef}>
        <p className="viz-title">Live spectrogram</p>

        {canPlay === false && (
          <p className="au-note" role="status">
            This browser cannot play or analyse sound from a web page. The buttons below draw the spectrogram from a computed sound instead (no sound is played).
          </p>
        )}

        <div className="au-buttons">
          {SOUNDS.map((s) => (
            <button key={s.kind} type="button" className="btn" onClick={() => trigger(s.kind)} disabled={canPlay === null}>
              {canPlay === false ? `Show ${s.label.toLowerCase()}` : `Play ${s.label.toLowerCase()}`}
            </button>
          ))}
          {canPlay && (
            <button type="button" className="btn quiet" onClick={halt} disabled={!running}>
              Stop
            </button>
          )}
        </div>
        <p className="au-hint" aria-live="polite">
          {running ? `Listening to: ${now === 'mic' ? 'your microphone' : SOUNDS.find((s) => s.kind === now)?.label.toLowerCase()}.` : canPlay === false ? 'Choose a sound to draw.' : 'Nothing plays until you tap a button. Sounds are quiet; turn your device down first.'}
        </p>

        <div className="au-chips" role="group" aria-label="Vertical axis">
          <span className="au-chip-label">Rows</span>
          <button type="button" className="au-chip" aria-pressed={!mel} onClick={() => setMel(false)}>
            Evenly spaced in Hz
          </button>
          <button type="button" className="au-chip" aria-pressed={mel} onClick={() => setMel(true)}>
            Mel scale (80 bands)
          </button>
        </div>
        <div className="au-chips" role="group" aria-label="Window length">
          <span className="au-chip-label">Window</span>
          {SIZES.map((n) => (
            <button key={n} type="button" className="au-chip" aria-pressed={fftSize === n} onClick={() => setFftSize(n)}>
              {n} samples
            </button>
          ))}
        </div>

        <div className="au-specwrap">
          <div className="au-yaxis" aria-hidden="true">
            {(mel ? AXIS_MEL : AXIS_LINEAR).map((hz) => {
              const frac = mel ? hzToMel(hz) / hzToMel(F_TOP) : hz / F_TOP;
              return (
                <span key={hz} style={{ bottom: `${frac * 100}%` }}>
                  {hz >= 1000 ? `${hz / 1000}k` : hz}
                </span>
              );
            })}
          </div>
          <div className="au-spec-box">
            <canvas ref={canvasRef} width={CW} height={CH} className="au-spec-canvas" role="img" aria-label={alt} />
            {!drawn && <p className="au-spec-empty">{canPlay === false ? 'Choose a sound to draw it here' : 'Tap a sound to start'}</p>}
          </div>
        </div>
        <p className="au-axis-cap">
          Frequency in Hz up the side (0 to 8,000). Time runs left to right: about 5 seconds fit, newest on the right. Brightness is energy. Changing the window clears the picture, so play the sound again.
        </p>

        <p className="au-say" aria-live="polite">
          Window: {fftSize} samples = about {windowMs < 10 ? windowMs.toFixed(1) : Math.round(windowMs)} ms. Each row in the plain view covers about {n0(geo.binHz)} Hz of detail. {canPlay === false ? 'Computed at a 16,000 Hz sampling rate, with the picture stretched to fit.' : `A new column is drawn about every 17 ms, and your device samples at ${n0(rate)} Hz.`} For comparison, Whisper uses a 25 ms window (400 samples at 16,000 Hz) and a 10 ms hop.
        </p>
        {look && <p className="au-look">{look}</p>}
        {problem && (
          <p className="au-note" role="status">
            {problem}
          </p>
        )}

        <div className="au-sound-toggle">
          {canPlay && (
            <button type="button" className="au-chip" aria-pressed={!soundOn} onClick={() => setSoundOn((s) => !s)}>
              {soundOn ? 'Sound on. Tap to watch silently' : 'Sound off (watching only). Tap to turn on'}
            </button>
          )}
        </div>

        {micOk && (
          <div className="au-mic">
            <p className="au-label">Optional: use your own voice</p>
            <p className="au-hint">
              This is off unless you tap the button. Your browser will then ask for permission, and you can say no. If you allow it, the sound is analysed inside this page and drawn as the picture above. It is not recorded, not stored and not sent anywhere, and it is never played back through your speakers. It stops when you tap Stop, scroll away from this figure or leave the page.
            </p>
            <div className="au-buttons">
              {mic === 'on' || mic === 'asking' ? (
                <button type="button" className="btn quiet" onClick={halt}>
                  Stop the microphone
                </button>
              ) : (
                <button type="button" className="btn quiet" onClick={() => void startMic()}>
                  Use my microphone
                </button>
              )}
            </div>
            {mic !== 'off' && (
              <p className="au-hint" role="status">
                {micNote[mic]}
              </p>
            )}
          </div>
        )}
        {canPlay && !micOk && canUseMicrophone() === false && (
          <p className="au-hint">The microphone option is not available in this browser or on this page, so only the built-in sounds are offered.</p>
        )}

        <p className="viz-cap">
          Each column is the energy at every frequency in one short window of sound (a Fourier transform of that window). Press Mel scale to see the same sound with its rows spaced the way models read it.{' '}
          {mel && fftSize <= 512 ? 'With a short window the lowest mel bands are narrower than the transform can separate, so neighbouring rows look alike.' : ''}
        </p>
      </div>
    </Root>
  );
}
