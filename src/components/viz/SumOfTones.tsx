import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Root } from './shared';
import { useStopWhenAway } from './audio-shared';
import { powerSpectrum, sumOfTones, TWO_PI } from '../../lib/audio-dsp';
import { audioContextClass } from '../../lib/web-audio';

/*
 * "A sound is a sum of pure tones." Five sliders set how much of each pure tone (the 1st to 5th
 * multiple of 220 Hz) is mixed in. The top picture is the resulting wave; the bars underneath are
 * measured from that wave with a Fourier transform, not copied from the sliders. Playing it is optional.
 */

const BASE = 220;
const N = 512; // samples in the analysis window: exactly 4 cycles of the base tone, so harmonic h sits in bin 4h
const CYCLES = 4;
const COUNT = 5;
const W = 340;

const PRESETS: { id: string; label: string; amps: number[] }[] = [
  { id: 'pure', label: 'One pure tone', amps: [1, 0, 0, 0, 0] },
  { id: 'two', label: 'Two tones', amps: [1, 0, 0.6, 0, 0] },
  { id: 'hollow', label: 'Hollow (odd tones only)', amps: [1, 0, 0.33, 0, 0.2] },
  { id: 'buzz', label: 'Buzzy (all tones)', amps: [1, 0.5, 0.33, 0.25, 0.2] },
];

export default function SumOfTones() {
  const [amps, setAmps] = useState<number[]>(PRESETS[1].amps);
  const [playing, setPlaying] = useState(false);
  const [canPlay, setCanPlay] = useState<boolean | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => setCanPlay(audioContextClass() !== null), []);

  const total = amps.reduce((s, a) => s + a, 0);
  const scale = 1 / Math.max(1, total);

  const sumPath = useMemo(() => {
    let d = '';
    for (let x = 0; x <= W - 20; x++) {
      const t = (x / (W - 20)) * 2; // two cycles of the base tone across the picture
      let s = 0;
      for (let h = 0; h < COUNT; h++) s += amps[h] * Math.sin(TWO_PI * (h + 1) * t);
      d += `${x === 0 ? 'M' : 'L'} ${(10 + x).toFixed(1)} ${(50 - s * scale * 40).toFixed(1)} `;
    }
    return d;
  }, [amps, scale]);

  const partPaths = useMemo(
    () =>
      amps.map((a, h) => {
        if (a === 0) return '';
        let d = '';
        for (let x = 0; x <= W - 20; x += 2) {
          const t = (x / (W - 20)) * 2;
          d += `${x === 0 ? 'M' : 'L'} ${(10 + x).toFixed(1)} ${(50 - a * Math.sin(TWO_PI * (h + 1) * t) * scale * 40).toFixed(1)} `;
        }
        return d;
      }),
    [amps, scale],
  );

  // the measured spectrum: a Fourier transform of the wave drawn above
  const measured = useMemo(() => {
    const wave = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      let s = 0;
      for (let h = 0; h < COUNT; h++) s += amps[h] * Math.sin((TWO_PI * (h + 1) * CYCLES * i) / N);
      wave[i] = s;
    }
    const p = powerSpectrum(wave, N);
    return Array.from({ length: COUNT }, (_, h) => (2 * Math.sqrt(p[CYCLES * (h + 1)])) / N);
  }, [amps]);

  const stop = useCallback(() => {
    const s = srcRef.current;
    srcRef.current = null;
    setPlaying(false);
    if (s) {
      try {
        s.onended = null;
        s.stop();
        s.disconnect();
      } catch {
        /* already stopped */
      }
    }
  }, []);

  const play = useCallback(() => {
    const Ctor = audioContextClass();
    if (!Ctor) return;
    try {
      let ctx = ctxRef.current;
      if (!ctx || ctx.state === 'closed') {
        ctx = new Ctor();
        ctxRef.current = ctx;
      }
      void ctx.resume().catch(() => {});
      stop();
      const raw = sumOfTones(BASE, amps, 2, ctx.sampleRate);
      const norm = 0.25 / Math.max(1, total); // quiet: at most a quarter of full scale
      const buf = ctx.createBuffer(1, raw.length, ctx.sampleRate);
      const data = buf.getChannelData(0);
      const fade = Math.round(0.03 * ctx.sampleRate);
      for (let i = 0; i < raw.length; i++) {
        const g = Math.min(1, i / fade, (raw.length - 1 - i) / fade);
        data[i] = raw[i] * norm * g;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.onended = () => {
        if (srcRef.current === src) {
          srcRef.current = null;
          setPlaying(false);
        }
      };
      src.start();
      srcRef.current = src;
      setPlaying(true);
    } catch {
      setCanPlay(false);
    }
  }, [amps, stop, total]);

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

  const set = (h: number, v: number) => setAmps((a) => a.map((x, i) => (i === h ? v : x)));
  const present = amps.map((a, h) => (a > 0 ? `${BASE * (h + 1)} Hz` : null)).filter(Boolean);
  const say = present.length
    ? `The wave is a mix of ${present.length} pure ${present.length === 1 ? 'tone' : 'tones'}: ${present.join(', ')}. The Fourier transform of the wave finds the same ${present.length === 1 ? 'tone' : 'tones'} again, with the same strengths.`
    : 'Every slider is at zero, so there is no sound: a flat line.';

  return (
    <Root>
      <div className="viz au au-sum" ref={rootRef}>
        <p className="viz-title">A sound is a sum of pure tones</p>
        <div className="au-chips" role="group" aria-label="Example mixtures">
          {PRESETS.map((p) => {
            const on = p.amps.every((a, i) => a === amps[i]);
            return (
              <button key={p.id} type="button" className="au-chip" aria-pressed={on} onClick={() => setAmps(p.amps)}>
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="au-sliders">
          {amps.map((a, h) => (
            <label key={h} className="field">
              <span>
                Pure tone {h + 1}: {BASE * (h + 1)} Hz <b>{Math.round(a * 100)}%</b>
              </span>
              <input type="range" min={0} max={1} step={0.05} value={a} onChange={(e) => set(h, +e.target.value)} aria-valuetext={`${Math.round(a * 100)} percent`} />
            </label>
          ))}
        </div>

        <p className="au-label">What the microphone gets: all the tones added together</p>
        <svg viewBox={`0 0 ${W} 100`} className="au-svg" role="img" aria-label={`The summed wave over two cycles of ${BASE} hertz. ${say}`}>
          <rect x="0.5" y="0.5" width={W - 1} height="99" className="au-frame-rect" />
          <path d={`M 10 50 H ${W - 10}`} className="au-zero" />
          {partPaths.map((d, h) => (d ? <path key={h} d={d} className="au-part" /> : null))}
          <path d={sumPath} className="au-sum-line" />
        </svg>

        <p className="au-label">What a Fourier transform finds in it: how much of each pure tone</p>
        <svg viewBox={`0 0 ${W} 112`} className="au-svg" role="img" aria-label={`Bar chart of the measured strength of each tone: ${measured.map((m, h) => `${BASE * (h + 1)} hertz ${Math.round(m * 100)} percent`).join(', ')}`}>
          <path d={`M 10 86 H ${W - 10}`} className="au-zero" />
          {measured.map((m, h) => {
            const x = 22 + h * 61;
            const bh = Math.min(1, m) * 70;
            return (
              <g key={h}>
                <rect x={x} y={86 - bh} width="40" height={Math.max(bh, 0.0001)} className="au-bar" />
                <text x={x + 20} y="104" textAnchor="middle" className="au-axis-text">
                  {BASE * (h + 1)}
                </text>
                {m > 0.02 && (
                  <text x={x + 20} y={86 - bh - 5} textAnchor="middle" className="au-axis-text">
                    {Math.round(m * 100)}%
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        <p className="au-axis-cap">Frequency in Hz along the bottom, strength up the side.</p>

        <p className="au-say" aria-live="polite">
          {say}
        </p>

        {canPlay !== false && (
          <div className="au-buttons">
            <button type="button" className="btn" onClick={play} disabled={playing || canPlay === null || total === 0}>
              Hear this mix (2 seconds, quiet)
            </button>
            <button type="button" className="btn quiet" onClick={stop} disabled={!playing}>
              Stop
            </button>
          </div>
        )}
        <p className="viz-cap">
          The thin lines are the separate tones. The thick line is their sum. The bars are measured from the thick line alone, with the same kind of calculation a computer uses, so they show that the ingredients can be recovered from the mix. The sound only plays after you tap the button.
        </p>
      </div>
    </Root>
  );
}
