import { useEffect, useMemo, useState } from 'react';
import { Root } from './shared';
import {
  SHAPES,
  SHAPE_IDS,
  STEP_CHOICES,
  T,
  addNoise,
  alphaBar,
  denoise,
  inShape,
  onPromptSide,
  sampleData,
  sampleNoise,
  spread,
  timesteps,
  type Group,
  type Prompt,
  type ShapeId,
} from '../../lib/diffusion';

const N = 240;
const SIZE = 300;
const LIM = 2.6; // the plot shows -2.6 to 2.6 on both axes
const toPx = (v: number) => ((v + LIM) / (2 * LIM)) * SIZE;
const clip = (px: number) => Math.max(3, Math.min(SIZE - 3, px));
const pct = (v: number) => `${Math.round(v * 100)}%`;

type Active = 'forward' | 'reverse';

export default function DiffusionToy() {
  const [shapeId, setShapeId] = useState<ShapeId>('ring');
  const [seed, setSeed] = useState(7);
  const [t, setT] = useState(600);
  const [stepIx, setStepIx] = useState(4); // index into STEP_CHOICES: 10 steps
  const [prompt, setPrompt] = useState<Prompt>('none');
  const [guidance, setGuidance] = useState(1);
  const [random, setRandom] = useState<0 | 1>(0);
  const [active, setActive] = useState<Active>('forward');
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  // the points come from floating-point maths that can differ in the last digit between server and browser, so draw them after mounting
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const shape = SHAPES[shapeId];
  const steps = STEP_CHOICES[stepIx];

  const data = useMemo(() => sampleData(shape, N, 1), [shape]);
  const noise = useMemo(() => sampleNoise(N, seed), [seed]);
  const pure = useMemo(() => addNoise(data, noise, T), [data, noise]);
  const states = useMemo(
    () => denoise(shape, pure, { steps, prompt, guidance, randomness: random, seed }),
    [shape, pure, steps, prompt, guidance, random, seed],
  );
  const levels = useMemo(() => timesteps(steps), [steps]);

  const at = Math.min(idx, steps);
  const pts = active === 'forward' ? addNoise(data, noise, t) : states[at];
  const level = active === 'forward' ? t : levels[at];
  const a = alphaBar(level);

  const final = states[steps];
  const dataSpread = useMemo(() => spread(data), [data]);
  const onShape = inShape(shape, pts);
  const variety = spread(pts) / dataSpread;
  const side = prompt === 'none' ? null : onPromptSide(shape, pts, prompt);

  useEffect(() => {
    if (!playing) return;
    const ms = Math.max(70, Math.min(500, 2800 / steps));
    const id = setInterval(() => {
      setIdx((i) => {
        if (i + 1 >= steps) {
          setPlaying(false);
          return steps;
        }
        return i + 1;
      });
    }, ms);
    return () => clearInterval(id);
  }, [playing, steps]);

  const run = () => {
    setActive('reverse');
    setIdx(0);
    setPlaying(true);
  };
  const settle = () => {
    setPlaying(false);
    if (active === 'reverse') setIdx(steps);
  };
  const back = () => {
    setPlaying(false);
    setActive('reverse');
    setIdx(0);
  };

  const reachedEnd = active === 'reverse' && at === steps;
  let hint = '';
  if (active === 'reverse') {
    if (reachedEnd && steps <= 3 && inShape(shape, final) < 0.35)
      hint = 'With so few steps every jump is one big guess. The safest single guess is the average of everything that could be there, so the points pile up in a blurry clump instead of on the shape.';
    else if (reachedEnd && inShape(shape, final) > 0.9 && (prompt === 'none' || guidance === 1))
      hint = 'Enough small steps: the noise has been walked back onto the shape.';
    else if (prompt !== 'none' && guidance === 0)
      hint = 'Guidance 0 ignores the prompt completely: points still land on both sides.';
    else if (reachedEnd && prompt !== 'none' && guidance >= 4)
      hint = 'Strong guidance obeys the prompt hard, but the results bunch up and look alike: less variety.';
  }

  const promptName = prompt === 'none' ? '' : shape.prompts[prompt];
  const summary =
    active === 'forward'
      ? `Noising step ${t} of ${T}. The picture is ${a > 0.99 ? 'untouched' : a < 0.01 ? 'pure noise' : 'partly hidden by noise'}. ${pct(onShape)} of the points are still on the ${shape.label.toLowerCase()}.`
      : `Denoising step ${at} of ${steps}, noise level ${levels[at]} of ${T}. ${pct(onShape)} of the points are on the ${shape.label.toLowerCase()}${side !== null ? `, ${pct(side)} on the ${promptName}` : ''}.${reachedEnd ? ` Variety kept: ${pct(variety)}.` : ''}`;

  const setPromptAndSettle = (p: Prompt) => {
    setPrompt(p);
    if (active === 'reverse') { setPlaying(false); setIdx(steps); }
  };

  return (
    <Root>
      <div className="viz db db-diff">
        <p className="viz-title">Noise a shape, then walk it back</p>

        <div className="db-row" role="group" aria-label="Shape to learn">
          <span className="db-label">Shape</span>
          {SHAPE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className="db-chip"
              aria-pressed={shapeId === id}
              onClick={() => {
                setShapeId(id);
                setPrompt('none');
                setPlaying(false);
                if (active === 'reverse') setIdx(steps);
              }}
            >
              {SHAPES[id].label}
            </button>
          ))}
        </div>

        <div className="db-plotbox">
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="db-plot"
            role="img"
            aria-label={ready ? `Scatter plot of ${N} points. ${summary}` : 'Scatter plot of points'}
          >
            <rect x="0.5" y="0.5" width={SIZE - 1} height={SIZE - 1} className="db-plot-frame" />
            {shape.means.map((m, k) => (
              <circle
                key={k}
                cx={toPx(m[0]).toFixed(1)}
                cy={toPx(-m[1]).toFixed(1)}
                r={(2 * shape.sigma * (SIZE / (2 * LIM)) + 1).toFixed(1)}
                className={`db-ghost${prompt !== 'none' && shape.group[k] === prompt ? ' db-ghost-on' : ''}`}
              />
            ))}
            {ready && Array.from({ length: N }, (_, p) => (
              <circle key={p} cx={clip(toPx(pts[2 * p]))} cy={clip(toPx(-pts[2 * p + 1]))} r="2.6" className="db-dot" />
            ))}
          </svg>
          <p className="db-plot-key">
            <i className="db-dotkey" /> points &nbsp; <i className="db-ghostkey" /> where the real data lives
          </p>
        </div>

        <p className="db-stats" aria-live="polite">{ready && <>
          <span className="sr-only">{summary}</span>
          <span aria-hidden="true">
            {active === 'forward' ? (
              <>
                Noising step <b>{t}</b> of {T}. Keeps <b>{(Math.sqrt(a)).toFixed(2)}</b> of the picture and mixes in <b>{Math.sqrt(1 - a).toFixed(2)}</b> of noise.
              </>
            ) : (
              <>
                Denoising step <b>{at}</b> of {steps}. Noise level <b>{levels[at]}</b> of {T}.
              </>
            )}
          </span>
        </>}</p>
        <ul className="db-read" aria-hidden="true">
          {ready && <><li>
            On the shape <b>{pct(onShape)}</b>
          </li>
          {active === 'reverse' && reachedEnd && (
            <li>
              Variety kept <b>{pct(variety)}</b>
            </li>
          )}
          {side !== null && active === 'reverse' && (
            <li>
              On the {promptName} <b>{pct(side)}</b>
            </li>
          )}</>}
        </ul>
        {hint && <p className="db-hint">{hint}</p>}

        <div className="db-sec">
          <p className="db-sec-t">1. Add noise (the forward process)</p>
          <label className="field">
            <span>
              Noising step <b>{t}</b>
            </span>
            <input
              type="range"
              min={0}
              max={T}
              step={10}
              value={t}
              aria-label="Noising step, 0 to 1000"
              onChange={(e) => {
                setPlaying(false);
                setActive('forward');
                setT(+e.target.value);
              }}
            />
          </label>
        </div>

        <div className="db-sec">
          <p className="db-sec-t">2. Remove it (the reverse process, using a stand-in denoiser)</p>
          <div className="db-twocol">
            <label className="field">
              <span>
                Steps <b>{steps}</b>
              </span>
              <input
                type="range"
                min={0}
                max={STEP_CHOICES.length - 1}
                step={1}
                value={stepIx}
                aria-label="Number of denoising steps"
                aria-valuetext={`${steps} steps`}
                onChange={(e) => {
                  setPlaying(false);
                  setStepIx(+e.target.value);
                  if (active === 'reverse') setIdx(STEP_CHOICES[+e.target.value]);
                }}
              />
            </label>
            <div className="db-row db-row-tight" role="group" aria-label="Sampler">
              <span className="db-label">Sampler</span>
              <button type="button" className="db-chip" aria-pressed={random === 0} onClick={() => { setRandom(0); settle(); }}>
                Steady
              </button>
              <button type="button" className="db-chip" aria-pressed={random === 1} onClick={() => { setRandom(1); settle(); }}>
                Random
              </button>
            </div>
          </div>

          <div className="db-row db-row-tight" role="group" aria-label="Prompt">
            <span className="db-label">Prompt</span>
            <button type="button" className="db-chip" aria-pressed={prompt === 'none'} onClick={() => setPromptAndSettle('none')}>
              No prompt
            </button>
            {(['a', 'b'] as Group[]).map((g) => (
              <button key={g} type="button" className="db-chip" aria-pressed={prompt === g} onClick={() => setPromptAndSettle(g)}>
                {shape.prompts[g][0].toUpperCase() + shape.prompts[g].slice(1)}
              </button>
            ))}
          </div>

          {prompt !== 'none' && (
            <label className="field">
              <span>
                Guidance <b>{guidance.toFixed(1)}</b>
              </span>
              <input
                type="range"
                min={0}
                max={8}
                step={0.5}
                value={guidance}
                aria-label="Guidance strength"
                onChange={(e) => {
                  setPlaying(false);
                  setGuidance(+e.target.value);
                  if (active === 'reverse') setIdx(steps);
                }}
              />
            </label>
          )}

          <div className="db-controls">
            <button type="button" className="btn" onClick={run} disabled={playing}>
              Denoise
            </button>
            <button type="button" className="btn quiet" onClick={back}>
              Back to noise
            </button>
            <button
              type="button"
              className="btn quiet"
              onClick={() => {
                setSeed((s) => s + 1);
                setPlaying(false);
                if (active === 'reverse') setIdx(steps);
              }}
            >
              New noise (seed {seed})
            </button>
          </div>

          <label className="field">
            <span>
              Scrub the denoising <b>step {active === 'reverse' ? at : 0} of {steps}</b>
            </span>
            <input
              type="range"
              min={0}
              max={steps}
              step={1}
              value={active === 'reverse' ? at : 0}
              aria-label="Scrub through the denoising steps"
              onChange={(e) => {
                setPlaying(false);
                setActive('reverse');
                setIdx(+e.target.value);
              }}
            />
          </label>
        </div>

        <p className="viz-cap">
          The denoiser here is not a trained network. For this tiny made-up dataset the best possible denoiser can be written as a formula, so that exact formula stands in for the network a real image generator would learn from millions of pictures. The prompt is a stand-in too: it simply says which part of the shape to aim for. Same seed and settings always give the same result.
        </p>
      </div>
    </Root>
  );
}
