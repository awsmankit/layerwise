import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Root } from './shared';
import { prepareCanvas, readPalette, useStopWhenAway, useThemeTick, useWidth } from './audio-shared';
import { aliasFrequency, quantise, TWO_PI } from '../../lib/audio-dsp';
import { audioContextClass } from '../../lib/web-audio';

/*
 * Tone lab for "How a computer hears". A sine wave you can play (Web Audio, only after a tap)
 * and, below it, a picture of the same wave being sampled: dots at the chosen rate and bit depth.
 * The picture is drawn from maths, so it works with no sound at all. The live strip shows what the
 * AnalyserNode sees while the tone plays.
 */

const FREQ_MIN = 60;
const FREQ_MAX = 4000;
const RATE_MIN = 200;
const RATE_MAX = 48000;
const WINDOWS_MS = [2, 5, 10, 20, 40];
const BIT_CHOICES = [2, 3, 4, 8, 16];
const RATE_CHIPS = [
  { rate: 1000, label: '1,000' },
  { rate: 8000, label: '8,000 phone call' },
  { rate: 16000, label: '16,000 speech models' },
  { rate: 44100, label: '44,100 CD' },
];

const logPos = (v: number, lo: number, hi: number) => Math.log(v / lo) / Math.log(hi / lo);
const fromLogPos = (t: number, lo: number, hi: number) => lo * Math.pow(hi / lo, t);
const niceRate = (r: number) => (r < 2000 ? Math.round(r / 10) * 10 : r < 10000 ? Math.round(r / 100) * 100 : Math.round(r / 500) * 500);
const n0 = (n: number) => Math.round(n).toLocaleString('en-GB');
/** Output level: kept well below full scale. 35% on the slider is about -32 dB; 100% is -14 dB. */
const gainFor = (volume: number) => 0.2 * (volume / 100) ** 2;

type Nodes = { osc: OscillatorNode; gain: GainNode; analyser: AnalyserNode };

export default function ToneLab() {
  const [freq, setFreq] = useState(440);
  const [volume, setVolume] = useState(35);
  const [rate, setRate] = useState(4000);
  const [bits, setBits] = useState(16);
  const [playing, setPlaying] = useState(false);
  const [hear, setHear] = useState<'original' | 'kept'>('original');
  const [canPlay, setCanPlay] = useState<boolean | null>(null);
  const [problem, setProblem] = useState('');

  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<Nodes | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const mainBox = useRef<HTMLDivElement>(null);
  const mainCanvas = useRef<HTMLCanvasElement>(null);
  const liveBox = useRef<HTMLDivElement>(null);
  const liveCanvas = useRef<HTMLCanvasElement>(null);
  const mainW = useWidth(mainBox);
  const liveW = useWidth(liveBox);
  const themeTick = useThemeTick();

  const alias = aliasFrequency(freq, rate);
  const tooSlow = freq >= rate / 2;
  const kept = Math.abs(alias);
  const targetFreq = tooSlow && hear === 'kept' ? Math.max(kept, 1) : freq;

  useEffect(() => setCanPlay(audioContextClass() !== null), []);

  /* ---------- sound ---------- */

  const stop = useCallback(() => {
    const n = nodesRef.current;
    const ctx = ctxRef.current;
    nodesRef.current = null;
    setPlaying(false);
    if (!n || !ctx) return;
    try {
      const t = ctx.currentTime;
      n.gain.gain.cancelScheduledValues(t);
      n.gain.gain.setTargetAtTime(0, t, 0.01);
      n.osc.stop(t + 0.08);
      n.osc.onended = () => {
        n.osc.disconnect();
        n.gain.disconnect();
        n.analyser.disconnect();
        if (!nodesRef.current && ctx.state === 'running') void ctx.suspend().catch(() => {});
      };
    } catch {
      /* already stopped */
    }
  }, []);

  const play = useCallback(() => {
    setProblem('');
    const Ctor = audioContextClass();
    if (!Ctor) return;
    try {
      // Created and resumed inside the tap, which is what browsers (including iOS Safari) require.
      let ctx = ctxRef.current;
      if (!ctx || ctx.state === 'closed') {
        ctx = new Ctor();
        ctx.onstatechange = () => {
          if (ctx && (ctx.state as string) === 'interrupted') stop();
        };
        ctxRef.current = ctx;
      }
      void ctx.resume().catch(() => {});
      if (nodesRef.current) return;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = targetFreq;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      osc.connect(gain);
      gain.connect(analyser);
      analyser.connect(ctx.destination);
      osc.start();
      gain.gain.setTargetAtTime(gainFor(volume), ctx.currentTime, 0.02);
      nodesRef.current = { osc, gain, analyser };
      setPlaying(true);
    } catch {
      setProblem('The browser would not start sound here. The pictures below still work.');
      setCanPlay(false);
    }
  }, [stop, targetFreq, volume]);

  // follow the sliders while playing
  useEffect(() => {
    const n = nodesRef.current;
    const ctx = ctxRef.current;
    if (!n || !ctx) return;
    const t = ctx.currentTime;
    n.osc.frequency.setTargetAtTime(targetFreq, t, 0.01);
    n.gain.gain.setTargetAtTime(gainFor(volume), t, 0.02);
  }, [targetFreq, volume]);

  useStopWhenAway(rootRef, stop);
  useEffect(
    () => () => {
      stop();
      const ctx = ctxRef.current;
      ctxRef.current = null;
      if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => {});
    },
    [stop],
  );

  /* ---------- the sampling picture ---------- */

  const windowMs = useMemo(() => {
    const need = Math.max(2.5 / freq, 14 / rate) * 1000;
    return WINDOWS_MS.find((w) => w >= need) ?? WINDOWS_MS[WINDOWS_MS.length - 1];
  }, [freq, rate]);

  const H = 200;
  useEffect(() => {
    const canvas = mainCanvas.current;
    if (!canvas || !mainW) return;
    const ctx = prepareCanvas(canvas, mainW, H);
    if (!ctx) return;
    const c = readPalette();
    const W = mainW;
    const padX = 10;
    const plotW = W - padX * 2;
    const cy = H / 2;
    const half = H / 2 - 14;
    const level = volume / 100;
    const T = windowMs / 1000;
    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = c.line;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
    // zero line
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(padX, cy);
    ctx.lineTo(W - padX, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // the few levels a low bit depth can use
    if (bits <= 4) {
      const levels = 2 ** bits;
      ctx.strokeStyle = c.line;
      ctx.globalAlpha = 0.45;
      for (let k = 0; k < levels; k++) {
        const v = -1 + (k * 2) / (levels - 1);
        const y = cy - v * half;
        ctx.beginPath();
        ctx.moveTo(padX, y);
        ctx.lineTo(W - padX, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // the real sound: a smooth wave
    ctx.strokeStyle = c.ink3;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x <= plotW; x++) {
      const t = (x / plotW) * T;
      const y = cy - level * half * Math.sin(TWO_PI * freq * t);
      if (x === 0) ctx.moveTo(padX + x, y);
      else ctx.lineTo(padX + x, y);
    }
    ctx.stroke();

    // what the dots would rebuild when the rate is too low
    if (tooSlow) {
      ctx.strokeStyle = c.warn;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= plotW; x++) {
        const t = (x / plotW) * T;
        const y = cy - level * half * Math.sin(TWO_PI * alias * t);
        if (x === 0) ctx.moveTo(padX + x, y);
        else ctx.lineTo(padX + x, y);
      }
      ctx.stroke();
    }

    // the samples
    const count = Math.floor(T * rate);
    const stems = count <= 90;
    ctx.fillStyle = c.signal;
    ctx.strokeStyle = c.signal;
    ctx.lineWidth = 1;
    const r = count > 400 ? 1.4 : count > 150 ? 2 : 3.2;
    for (let i = 0; i <= count; i++) {
      const t = i / rate;
      const x = padX + (t / T) * plotW;
      if (x > W - padX) break;
      const v = quantise(level * Math.sin(TWO_PI * freq * t), bits);
      const y = cy - v * half;
      if (stems) {
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.moveTo(x, cy);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TWO_PI);
      ctx.fill();
    }

    ctx.fillStyle = c.ink3;
    ctx.font = '12px ui-monospace, Menlo, monospace';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`${windowMs} ms of sound`, padX + 2, H - 4);
  }, [freq, rate, bits, volume, windowMs, mainW, themeTick, tooSlow, alias]);

  /* ---------- the live strip (AnalyserNode) ---------- */

  const LH = 64;
  useEffect(() => {
    const canvas = liveCanvas.current;
    if (!canvas || !liveW) return;
    const g = prepareCanvas(canvas, liveW, LH);
    if (!g) return;
    const c = readPalette();
    const buf = new Float32Array(2048);
    let raf = 0;
    const paint = () => {
      g.clearRect(0, 0, liveW, LH);
      g.strokeStyle = c.line;
      g.lineWidth = 1;
      g.strokeRect(0.5, 0.5, liveW - 1, LH - 1);
      const n = nodesRef.current;
      g.strokeStyle = c.signal;
      g.lineWidth = 1.5;
      g.beginPath();
      if (!n) {
        g.moveTo(8, LH / 2);
        g.lineTo(liveW - 8, LH / 2);
      } else {
        n.analyser.getFloatTimeDomainData(buf);
        const sr = n.analyser.context.sampleRate;
        const span = Math.max(64, Math.min(1024, Math.round((3 * sr) / Math.max(targetFreq, 1))));
        let start = 1;
        while (start < buf.length - span && !(buf[start - 1] < 0 && buf[start] >= 0)) start++;
        if (start >= buf.length - span) start = 1;
        const scale = (LH / 2 - 6) / Math.max(0.02, gainFor(volume));
        for (let i = 0; i < span; i++) {
          const x = 8 + (i / (span - 1)) * (liveW - 16);
          const y = LH / 2 - buf[start + i] * scale;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
      }
      g.stroke();
      if (nodesRef.current) raf = requestAnimationFrame(paint);
    };
    paint();
    return () => cancelAnimationFrame(raf);
  }, [playing, liveW, targetFreq, volume, themeTick]);

  /* ---------- words ---------- */

  const perWave = rate / freq;
  let say: string;
  if (freq === rate / 2) {
    say = `Right at the limit. ${n0(rate)} samples a second can only hold pitches below ${n0(rate / 2)} Hz, and your tone is exactly ${n0(freq)} Hz, so the dots land on the same spots every wave and the shape is lost.`;
  } else if (tooSlow) {
    say = `Too slow. At ${n0(rate)} samples a second the highest pitch that can be kept is ${n0(rate / 2)} Hz, but your tone is ${n0(freq)} Hz. The dots now fit a ${kept < 1 ? 'flat line (no sound at all)' : `${n0(kept)} Hz wave`} just as well, drawn in red. The computer would keep ${kept < 1 ? 'nothing' : `${n0(kept)} Hz`} and lose the ${n0(freq)} Hz.`;
  } else {
    say = `Fast enough. At ${n0(rate)} samples a second the highest pitch that can be kept is ${n0(rate / 2)} Hz. Your tone is ${n0(freq)} Hz, so there are about ${perWave >= 10 ? n0(perWave) : perWave.toFixed(1)} samples in every wave, and the dots are enough to rebuild it.`;
  }
  const levels = 2 ** bits;
  const bitSay = `${bits} bits give ${n0(levels)} possible heights for each dot.${bits <= 4 ? ' The dots snap to the lines, so the wave becomes steppy.' : ''}`;

  const alt = `A wave ${n0(freq)} hertz at volume ${volume} percent, sampled ${n0(rate)} times a second with ${bits}-bit heights. ${say}`;

  return (
    <Root>
      <div className="viz au au-tone" ref={rootRef}>
        <p className="viz-title">Tone lab: make a sound, then sample it</p>

        <div className="au-controls">
          <label className="field">
            <span>
              Pitch <b>{n0(freq)} Hz</b>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={logPos(freq, FREQ_MIN, FREQ_MAX)}
              onChange={(e) => setFreq(Math.round(fromLogPos(+e.target.value, FREQ_MIN, FREQ_MAX)))}
              aria-label="Pitch in hertz"
              aria-valuetext={`${n0(freq)} hertz`}
            />
          </label>
          <label className="field">
            <span>
              Volume <b>{volume}%</b>
            </span>
            <input type="range" min={0} max={100} step={1} value={volume} onChange={(e) => setVolume(+e.target.value)} aria-label="Volume" aria-valuetext={`${volume} percent`} />
          </label>
        </div>

        {canPlay !== false ? (
          <div className="au-buttons">
            <button type="button" className="btn" onClick={play} disabled={playing || canPlay === null}>
              Play the tone
            </button>
            <button type="button" className="btn quiet" onClick={stop} disabled={!playing}>
              Stop
            </button>
            <span className="au-status" aria-live="polite">
              {playing ? 'Playing' : 'Silent. Nothing plays until you tap Play.'}
            </span>
          </div>
        ) : (
          <p className="au-note" role="status">
            This browser cannot play sound from a web page, so there is no Play button. Everything else on this figure still works: it is all drawn from the numbers.
          </p>
        )}
        {problem && (
          <p className="au-note" role="status">
            {problem}
          </p>
        )}
        <p className="au-hint">
          The volume slider stops well below the loudest your device can go, but turn your device down before you press Play. If you hear nothing on an iPhone, check the silent switch.
        </p>

        <p className="au-label">What the speaker is being sent (from the Web Audio analyser)</p>
        <div className="au-box" ref={liveBox}>
          <canvas ref={liveCanvas} className="au-canvas" style={{ height: LH }} role="img" aria-label={playing ? `Live waveform of the ${n0(targetFreq)} hertz tone` : 'Flat line: no sound is playing'} />
        </div>

        <p className="au-label">Now sample it: the computer measures the wave only at the dots</p>
        <div className="au-controls au-one">
          <label className="field">
            <span>
              Samples per second <b>{n0(rate)}</b>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={logPos(rate, RATE_MIN, RATE_MAX)}
              onChange={(e) => setRate(niceRate(fromLogPos(+e.target.value, RATE_MIN, RATE_MAX)))}
              aria-label="Samples per second"
              aria-valuetext={`${n0(rate)} samples per second`}
            />
          </label>
        </div>
        <div className="au-chips" role="group" aria-label="Common sampling rates">
          {RATE_CHIPS.map((ch) => (
            <button key={ch.rate} type="button" className="au-chip" aria-pressed={rate === ch.rate} onClick={() => setRate(ch.rate)}>
              {ch.label}
            </button>
          ))}
        </div>
        <div className="au-chips" role="group" aria-label="Bit depth">
          <span className="au-chip-label">Bit depth</span>
          {BIT_CHOICES.map((b) => (
            <button key={b} type="button" className="au-chip" aria-pressed={bits === b} onClick={() => setBits(b)}>
              {b} bit
            </button>
          ))}
        </div>

        <div className="au-box" ref={mainBox}>
          <canvas ref={mainCanvas} className="au-canvas" style={{ height: H }} role="img" aria-label={alt} />
        </div>
        <div className="au-key" aria-hidden="true">
          <span>
            <i className="au-sw au-sw-wave" /> the real sound
          </span>
          <span>
            <i className="au-sw au-sw-dot" /> samples
          </span>
          {tooSlow && (
            <span>
              <i className="au-sw au-sw-warn" /> what the dots seem to say
            </span>
          )}
        </div>

        <p className={`au-say${tooSlow ? ' au-bad' : ''}`} aria-live="polite">
          {say} {bitSay}
        </p>

        {tooSlow && canPlay && (
          <div className="au-chips" role="group" aria-label="Which tone to play">
            <span className="au-chip-label">Listen to</span>
            <button type="button" className="au-chip" aria-pressed={hear === 'original'} onClick={() => setHear('original')}>
              the real {n0(freq)} Hz tone
            </button>
            <button type="button" className="au-chip" aria-pressed={hear === 'kept'} onClick={() => setHear('kept')}>
              what the dots keep ({kept < 1 ? 'silence' : `${n0(kept)} Hz`})
            </button>
          </div>
        )}

        <details className="au-details">
          <summary>This figure in words</summary>
          <p>
            The top strip is a live picture of the signal going to your speaker while the tone plays; it is a flat line when nothing plays. The big picture draws a short stretch of the same wave. The grey line is the real, smooth sound. Each blue dot is one sample: the height of the wave at one instant. Dots are spaced evenly, and the sampling-rate slider sets how many fit in each second.
          </p>
          <p>
            If the rate is more than twice the pitch, the dots follow the wave and a smooth wave of that pitch is the only one that passes through all of them. If the rate is too low, a slower wave passes through every dot too (drawn in red). The computer cannot tell the two apart, so it keeps the slower, wrong one. That is called aliasing. Lowering the bit depth does something different: it limits how many heights a dot can take, so the dots jump to the nearest allowed line.
          </p>
        </details>
      </div>
    </Root>
  );
}
