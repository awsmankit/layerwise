import { useEffect, useMemo, useRef, useState } from 'react';
import { Root } from './shared';
import { DEFAULT_RATES, GOAL, MAX_STEPS, RATE_STOPS, RAVINE, contour, simulate, type OptimiserId, type Run, type Vec } from '../../lib/optim';

const W = 360;
const H = 200;
const X0 = -4.6;
const X1 = 1.4;
const SCALE = W / (X1 - X0);
const px = (x: number) => (x - X0) * SCALE;
// the picture is centred on y = -0.45, halfway along the valley floor
const py = (y: number) => H / 2 - (y + 0.45) * SCALE;

const OPTS: { id: OptimiserId; name: string; blurb: string }[] = [
  { id: 'sgd', name: 'SGD', blurb: 'steps straight down the slope' },
  { id: 'momentum', name: 'Momentum', blurb: 'keeps a running velocity' },
  { id: 'adam', name: 'Adam', blurb: 'scales each direction by its recent size' },
];
const LEVELS = [0.01, 0.5, 2, 8, 20];

const pathD = (pts: Vec[]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${px(x).toFixed(1)} ${py(y).toFixed(1)}`).join(' ');

function describe(r: Run) {
  if (r.diverged) return 'blew up: the loss exploded';
  if (r.reached !== null) return `reached the goal in ${r.reached} steps`;
  return `not there after ${MAX_STEPS} steps (loss ${r.losses[r.losses.length - 1].toFixed(3)})`;
}

/**
 * Three optimisers on the same loss ravine. Each has its own learning rate. Press Race to watch all
 * three walk down together, or drag the step slider. The result line for each optimiser is for its
 * whole run; the pictures show the path so far.
 */
export default function OptimiserRace() {
  const [rates, setRates] = useState({ sgd: RATE_STOPS.indexOf(DEFAULT_RATES.sgd), momentum: RATE_STOPS.indexOf(DEFAULT_RATES.momentum), adam: RATE_STOPS.indexOf(DEFAULT_RATES.adam) });
  const [on, setOn] = useState<Record<OptimiserId, boolean>>({ sgd: true, momentum: true, adam: true });
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const stepRef = useRef(0);

  const runs = useMemo(
    () => Object.fromEntries(OPTS.map((o) => [o.id, simulate(o.id, RATE_STOPS[rates[o.id]])])) as Record<OptimiserId, Run>,
    [rates],
  );

  useEffect(() => {
    if (!playing) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      stepRef.current = MAX_STEPS;
      setStep(MAX_STEPS);
      setPlaying(false);
      return;
    }
    let raf = 0;
    const tick = () => {
      stepRef.current = Math.min(MAX_STEPS, stepRef.current + 2);
      setStep(stepRef.current);
      if (stepRef.current >= MAX_STEPS) setPlaying(false);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const race = () => {
    if (playing) return setPlaying(false);
    if (stepRef.current >= MAX_STEPS) {
      stepRef.current = 0;
      setStep(0);
    }
    setPlaying(true);
  };
  const scrub = (n: number) => {
    setPlaying(false);
    stepRef.current = n;
    setStep(n);
  };

  const shown = (r: Run) => r.path.slice(0, Math.min(step, r.path.length - 1) + 1);

  return (
    <Root>
      <div className="viz da-race">
        <p className="viz-title">Optimiser race on a ravine</p>

        <svg className="da-svg da-rsvg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Contour map of a long narrow valley tilted across the picture. The start is at the upper left of the valley floor and the minimum is at the middle. Paths show each optimiser's steps.">
          <defs>
            <clipPath id="da-clip">
              <rect x="0" y="0" width={W} height={H} />
            </clipPath>
          </defs>
          <g clipPath="url(#da-clip)">
            {LEVELS.map((l, i) => (
              <path key={l} d={pathD(contour(l)) + 'Z'} className={i === 0 ? 'da-goal' : 'da-contour'} />
            ))}
            {OPTS.filter((o) => on[o.id]).map((o) => {
              const r = runs[o.id];
              const pts = shown(r);
              const head = pts[pts.length - 1];
              return (
                <g key={o.id} className={`da-p da-p-${o.id}`}>
                  <path d={pathD(pts)} className="da-path" />
                  <circle cx={px(head[0])} cy={py(head[1])} r="4.5" className="da-head" />
                </g>
              );
            })}
            <circle cx={px(RAVINE.start[0])} cy={py(RAVINE.start[1])} r="3" className="da-mark" />
            <circle cx={px(0)} cy={py(0)} r="2.5" className="da-mark" />
          </g>
          <text x={px(RAVINE.start[0]) + 7} y={py(RAVINE.start[1]) + 16} className="da-t">
            start
          </text>
          <text x={px(0) + 8} y={py(0) - 8} className="da-t">
            goal
          </text>
        </svg>

        <div className="da-play">
          <button type="button" className="btn da-go" onClick={race}>
            {playing ? 'Pause' : step >= MAX_STEPS ? 'Race again' : step > 0 ? 'Resume' : 'Race'}
          </button>
          <label className="da-scrub">
            <span>
              Step <b className="num">{step}</b> of {MAX_STEPS}
            </span>
            <input type="range" min={0} max={MAX_STEPS} step={1} value={step} onChange={(e) => scrub(Number(e.target.value))} aria-label="Step shown" />
          </label>
        </div>

        <ul className="da-opts" aria-live="polite">
          {OPTS.map((o) => {
            const r = runs[o.id];
            return (
              <li key={o.id} className={`da-opt da-p-${o.id}${on[o.id] ? '' : ' da-off'}`}>
                <button type="button" className="da-chip da-tog" aria-pressed={on[o.id]} onClick={() => setOn((p) => ({ ...p, [o.id]: !p[o.id] }))}>
                  <i className="da-sw" aria-hidden="true" />
                  {o.name}
                </button>
                <label className="da-rate2">
                  <span>
                    Learning rate <b className="num">{RATE_STOPS[rates[o.id]]}</b>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={RATE_STOPS.length - 1}
                    step={1}
                    value={rates[o.id]}
                    onChange={(e) => setRates((p) => ({ ...p, [o.id]: Number(e.target.value) }))}
                    aria-label={`${o.name} learning rate`}
                    aria-valuetext={`${RATE_STOPS[rates[o.id]]}`}
                  />
                </label>
                <p className={`da-res${r.diverged ? ' da-bad' : r.reached !== null ? ' da-good' : ''}`}>
                  <b>{o.name}</b> {describe(r)}.
                </p>
              </li>
            );
          })}
        </ul>

        <p className="viz-cap">
          The valley is 100 times steeper across than along. The goal (the small dashed loop) is a loss below {GOAL}; the other loops are higher loss. Each optimiser starts at the same point; a slider moves only that optimiser's learning rate. Try pushing SGD's rate up until it blows up, then compare with momentum.
        </p>
      </div>
    </Root>
  );
}
