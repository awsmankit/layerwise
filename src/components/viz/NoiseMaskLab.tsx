import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Root } from './shared';
import { prepareCanvas, useStopWhenAway, useWidth } from './audio-shared';
import {
  BINS,
  BAND_EDGES,
  HOP,
  METHOD_LABEL,
  N_BANDS,
  N_FFT,
  NOISE_LABEL,
  RATE,
  SECONDS,
  analyse,
  applyGains,
  computeGains,
  estimateNoisePower,
  makeNoise,
  measure,
  mixAtSnr,
  powerDb,
  rms,
  speechLike,
  synthesise,
  type Method,
  type NoiseKind,
  type Params,
} from '../../lib/denoise';
import { audioContextClass } from '../../lib/web-audio';

/*
 * Noise-suppression lab. A synthetic speech-like clip plus noise at a chosen signal-to-noise ratio is turned into a
 * spectrogram. The learner (or one of three algorithms) picks a gain for every time-frequency cell, and the page
 * shows the spectrogram before and after, the mask itself, and measurements made by applying the same mask to the
 * speech and the noise separately. Optional playback uses Web Audio, only after a tap, at a low fixed level.
 */

const NOISES: NoiseKind[] = ['hiss', 'rumble', 'babble'];
const METHODS: Method[] = ['manual', 'subtract', 'wiener', 'oracle'];
const METHOD_BLURB: Record<Method, string> = {
  manual: 'You set one fixed gain for each of eight frequency bands, like a graphic equaliser. It cannot tell speech from noise, only high from low.',
  subtract: 'Estimates the noise spectrum from the first 0.45 s (which holds only noise), then takes it away from every frame: gain = 1 - alpha x noise / signal, never below the floor.',
  wiener: 'Estimates how much stronger the signal is than the noise in each cell (from the same noise estimate) and sets the gain to the Wiener ratio, SNR / (1 + SNR).',
  oracle: 'Cheats: it looks at the true speech and noise to set each gain to sqrt(speech energy / (speech + noise energy)). A trained network tries to estimate this mask without the answer.',
};

/* inferno-like colour map */
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

/** Frames whose centre lies inside the clip. */
const FRAME_RANGE = (() => {
  const nF = Math.ceil((SECONDS * RATE + N_FFT) / HOP) + 1;
  const ids: number[] = [];
  for (let f = 0; f < nF; f++) {
    const centre = (f * HOP - N_FFT / 2) / RATE;
    if (centre >= 0 && centre <= SECONDS) ids.push(f);
  }
  return ids;
})();

function paint(canvas: HTMLCanvasElement, cssW: number, cssH: number, value: (f: number, k: number) => number) {
  const ctx = prepareCanvas(canvas, cssW, cssH);
  if (!ctx) return;
  const off = document.createElement('canvas');
  off.width = FRAME_RANGE.length;
  off.height = BINS;
  const octx = off.getContext('2d');
  if (!octx) return;
  const img = octx.createImageData(off.width, off.height);
  for (let x = 0; x < FRAME_RANGE.length; x++) {
    for (let k = 0; k < BINS; k++) {
      const v = Math.max(0, Math.min(1, value(FRAME_RANGE[x], k)));
      const i = Math.round(v * 255);
      const o = ((BINS - 1 - k) * off.width + x) * 4;
      img.data[o] = LUT[i * 3];
      img.data[o + 1] = LUT[i * 3 + 1];
      img.data[o + 2] = LUT[i * 3 + 2];
      img.data[o + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(off, 0, 0, cssW, cssH);
}

const f1 = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : '-');
const signed = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(1);
const bandLabel = (b: number) => {
  const lo = BAND_EDGES[b];
  const hi = BAND_EDGES[b + 1];
  const k = (v: number) => (v >= 1000 ? `${v / 1000}k` : `${v}`);
  return `${k(lo)} to ${k(hi)} Hz`;
};
const bandShort = (b: number) => {
  const k = (v: number) => (v >= 1000 ? `${v / 1000}k` : `${v}`);
  return k(BAND_EDGES[b + 1]);
};

const FLAT = new Array(N_BANDS).fill(0);
const MANUAL_PRESETS: { name: string; cut: number[] }[] = [
  { name: 'Flat', cut: FLAT },
  { name: 'Cut the low rumble', cut: [30, 12, 0, 0, 0, 0, 0, 0] },
  { name: 'Cut the high hiss', cut: [0, 0, 0, 0, 0, 15, 30, 30] },
];

export default function NoiseMaskLab() {
  const [noise, setNoise] = useState<NoiseKind>('hiss');
  const [snr, setSnr] = useState(5);
  const [method, setMethod] = useState<Method>('subtract');
  const [bandCut, setBandCut] = useState<number[]>(FLAT);
  const [alpha, setAlpha] = useState(2);
  const [maxCut, setMaxCut] = useState(20);
  const [playing, setPlaying] = useState<string | null>(null);
  const [audioNote, setAudioNote] = useState('');

  const rootRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const cNoisy = useRef<HTMLCanvasElement>(null);
  const cMask = useRef<HTMLCanvasElement>(null);
  const cOut = useRef<HTMLCanvasElement>(null);
  const width = useWidth(boxRef);
  const ctxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);

  const speech = useMemo(() => {
    const clean = speechLike();
    return { clean, spec: analyse(clean) };
  }, []);

  const scene = useMemo(() => {
    const { noise: n, mix } = mixAtSnr(speech.clean, makeNoise(noise), snr);
    const ns = analyse(n);
    const ms = analyse(mix);
    return { n, mix, ns, ms, np: estimateNoisePower(ms) };
  }, [speech, noise, snr]);

  const params: Params = useMemo(() => ({ method, bandCutDb: bandCut, alpha, maxCutDb: maxCut }), [method, bandCut, alpha, maxCut]);
  const gains = useMemo(() => computeGains(scene.ms, params, scene.np, speech.spec, scene.ns), [scene, params, speech]);
  const report = useMemo(() => measure(speech.clean, scene.n, speech.spec, scene.ns, gains), [speech, scene, gains]);
  const outSpec = useMemo(() => applyGains(scene.ms, gains), [scene, gains]);

  /* spectrogram pictures */
  const noisyDb = useMemo(() => powerDb(scene.ms), [scene]);
  const outDb = useMemo(() => powerDb(outSpec), [outSpec]);
  const top = useMemo(() => {
    let m = -200;
    for (const f of FRAME_RANGE) for (let k = 0; k < BINS; k++) if (noisyDb[f][k] > m) m = noisyDb[f][k];
    return m;
  }, [noisyDb]);

  useEffect(() => {
    if (!width) return;
    const h = width < 480 ? 110 : 140;
    const range = 70;
    if (cNoisy.current) paint(cNoisy.current, width, h, (f, k) => (noisyDb[f][k] - (top - range)) / range);
    if (cOut.current) paint(cOut.current, width, h, (f, k) => (outDb[f][k] - (top - range)) / range);
    if (cMask.current) paint(cMask.current, width, h, (f, k) => (20 * Math.log10(Math.max(gains[f][k], 1e-4)) + 40) / 40);
  }, [width, noisyDb, outDb, top, gains]);

  /* sound */
  const stop = useCallback(() => {
    try {
      srcRef.current?.stop();
    } catch {
      /* already stopped */
    }
    srcRef.current = null;
    setPlaying(null);
  }, []);
  useStopWhenAway(rootRef, stop);
  useEffect(() => () => {
    stop();
    void ctxRef.current?.close();
  }, [stop]);

  const play = useCallback(
    async (which: 'noisy' | 'processed' | 'clean') => {
      stop();
      setAudioNote('');
      const Ctx = audioContextClass();
      if (!Ctx) {
        setAudioNote('This browser cannot play sound from a web page, so the pictures and numbers are all you get here.');
        return;
      }
      try {
        if (!ctxRef.current) ctxRef.current = new Ctx();
        const ctx = ctxRef.current;
        await ctx.resume();
        const data = which === 'clean' ? speech.clean : which === 'noisy' ? scene.mix : synthesise(outSpec, speech.clean.length);
        const level = 0.04 / (rms(data) || 1); // every clip is played at the same, quiet level
        const buf = ctx.createBuffer(1, data.length, RATE);
        const ch = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) ch[i] = Math.max(-0.5, Math.min(0.5, data[i] * level));
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.onended = () => {
          if (srcRef.current === src) {
            srcRef.current = null;
            setPlaying(null);
          }
        };
        src.start();
        srcRef.current = src;
        setPlaying(which);
      } catch {
        setAudioNote('Playback failed in this browser. The pictures and numbers still work.');
      }
    },
    [stop, speech, scene, outSpec],
  );

  /* words */
  let say: string;
  if (method === 'manual') {
    say =
      report.improvement < 0.5
        ? 'With nothing cut, the output is the input.'
        : `Fixed band gains changed the signal-to-noise ratio by ${signed(report.improvement)} dB. A fixed mask treats every moment alike, so it cannot clear the noise in the pauses without also cutting the speech in those bands.`;
  } else if (report.blips > 15) {
    say = `Look at the quiet stretches of the output: isolated bright dots are left where the noise estimate was a little too small. Each one lasts one frame at one frequency and sounds like a short chirp, and from frame to frame they hop around. This is musical noise (${f1(report.blips)} isolated cells per 1,000 in the lead-in).`;
  } else if (report.speechKept < 8) {
    say = 'The noise is gone but so is a lot of the speech: the processing changed the speech by about 40 percent or more of its own amplitude. Pushing the number up with harder cutting buys a cleaner picture at the cost of a damaged signal.';
  } else {
    say = `This setting improves the signal-to-noise ratio by ${signed(report.improvement)} dB and keeps the speech within ${f1(report.speechKept)} dB of the original.`;
  }
  if (noise === 'babble' && method !== 'manual' && method !== 'oracle') {
    say += ' Babble is made of speech, so the noise estimate from the first 0.45 s does not describe the babble that comes later. The algorithm cannot tell the wanted voice from the unwanted ones.';
  }

  const alt = `Three spectrograms of a 2.4 second clip. Noisy input with ${NOISE_LABEL[noise]} at ${snr} dB, the gain mask from ${METHOD_LABEL[method]}, and the processed output. Signal-to-noise ratio improved by ${f1(report.improvement)} dB.`;

  const setBand = (b: number, gainDb: number) => {
    setBandCut((c) => c.map((v, i) => (i === b ? -gainDb : v)));
    setMethod('manual');
  };

  return (
    <Root>
      <div className="viz aua aua-lab" ref={rootRef}>
        <p className="viz-title">Noise lab: choose a gain for every cell of the spectrogram</p>

        <div className="aua-chips" role="group" aria-label="Kind of noise">
          {NOISES.map((n) => (
            <button key={n} type="button" className={`btn quiet aua-pick ${noise === n ? 'on' : ''}`} aria-pressed={noise === n} onClick={() => setNoise(n)}>
              {NOISE_LABEL[n]}
            </button>
          ))}
        </div>
        <div className="aua-controls">
          <label className="field">
            <span>
              Signal-to-noise ratio of the input <b>{snr} dB</b>
            </span>
            <input type="range" min={-5} max={20} step={1} value={snr} onChange={(e) => setSnr(+e.target.value)} aria-label="Signal-to-noise ratio in decibels" aria-valuetext={`${snr} decibels`} />
          </label>
        </div>

        <p className="aua-label">How should the gains be chosen?</p>
        <div className="aua-chips" role="group" aria-label="Method">
          {METHODS.map((m) => (
            <button key={m} type="button" className={`btn quiet aua-pick ${method === m ? 'on' : ''}`} aria-pressed={method === m} onClick={() => setMethod(m)}>
              {METHOD_LABEL[m]}
            </button>
          ))}
        </div>
        <p className="aua-hint">{METHOD_BLURB[method]}</p>

        {method === 'manual' ? (
          <>
            <div className="aua-chips" role="group" aria-label="Band presets">
              {MANUAL_PRESETS.map((p) => (
                <button key={p.name} type="button" className="btn quiet aua-pick" onClick={() => setBandCut(p.cut)}>
                  {p.name}
                </button>
              ))}
            </div>
            <div className="aua-bands" role="group" aria-label="Gain for each frequency band, in decibels">
              {Array.from({ length: N_BANDS }, (_, b) => (
                <label key={b} className="aua-band">
                  <span className="aua-band-val">{bandCut[b] === 0 ? '0' : `-${bandCut[b]}`}</span>
                  <input
                    type="range"
                    min={-40}
                    max={0}
                    step={1}
                    value={-bandCut[b]}
                    onChange={(e) => setBand(b, +e.target.value)}
                    aria-label={`Gain for ${bandLabel(b)}`}
                    aria-valuetext={`${-bandCut[b]} decibels`}
                  />
                  <span className="aua-band-name">{bandShort(b)}</span>
                </label>
              ))}
            </div>
            <p className="aua-axis-cap">Each slider sets the gain in dB for the band up to the frequency shown (Hz). Top is no change.</p>
          </>
        ) : (
          <div className="aua-controls">
            {method === 'subtract' && (
              <label className="field">
                <span>
                  Subtraction strength (alpha) <b>{alpha.toFixed(1)}</b>
                </span>
                <input type="range" min={1} max={5} step={0.1} value={alpha} onChange={(e) => setAlpha(+e.target.value)} aria-label="Subtraction strength alpha" aria-valuetext={alpha.toFixed(1)} />
              </label>
            )}
            <label className="field">
              <span>
                Never cut a cell by more than <b>{maxCut} dB</b>
              </span>
              <input type="range" min={0} max={60} step={1} value={maxCut} onChange={(e) => setMaxCut(+e.target.value)} aria-label="Maximum cut in decibels" aria-valuetext={`${maxCut} decibels`} />
            </label>
          </div>
        )}

        <div className="aua-spec" ref={boxRef} role="img" aria-label={alt}>
          <p className="aua-spec-cap">Noisy input (time across, 0 to 8 kHz up, brighter is louder)</p>
          <canvas ref={cNoisy} className="aua-canvas" />
          <p className="aua-spec-cap">The mask you chose or the algorithm computed (bright = keep, dark = cut by up to 40 dB)</p>
          <canvas ref={cMask} className="aua-canvas" />
          <p className="aua-spec-cap">Output after applying the mask</p>
          <canvas ref={cOut} className="aua-canvas" />
        </div>
        <p className="aua-axis-cap">The first 0.45 s is noise only. Speech is a vowel-like "ah", an "s", then "ee", "oo" and "ah". These are synthetic teaching sounds.</p>

        <dl className="aua-stats" aria-live="polite">
          <div>
            <dt>SNR in</dt>
            <dd>{f1(report.snrIn)} dB</dd>
          </div>
          <div>
            <dt>SNR out</dt>
            <dd>{f1(report.snrOut)} dB</dd>
          </div>
          <div className="aua-main">
            <dt>Improvement</dt>
            <dd>{signed(report.improvement)} dB</dd>
          </div>
          <div>
            <dt>Speech kept</dt>
            <dd>{report.speechKept > 59 ? '>60' : f1(report.speechKept)} dB</dd>
          </div>
          <div>
            <dt>Pauses quieter by</dt>
            <dd>{f1(report.pauseNoiseDrop)} dB</dd>
          </div>
          <div>
            <dt>Isolated blips per 1,000</dt>
            <dd>{f1(report.blips)}</dd>
          </div>
        </dl>
        <p className="aua-say" aria-live="polite">
          {say}
        </p>
        <p className="aua-axis-cap">
          How these are measured: the same gains are applied once to the clean speech and once to the noise. SNR out compares the two results. Speech kept is the ratio of the original speech energy to the energy of the change made to it (higher is gentler). Blips are cells in the noise-only lead-in that survive with gain 0.35 or more while all four neighbours do not: a rough count of my own, not a standard metric.
        </p>

        <p className="aua-label">Listen (optional, nothing plays until you tap)</p>
        <div className="aua-buttons">
          <button type="button" className="btn quiet" onClick={() => play('noisy')} aria-pressed={playing === 'noisy'}>
            Play noisy
          </button>
          <button type="button" className="btn quiet" onClick={() => play('processed')} aria-pressed={playing === 'processed'}>
            Play processed
          </button>
          <button type="button" className="btn quiet" onClick={() => play('clean')} aria-pressed={playing === 'clean'}>
            Play clean
          </button>
          <button type="button" className="btn quiet" onClick={stop} disabled={!playing}>
            Stop
          </button>
          <span className="aua-status" aria-live="polite">
            {playing ? `Playing ${playing}` : 'Silent'}
          </span>
        </div>
        <p className="aua-hint">
          Every clip is played at the same quiet level (about -28 dB rms relative to full scale), but turn your device down before you tap. The clips are about 2.4 seconds of buzzing, not real speech. Over-subtracted output has a bubbling, chirpy quality: that is musical noise.
        </p>
        {audioNote && (
          <p className="aua-note" role="status">
            {audioNote}
          </p>
        )}
      </div>
    </Root>
  );
}
