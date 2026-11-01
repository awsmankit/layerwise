import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Root } from './shared';
import { useStopWhenAway } from './audio-shared';
import { audioContextClass } from '../../lib/web-audio';
import { PHONE_HINT, RATE, isVoiced, melDb, normaliseText, planProsody, synthesise, wordToPhones, type Phone, type Segment } from '../../lib/toy-tts';

/*
 * A pipeline explorer for a toy text-to-speech system. The learner types a short sentence and steps
 * through the stages: text to words, words to sounds, timing and pitch, the spectrogram, and the
 * waveform from a formant synthesiser. Sound plays only after a tap, at a low gain. Everything is
 * computed in the page by src/lib/toy-tts.ts. It is a toy: it does not sound natural and it is not neural TTS.
 */

const STAGES = ['Text', 'Sounds', 'Timing and pitch', 'Spectrogram', 'Waveform'] as const;
const PRESETS = [
  { label: 'Numbers', text: 'Is the red fish 12 pounds?' },
  { label: 'Statement', text: 'The cat has 3 big fish.' },
  { label: 'Silent letters', text: 'The knight had a light.' },
  { label: 'Two sentences', text: 'Hello world. Make it so.' },
];
const MAX_CHARS = 60;

/* inferno-like colour map for the spectrogram: black, purple, red, orange, pale yellow */
const STOPS: [number, number, number, number][] = [
  [0, 0, 0, 4],
  [0.25, 40, 11, 84],
  [0.5, 150, 40, 100],
  [0.75, 240, 110, 20],
  [1, 252, 255, 164],
];
function colour(t: number): [number, number, number] {
  const c = Math.max(0, Math.min(1, t));
  let s = 0;
  while (s < STOPS.length - 2 && c > STOPS[s + 1][0]) s++;
  const [t0, r0, g0, b0] = STOPS[s];
  const [t1, r1, g1, b1] = STOPS[s + 1];
  const u = (c - t0) / (t1 - t0);
  return [r0 + (r1 - r0) * u, g0 + (g1 - g0) * u, b0 + (b1 - b0) * u];
}

const KIND_CLASS = (p: Segment['ph']): string => (p === 'pause' ? 'aub-k-pause' : isVoiced(p) ? 'aub-k-voiced' : 'aub-k-noise');
const n0 = (n: number) => Math.round(n).toLocaleString('en-GB');

export default function TtsPipeline() {
  const [text, setText] = useState(PRESETS[0].text);
  const [pitch, setPitch] = useState(120);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(0.25);
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [canPlay, setCanPlay] = useState<boolean | null>(null);
  const [problem, setProblem] = useState('');

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const dText = useDeferredValue(text);
  const dPitch = useDeferredValue(pitch);
  const dSpeed = useDeferredValue(speed);

  const norm = useMemo(() => normaliseText(dText), [dText]);
  const plan = useMemo(() => planProsody(norm.tokens, { basePitch: dPitch, speed: dSpeed }), [norm, dPitch, dSpeed]);
  const samples = useMemo(() => synthesise(plan), [plan]);
  const mel = useMemo(() => (stage === 3 ? melDb(samples) : []), [stage, samples]);
  const words = useMemo(() => norm.tokens.filter((t) => t.kind === 'word').map((t) => ({ text: t.text, ...wordToPhones(t.text) })), [norm]);
  const seconds = samples.length / RATE;

  useEffect(() => setCanPlay(audioContextClass() !== null), []);

  const stop = useCallback(() => {
    const src = srcRef.current;
    srcRef.current = null;
    if (src) {
      try {
        src.onended = null;
        src.stop();
        src.disconnect();
      } catch {
        /* already stopped */
      }
    }
    setPlaying(false);
  }, []);

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
  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = volume;
  }, [volume]);
  // a changed sentence or setting stops the old sound
  useEffect(() => stop(), [samples, stop]);

  const play = useCallback(() => {
    setProblem('');
    if (playing) {
      stop();
      return;
    }
    const Ctor = audioContextClass();
    if (!Ctor || samples.length === 0) return;
    try {
      let ctx = ctxRef.current;
      if (!ctx || ctx.state === 'closed') {
        ctx = new Ctor();
        ctxRef.current = ctx;
        const g = ctx.createGain();
        g.gain.value = volume;
        g.connect(ctx.destination);
        gainRef.current = g;
      }
      void ctx.resume().catch(() => {});
      const buf = ctx.createBuffer(1, samples.length, RATE);
      buf.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(gainRef.current!);
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
      setProblem('The browser would not start sound here. The pictures still work.');
      stop();
    }
  }, [playing, samples, stop, volume]);

  /* the spectrogram, drawn from the computed frames */
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || stage !== 3) return;
    const frames = mel.length;
    const bands = frames ? mel[0].length : 64;
    cv.width = Math.max(1, frames);
    cv.height = bands;
    const g = cv.getContext('2d');
    if (!g) return;
    const img = g.createImageData(Math.max(1, frames), bands);
    for (let x = 0; x < frames; x++) {
      for (let b = 0; b < bands; b++) {
        const [r, gr, bl] = colour((mel[x][b] + 70) / 70);
        const o = ((bands - 1 - b) * frames + x) * 4;
        img.data[o] = r;
        img.data[o + 1] = gr;
        img.data[o + 2] = bl;
        img.data[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  }, [mel, stage]);

  /* ---------- the waveform, as min and max per column ---------- */
  const wave = useMemo(() => {
    const cols = 320;
    const out: { lo: number; hi: number }[] = [];
    if (samples.length === 0) return out;
    const per = samples.length / cols;
    for (let c = 0; c < cols; c++) {
      let lo = 0;
      let hi = 0;
      for (let i = Math.floor(c * per); i < Math.min(samples.length, Math.floor((c + 1) * per)); i++) {
        if (samples[i] < lo) lo = samples[i];
        if (samples[i] > hi) hi = samples[i];
      }
      out.push({ lo, hi });
    }
    return out;
  }, [samples]);

  const empty = norm.tokens.filter((t) => t.kind === 'word').length === 0;
  const sentenceNote = plan.question ? 'A question mark makes the pitch rise over the last part.' : 'The pitch drifts down across the sentence.';
  const say = empty
    ? 'Type a sentence to start.'
    : `${words.length} word${words.length === 1 ? '' : 's'}, ${plan.segments.filter((s) => s.ph !== 'pause').length} sounds, about ${seconds.toFixed(1)} seconds of audio.`;

  /* timing and pitch figure geometry */
  const pxPerMs = 0.16;
  const figW = Math.max(330, Math.round(plan.totalMs * pxPerMs) + 40);
  const f0Lo = 80;
  const f0Hi = 260;
  const yOf = (f: number) => 120 - ((Math.max(f0Lo, Math.min(f0Hi, f)) - f0Lo) / (f0Hi - f0Lo)) * 90;
  let tAcc = 0;
  const bars = plan.segments.map((s) => {
    const x = 36 + tAcc * pxPerMs;
    tAcc += s.ms;
    return { s, x, w: Math.max(1, s.ms * pxPerMs) };
  });
  const pitchPath = bars
    .filter((b) => b.s.f0 > 0)
    .map((b, i) => `${i === 0 ? 'M' : 'L'} ${(b.x + b.w / 2).toFixed(1)} ${yOf(b.s.f0).toFixed(1)}`)
    .join(' ');

  return (
    <Root>
      <div className="viz aub aub-tts" ref={rootRef}>
        <p className="viz-title">A toy text-to-speech pipeline</p>

        <label className="aub-field">
          <span>Type a short sentence (up to {MAX_CHARS} characters)</span>
          <input type="text" className="aub-input" value={text} maxLength={MAX_CHARS} onChange={(e) => setText(e.target.value)} spellCheck={false} aria-describedby="aub-tts-say" />
        </label>
        <div className="aub-chips" role="group" aria-label="Example sentences">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" className="aub-chip" aria-pressed={text === p.text} onClick={() => setText(p.text)}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="aub-sliders">
          <label className="field">
            <span>
              Speaking pitch at the start <b>{pitch} Hz</b>
            </span>
            <input type="range" min={90} max={220} step={5} value={pitch} onChange={(e) => setPitch(+e.target.value)} aria-label="Speaking pitch in hertz" />
          </label>
          <label className="field">
            <span>
              Speed <b>{speed.toFixed(1)}x</b>
            </span>
            <input type="range" min={0.7} max={1.5} step={0.1} value={speed} onChange={(e) => setSpeed(+e.target.value)} aria-label="Speaking speed" />
          </label>
        </div>

        <div className="aub-tabs" role="tablist" aria-label="Pipeline stages">
          {STAGES.map((name, i) => (
            <button key={name} type="button" role="tab" id={`aub-tab-${i}`} aria-selected={stage === i} aria-controls="aub-tts-panel" className="aub-tab" onClick={() => setStage(i)}>
              <span className="aub-tab-n">{i + 1}</span> {name}
            </button>
          ))}
        </div>

        <div className="aub-panel" id="aub-tts-panel" role="tabpanel" aria-labelledby={`aub-tab-${stage}`}>
          {stage === 0 && (
            <>
              <p className="aub-explain">Written text is not what is said. The first stage rewrites numbers, symbols and abbreviations as words, and keeps the punctuation that will become pauses and pitch.</p>
              {empty ? (
                <p className="aub-hint">Nothing to say yet.</p>
              ) : (
                <ol className="aub-words" aria-label="Words and marks to be spoken">
                  {norm.tokens.map((t, i) => (
                    <li key={i} className={t.kind === 'punct' ? 'aub-mark' : 'aub-word'}>
                      {t.text}
                    </li>
                  ))}
                </ol>
              )}
              {norm.changes.length > 0 && (
                <p className="aub-look">
                  Rewritten: {norm.changes.map((c) => `"${c.from}" became "${c.to}"`).join('; ')}. Real systems face harder cases: "St." can be street or saint, and "1/2" can be a fraction or a date.
                </p>
              )}
            </>
          )}

          {stage === 1 && (
            <>
              <p className="aub-explain">Next, each word becomes sounds. Common words come from a lookup list; anything else goes through spelling rules. Real systems use a large pronunciation dictionary plus a learned model for new words.</p>
              <ul className="aub-g2p" aria-label="Words and their sounds">
                {words.map((w, i) => (
                  <li key={i}>
                    <span className="aub-g2p-word">{w.text}</span>
                    <span className="aub-g2p-ph">
                      {w.phones.map((p, j) => (
                        <span key={j} className="aub-ph" title={PHONE_HINT[p as Phone]}>
                          {p}
                        </span>
                      ))}
                    </span>
                    <span className={`aub-src aub-src-${w.source}`}>{w.source === 'lexicon' ? 'from the list' : 'by spelling rules'}</span>
                  </li>
                ))}
              </ul>
              <p className="aub-hint">The toy has 20 sounds and merges b with p, d with t, and g with k. Try "Silent letters": the rules read out every letter, which is wrong for English.</p>
            </>
          )}

          {stage === 2 && (
            <>
              <p className="aub-explain">Prosody is the music of speech: how long each sound lasts, how high the pitch is, where to pause. {sentenceNote} Stressed vowels in content words are longer and a tenth higher (a made-up rule).</p>
              <div className="aub-scroll" tabIndex={0} role="region" aria-label="Timing and pitch plan, scrolls sideways">
                <svg viewBox={`0 0 ${figW} 168`} width={figW} height={168} className="aub-plan" role="img" aria-label={`Plan for ${plan.segments.length} segments over ${n0(plan.totalMs)} milliseconds. ${sentenceNote}`}>
                  <text x={2} y={14} className="aub-svg-h">
                    Pitch (Hz)
                  </text>
                  <text x={2} y={33} className="aub-tick">
                    {f0Hi}
                  </text>
                  <text x={2} y={123} className="aub-tick">
                    {f0Lo}
                  </text>
                  {bars.map((b, i) => (
                    <g key={i}>
                      <rect x={b.x} y={134} width={b.w} height={16} className={`aub-bar-s ${KIND_CLASS(b.s.ph)}`} />
                      {b.s.ph !== 'pause' && b.w >= 11 && (
                        <text x={b.x + b.w / 2} y={162} textAnchor="middle" className="aub-tick">
                          {b.s.ph}
                        </text>
                      )}
                    </g>
                  ))}
                  <path d={pitchPath} className="aub-pitch" />
                  {bars
                    .filter((b) => b.s.f0 > 0)
                    .map((b, i) => (
                      <circle key={i} cx={b.x + b.w / 2} cy={yOf(b.s.f0)} r={b.s.stressed ? 4 : 2.5} className={b.s.stressed ? 'aub-dot-st' : 'aub-dot-pl'} />
                    ))}
                </svg>
              </div>
              <p className="aub-key">Bars: purple voiced sound, orange hiss or burst, grey pause; width is duration. Line: pitch. Large dots: stressed vowels. Total {n0(plan.totalMs)} ms.</p>
            </>
          )}

          {stage === 3 && (
            <>
              <p className="aub-explain">A neural acoustic model predicts a picture like this from the sounds and prosody: a mel spectrogram, with time across and pitch up. Here it is measured from the toy's own output (64 mel bands from 0 to 8,000 Hz, a column every 5 ms), so you can see what the model would be aiming for.</p>
              <div className="aub-spec">
                <div className="aub-spec-axis" aria-hidden="true">
                  <span>8 kHz</span>
                  <span>0</span>
                </div>
                <canvas ref={canvasRef} className="aub-canvas" role="img" aria-label={`Mel spectrogram of the toy's speech, ${seconds.toFixed(1)} seconds long. Vowels show as bright low bands, s and sh as bright high smears, stops as short vertical lines.`} />
              </div>
              <p className="aub-key">Brighter is louder. Vowels: bright low bands with harmonic structure. "s" and "sh": bright high smears. Stops: short vertical lines. Length: {seconds.toFixed(1)} s.</p>
            </>
          )}

          {stage === 4 && (
            <>
              <p className="aub-explain">The last stage turns the picture into a waveform. Neural systems use a vocoder network for this. The toy uses a formant synthesiser instead: a buzz at the planned pitch, shaped by three resonances that slide from one vowel to the next, plus filtered noise for hisses.</p>
              <svg viewBox="0 0 320 90" className="aub-wave" preserveAspectRatio="none" role="img" aria-label={`Waveform of ${seconds.toFixed(1)} seconds of toy speech`}>
                <line x1={0} x2={320} y1={45} y2={45} className="aub-grid" />
                {wave.map((c, i) => (
                  <line key={i} x1={i + 0.5} x2={i + 0.5} y1={45 - c.hi * 42} y2={45 - c.lo * 42} className="aub-wave-l" />
                ))}
              </svg>
              <p className="aub-hint">The sound is a toy, not neural speech: robotic, with mispronounced words. That is the point; compare it with what a trained model does.</p>
            </>
          )}
        </div>

        <div className="aub-buttons">
          <button type="button" className="btn" onClick={play} disabled={canPlay === false || empty} aria-pressed={playing}>
            {playing ? 'Stop' : 'Play the sentence'}
          </button>
          <label className="aub-vol">
            <span>Volume</span>
            <input type="range" min={0} max={0.5} step={0.05} value={volume} onChange={(e) => setVolume(+e.target.value)} aria-label="Playback volume, kept low by default" />
          </label>
          <span className="aub-status">{canPlay === false ? 'No sound in this browser: the pictures still work.' : 'Sound starts only when you tap.'}</span>
        </div>
        {problem && <p className="aub-hint">{problem}</p>}
        <p className="aub-say" id="aub-tts-say" role="status" aria-live="polite">
          {say}
        </p>
      </div>
    </Root>
  );
}
